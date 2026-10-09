import type { Chapter } from '../story/types.js';
import type { NpcView, StoryGate } from './types.js';
import { hasInterviewRecord } from './interviews.js';
import { gateOpen, type StoryFacts } from './story-gates.js';

export type InvestigationLead = StoryGate & {
  id: string; title: string; detail: string;
  location?: string; character?: string; hotspot?: string;
  completeWhen: { evidence?: string[]; deduction?: string };
  hints?: string[];
};
export type InvestigationGuidance = { introduction: string; leads: InvestigationLead[] };
export type LeadView = Pick<InvestigationLead, 'id' | 'title' | 'detail' | 'location' | 'character' | 'hotspot'> & {
  complete: boolean; assignedTo?: string; hintCount: number; hintLevel: number; hint?: string;
};
export type GuidanceView = { introduction: string; leads: LeadView[] };
export type ProgressCount = { done: number; total: number };
export type ChapterProgress = { ready: boolean; evidence: ProgressCount; deductions: ProgressCount; interviews: ProgressCount };

export function investigationGuidance(chapter: Chapter, facts: StoryFacts, hints: Record<string, number> = {}, claims: Record<string, string> = {}): GuidanceView {
  return {
    introduction: chapter.guidance?.introduction ?? chapter.opening,
    leads: (chapter.guidance?.leads ?? []).filter(lead => gateOpen(lead, facts)).map(lead => {
      const hintCount = lead.hints?.length ?? 0;
      const hintLevel = Math.min(Math.max(hints[lead.id] ?? 0, 0), hintCount);
      return {
        id: lead.id, title: lead.title, detail: lead.detail,
        location: lead.location, character: lead.character, hotspot: lead.hotspot,
        complete: (lead.completeWhen.evidence ?? []).every(id => facts.evidence.includes(id))
          && (!lead.completeWhen.deduction || !!facts.deductions?.includes(lead.completeWhen.deduction)),
        assignedTo: claims[lead.id], hintCount, hintLevel,
        ...(hintLevel ? { hint: lead.hints![hintLevel - 1] } : {}),
      };
    }),
  };
}

export function chapterProgress(chapter: Chapter, evidence: readonly string[], deductions: readonly string[], npcs: readonly NpcView[]): ChapterProgress {
  const discoveries = count(chapter.requiredEvidence, id => evidence.includes(id));
  const findings = count(chapter.deductionIds, id => deductions.includes(id));
  const interviews = count(chapter.requiredInterviews ?? [], id => {
    const npc = npcs.find(npc => npc.id === id);
    return !!npc && hasInterviewRecord(npc, evidence);
  });
  return { evidence: discoveries, deductions: findings, interviews, ready: [discoveries, findings, interviews].every(item => item.done === item.total) };
}

function count(ids: readonly string[], complete: (id: string) => boolean): ProgressCount {
  return { done: ids.filter(complete).length, total: ids.length };
}

export function investigationQuestions<T extends { id: string; title: string; question: string }>(chapter: Chapter, questions: readonly T[], facts: StoryFacts): Pick<T, 'id' | 'title' | 'question'>[] {
  return questions.filter(question => {
    if (!chapter.deductionIds.includes(question.id)) return false;
    const lead = chapter.guidance?.leads.find(lead => lead.completeWhen.deduction === question.id);
    return !lead || gateOpen(lead, facts) || facts.deductions?.includes(question.id);
  }).map(({ id, title, question }) => ({ id, title, question }));
}
