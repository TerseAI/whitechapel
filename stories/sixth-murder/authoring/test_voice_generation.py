import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('generate_voices', HERE / 'generate-voices.py')
voices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voices)


class VoiceGenerationTests(unittest.TestCase):
    def test_quoted_input_preserves_the_requested_words_and_voice(self):
        provider = voices.GeminiSpeech('offline-test', quote_text=True)
        body = provider.request_body('arthur', 'No.')
        self.assertEqual(body['input']['text'], '"No."')
        self.assertEqual(body['voice']['modelName'], voices.MODEL)
        self.assertEqual(body['voice']['name'], voices.CAST['arthur'][0])

    def test_normal_and_retake_requests_keep_the_latest_model_and_character(self):
        provider = voices.GeminiSpeech('offline-test')
        for actor in voices.CAST:
            normal = provider.request_body(actor, 'Good evening.')
            retake = provider.request_body(actor, 'Good evening.', revision=True)
            for body in [normal, retake]:
                self.assertEqual(body['voice']['modelName'], 'gemini-3.1-flash-tts-preview')
                self.assertEqual(body['voice']['name'], voices.CAST[actor][0])
                self.assertEqual(body['voice']['languageCode'], 'en-GB')
                self.assertEqual(body['input']['prompt'], f'{voices.CAST[actor][1]} Read the supplied dialogue exactly once, in a natural British English voice, with clean studio audio. Speech only; no music or sound effects.')
                self.assertEqual(body['input']['text'], 'Good evening.')

    def test_every_script_actor_has_a_distinct_voice_and_direction(self):
        actors = {line['actor'] for line in json.loads((HERE / 'voice-script.json').read_text())}
        self.assertEqual(actors, set(voices.CAST))
        self.assertEqual(len(actors), len({voice for voice, _ in voices.CAST.values()}))
        self.assertEqual(len(actors), len({direction for _, direction in voices.CAST.values()}))

    def test_existing_recording_is_reused_without_synthesis_or_relabeling(self):
        class NoSynthesis:
            def synthesize(self, *args):
                raise AssertionError('Existing audio must not be regenerated')

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'voice-cache').mkdir()
            cached = {'src': 'audio/reed-old.mp3', 'model': 'gemini-2.5-flash-tts'}
            metadata = root / 'voice-cache/reed-old.json'
            metadata.write_text(json.dumps(cached))
            with patch.object(voices, 'HERE', root):
                self.assertEqual(voices.record(NoSynthesis(), {'actor': 'reed', 'sha256': 'old'}), cached)
            self.assertEqual(json.loads(metadata.read_text()), cached)


if __name__ == '__main__':
    unittest.main()
