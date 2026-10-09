import { TypeSafeClient } from '@typesafe-ai/sdk';
import { createFalClient } from '@fal-ai/client';
import { z } from 'zod';
import { JevDirector } from './jev.js';
import { FalCharacterPerformer } from './fal-character.js';
import { FalSpeech } from './fal-speech.js';
import { FalTranscription, type AudioTranscription } from './fal-transcription.js';
import type { CharacterPerformer, DecisionMaker, SpeechProducer } from './types.js';

export type DialogueProviders = { director: DecisionMaker; performer: CharacterPerformer; speech?: SpeechProducer; microphone?: AudioTranscription };
export function liveInterviewsEnabled() {
  const enabled = process.env.AI_MODE !== 'authored' && !!process.env.TYPESAFE_API_KEY && !!process.env.FAL_KEY;
  if (process.env.AI_MODE === 'live' && !enabled) throw new Error('Live interviews require TYPESAFE_API_KEY and FAL_KEY.');
  return enabled;
}
export function createDialogueProviders(): DialogueProviders {
  if (!liveInterviewsEnabled()) throw new Error('Live interviews are unavailable.');
  const director = new JevDirector(new TypeSafeClient({ timeout: 10_000, retry: { maxRetries: 0 }, logLevel: 'off' }), process.env.JEV_MODEL ?? 'jev-latest');
  const fal = createFalClient({ credentials: process.env.FAL_KEY });
  const effort = z.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']).parse(process.env.CHARACTER_REASONING_EFFORT ?? 'medium');
  const performer = new FalCharacterPerformer(fal, process.env.CHARACTER_MODEL ?? 'google/gemini-3.8-flash', effort);
  const voices = { reed: 'George', ellis: 'Harry', ...JSON.parse(process.env.FAL_VOICES ?? '{}') };
  const speech = new FalSpeech(fal, voices);
  return { director, performer, speech, microphone: new FalTranscription(fal) };
}
