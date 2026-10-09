import type { Approach, DialogueTurn, Reply } from '../../../shared/game/types.js';
import type { Character, StoryTopic } from '../../../shared/story/types.js';
import type { Delivery, InterviewOption } from './types.js';

const approaches: Approach[] = ['reassure', 'press', 'challenge'];

export function interviewOptions(npc: Character, topics: StoryTopic[], evidenceId?: string): InterviewOption[] {
  return topics.flatMap(topic => approaches.filter(approach => topic.documentId ? approach === 'reassure' : topic.choices?.some(choice => choice.approach === approach)).map(approach => {
    const supported = !topic.proof || [topic.proof, ...(topic.proofAlternatives ?? [])].includes(evidenceId ?? '');
    const success = approach === topic.correct && (approach !== 'challenge' || supported);
    const branch = approach === 'challenge' && !supported ? { ...topic.failure, success: false }
      : topic.responses?.[approach] ?? { ...(success ? topic.success : topic.failure), success };
    const question = topic.choices?.find(choice => choice.approach === approach)?.label ?? topic.ask ?? topic.label;
    return { id: `${topic.id}:${approach}`, topicId: topic.id, approach, question,
      account: (branch.turns ?? [{ speaker: 'witness', text: branch.text }]).map(turn => `${turn.speaker}: ${turn.text}`).join('\n'),
      verbatim: topic.performance === 'verbatim' || !!topic.documentId,
      reply: { ...branch, topicId: topic.id, approach, question, ...(evidenceId ? { evidenceId } : {}) },
    };
  }));
}

export function actorContext(npc: Character, option: InterviewOption, memories: Reply[], delivery: Delivery) {
  return { name: npc.name, persona: npc.mind?.persona ?? npc.occupation, goals: npc.mind?.goals ?? [], delivery,
    triggeringQuestionAlreadySpoken: option.question, permittedTurns: canonicalTurns(option),
    previousStatements: memories.slice(-12).map(reply => ({ question: reply.question, turns: reply.turns ?? [{ speaker: 'witness', text: reply.text }] })),
  };
}

export function checkPerformance(option: InterviewOption, turns: DialogueTurn[]): boolean {
  if (!turns.length || turns.length > Math.max(6, canonicalTurns(option).length) || turns.some(turn => !turn.text.trim() || turn.text.length > 1000 || !['witness', 'investigator'].includes(turn.speaker))) return false;
  if (option.verbatim) return JSON.stringify(turns) === JSON.stringify(canonicalTurns(option));
  const canonical = canonicalTurns(option);
  // Investigator follow-ups are approved player intentions and may not disclose new facts.
  return turns.length === canonical.length && turns.every((turn, index) => turn.speaker === canonical[index].speaker
    && (turn.speaker !== 'investigator' || turn.text === canonical[index].text));
}

export function canonicalTurns(option: InterviewOption): DialogueTurn[] {
  return option.reply.turns ?? [{ speaker: 'witness', text: option.reply.text }];
}

export function disclosureMessage(npc: Character, input: string, evidence: string[]): string | undefined {
  const normalized = input.normalize('NFKC').toLowerCase();
  return npc.mind?.disclosures?.find(rule => !evidence.includes(rule.afterEvidence)
    && rule.terms.some(term => normalized.includes(term.toLowerCase())))?.message;
}
