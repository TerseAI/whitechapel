import type { SourcePage } from '../../../shared/story/types';

export function hasTranscription(page: SourcePage) {
  return !!(page.heading || page.kicker || page.date || page.paragraphs?.length || page.fields?.length || page.table || page.signature || page.marginalia);
}
