import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'assets'
SETTINGS = json.loads((HERE / 'voice-settings.json').read_text())
MODEL = SETTINGS['model']
CAST = SETTINGS['cast']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--exclude', default='')
    parser.add_argument('--only', default='')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--force-ids', default='')
    parser.add_argument('--quote-text', action='store_true')
    options = parser.parse_args()
    lines = json.loads((HERE / 'voice-script.json').read_text())
    project = os.environ.get('GOOGLE_CLOUD_PROJECT') or json.loads((Path.home() / '.config/gcloud/application_default_credentials.json').read_text())['quota_project_id']
    provider = GeminiSpeech(project, quote_text=options.quote_text)
    force_ids = options.force_ids.split(',') if options.force_ids else []
    selected = [line for line in lines if line['actor'] not in options.exclude.split(',') and (not options.only or line['actor'] in options.only.split(',')) and (not force_ids or line['id'] in force_ids)]
    unique = {}
    for line in selected:
        unique.setdefault(f"{line['actor']}-{line['sha256']}", line)
    jobs = list(unique.values())[:options.limit or None]
    print(f'Generating {len(jobs)} unique recordings for {len(selected)} clip IDs', flush=True)
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=options.workers) as pool:
        futures = {pool.submit(record, provider, line, line['id'] in force_ids): line for line in jobs}
        for count, future in enumerate(concurrent.futures.as_completed(futures), 1):
            line = futures[future]
            try:
                result = future.result()
                print(f"{count}/{len(jobs)} {line['id']} {result['durationMs']}ms", flush=True)
            except Exception as error:
                failures.append({'id': line['id'], 'error': str(error)})
                print(f"FAILED {line['id']}: {error}", flush=True)
    manifest = {}
    for line in lines:
        metadata = HERE / 'voice-cache' / f"{line['actor']}-{line['sha256']}.json"
        if metadata.exists():
            item = json.loads(metadata.read_text())
            manifest[line['id']] = {key:item[key] for key in ['src','text','durationMs']}
    (HERE / 'voices.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    (HERE / 'voice-production.json').write_text(json.dumps({'provider':'Google Cloud Text-to-Speech', 'requestedModel':MODEL,'locale':'en-GB','requestedClips':len(lines),'recordedClips':len(manifest),'failures':failures,'cast':CAST},indent=2) + '\n')
    print(f'Registered {len(manifest)}/{len(lines)} clips, {len(failures)} failures', flush=True)
    if failures:
        raise SystemExit(1)

class GeminiSpeech:
    def __init__(self, project, quote_text=False):
        self.project = project
        self.quote_text = quote_text
        self.token = ''
        self.refreshed = 0
        self.lock = threading.Lock()
        self.next_request = 0

    def throttle(self):
        with self.lock:
            wait = max(0, self.next_request - time.time())
            self.next_request = max(time.time(), self.next_request) + 1.25
        if wait:
            time.sleep(wait)

    def synthesize(self, actor, text, revision=False):
        data = self.request_body(actor, text, revision)
        for attempt in range(5):
            self.throttle()
            request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=json.dumps(data).encode(), headers={'Authorization':f'Bearer {self.access_token()}', 'x-goog-user-project':self.project,'Content-Type':'application/json'})
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    return base64.b64decode(json.load(response)['audioContent'])
            except urllib.error.HTTPError as error:
                if error.code not in [429,500,502,503,504] or attempt == 4:
                    message = json.loads(error.read()).get('error', {}).get('message', str(error))
                    raise RuntimeError(f'Gemini status {error.code}: {message}') from None
                time.sleep(3 * (attempt + 1))


    def request_body(self, actor, text, revision=False):
        name, character = CAST[actor]
        prompt = f'{character} Read the supplied dialogue exactly once, in a natural British English voice, with clean studio audio. Speech only; no music or sound effects.'
        return {'input': {'prompt': prompt, 'text': f'"{text}"' if self.quote_text else text}, 'voice': {'languageCode':'en-GB','name':name,'modelName':MODEL}, 'audioConfig':{'audioEncoding':'MP3','sampleRateHertz':24000}}

    def access_token(self):
        with self.lock:
            if time.time() - self.refreshed > 2400:
                auth = subprocess.run(['gcloud','auth','print-access-token'],capture_output=True,text=True)
                if auth.returncode:
                    raise RuntimeError('Google Cloud authentication needs renewal; token not logged.')
                self.token = auth.stdout.strip()
                self.refreshed = time.time()
            return self.token

def record(provider, line, revision=False):
    key = f"{line['actor']}-{line['sha256']}"
    metadata = HERE / 'voice-cache' / f'{key}.json'
    if metadata.exists() and not revision:
        return json.loads(metadata.read_text())
    audio = provider.synthesize(line['actor'], line['text'], revision)
    src = f'audio/{key}{"-reviewed" if revision else ""}.mp3'
    path = ASSETS / src
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(audio)
    duration = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],check=True,capture_output=True,text=True).stdout)
    if duration < .15 or duration > max(12, len(line['text'].split()) * 1.2):
        raise RuntimeError(f'Unusual recording duration: {duration}s')
    item = {'src':src,'text':line['text'],'durationMs':round(duration*1000),'sha256':line['sha256'],'actor':line['actor'],'model':MODEL,'voice':CAST[line['actor']][0],'direction':CAST[line['actor']][1],'audioSha256':hashlib.sha256(audio).hexdigest()}
    request_input = provider.request_body(line['actor'], line['text'], revision)['input']
    item.update({'prompt': request_input['prompt'], 'synthesisText': request_input['text']})
    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
    return item

if __name__ == '__main__':
    main()
