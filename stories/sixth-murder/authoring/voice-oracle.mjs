import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createInterviewSpeech } from '../../../shared/game/interview-speech.ts';
import { evaluateReply } from '../../../backend/src/story.ts';

export function expectedVoices(story) {
  const recordings = new Map();
  const add = (line, source) => {
    const record = { id: line.clip, text: line.text, speakerId: line.speakerId, speakerName: line.speakerName, source };
    const previous = recordings.get(record.id);
    if (previous) assert.equal(previous.text, record.text, `Conflicting text for ${record.id}`);
    else recordings.set(record.id, record);
  };
  for (const npc of story.characters) {
    for (const inspector of story.inspectors) {
      const player = { id: inspector.id, name: inspector.name, role: inspector.id, location: npc.location, lastSeen: 0, position: { x: 0, z: 0 } };
      const addSpeech = subject => {
        const speech = createInterviewSpeech('coverage', player, npc, 0, subject, 0);
        speech.lines.forEach(line => add(line, `${npc.id}/${subject.kind === 'reply' ? subject.reply.topicId : subject.kind === 'ask' ? subject.topicId : 'greeting'}`));
      };
      addSpeech({ kind: 'greeting' });
      for (const topic of npc.topics) {
        if (!topic.documentId) addSpeech({ kind: 'ask', topicId: topic.id });
        for (const choice of topic.documentId ? [{ approach: 'reassure' }] : topic.choices) {
          const identity = { id: 'coverage', npcId: npc.id, topicId: topic.id, playerId: player.id, approach: choice.approach, at: 0 };
          const reply = { ...identity, ...evaluateReply(npc, topic.id, choice.approach, choice.approach === 'challenge' ? topic.proof : undefined) };
          addSpeech({ kind: 'reply', reply });
          if (choice.approach === 'challenge' && topic.proof) addSpeech({ kind: 'reply', reply: { ...identity, ...evaluateReply(npc, topic.id, 'challenge', '__wrong-exhibit__') } });
        }
      }
    }
  }
  const cast = [...story.inspectors, ...story.characters];
  for (const scene of story.cutscenes) {
    for (const [index, step] of scene.steps.entries()) {
      const speaker = cast.find(character => character.id === step.speaker);
      add({ clip: `cutscene-${scene.id}-${index}`, text: step.text, speakerId: speaker?.id ?? 'narrator', speakerName: speaker?.name ?? 'Narrator' }, `cutscene/${scene.id}`);
    }
  }
  return [...recordings.values()].sort((a, b) => a.id.localeCompare(b.id));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8'));
  const voices = expectedVoices(story);
  writeFileSync(new URL('./expected-voices.json', import.meta.url), `${JSON.stringify(voices, null, 2)}\n`);
  process.stdout.write(`${voices.length} playback clip IDs require exact matching recordings.\n`);
}
