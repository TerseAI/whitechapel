import base64
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
voices = json.loads((HERE / 'voices.json').read_text())
script = json.loads((HERE / 'voice-script.json').read_text())
selected = {}
for line in script:
    if line['actor'] not in selected and len(line['text'].split()) >= 8:
        selected[line['actor']] = line
selected['arthur-admission'] = next(line for line in script if line['id'] == 'arthur-station-disguise-challenge-turn-2')
if len(sys.argv) > 1:
    selected = {key:line for key,line in selected.items() if line['id'] in sys.argv[1].split(',')}
token = subprocess.run(['gcloud','auth','print-access-token'],check=True,capture_output=True,text=True).stdout.strip()
project = os.environ.get('GOOGLE_CLOUD_PROJECT') or json.loads((Path.home()/'.config/gcloud/application_default_credentials.json').read_text())['quota_project_id']

def inspect(line):
    path = HERE.parent / 'assets' / voices[line['id']]['src']
    prompt = 'Listen to the audio and transcribe the exact spoken words, without correcting or paraphrasing. Name vocabulary for proper spelling: Arthur Vale, Nora Vale, Inspector Reed, Inspector Ellis, Baines, Shaw, Hale, Alden. Do not add any of those names unless spoken. Also assess whether it is intelligible, whether music or unintended sound effects are audible, and describe the accent in a few words. Describe any background sound and when it occurs; distinguish music or separate sound effects from ordinary breaths, mouth sounds and recording hiss. If accent cannot be reliably classified from a short sample, say uncertain. Return only JSON with fields transcript (string), intelligible (boolean), backgroundMusicOrEffects (boolean), backgroundDescription (string), accent (string).'
    data = {'contents':[{'role':'user','parts':[{'text':prompt},{'inlineData':{'mimeType':'audio/mpeg','data':base64.b64encode(path.read_bytes()).decode()}}]}], 'generationConfig':{'responseMimeType':'application/json','temperature':0,'thinkingConfig':{'thinkingBudget':128},'maxOutputTokens':1024}}
    model = os.environ.get('REVIEW_MODEL','gemini-2.5-pro')
    request = urllib.request.Request(f'https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/publishers/google/models/{model}:generateContent',data=json.dumps(data).encode(),headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=90) as response:
            result=json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(json.loads(error.read()).get('error',{}).get('message','Gemini audio review failed')) from None
    answer=json.loads(''.join(part.get('text','') for part in result['candidates'][0]['content']['parts']))
    normalize=lambda t:re.sub(r'[^a-z0-9]+',' ',t.lower().replace('’', "'")).strip()
    answer.update({'id':line['id'],'actor':line['actor'],'expectedText':line['text'],'normalizedWordsMatch':normalize(answer['transcript']) == normalize(line['text']),'reviewModel':model,'src':voices[line['id']]['src'],'audioSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    return answer

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(inspect,selected.values()))
review = HERE/'voice-sample-review.json'
if len(sys.argv) > 1 and review.exists():
    previous = {line['id']:line for line in json.loads(review.read_text())['samples']}
    previous.update({line['id']:line for line in results})
    results = list(previous.values())
review.write_text(json.dumps({'method':'Independent Gemini audio transcription without supplying expected dialogue; proper-name vocabulary supplied for spelling','samples':results},ensure_ascii=False,indent=2)+'\n')
for result in results:
    print(json.dumps(result,ensure_ascii=False))
