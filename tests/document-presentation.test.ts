import assert from 'node:assert/strict';
import test from 'node:test';
import { hasTranscription } from '../frontend/src/documents/document-presentation';
import type { SourcePage } from '../shared/story/types';

test('a photograph description is not treated as words on the paper', () => {
  const page = { label: 'Front', artwork: 'portrait', description: 'Two people stand beside a torn edge.' } as SourcePage;
  assert.equal(hasTranscription(page), false);
  assert.equal(hasTranscription({ ...page, paragraphs: ['Our wedding · 8 June 1884'] }), true);
});

test('letters, tickets and tables remain transcribable without an invented heading', () => {
  const page = { label: 'Paper', artwork: 'paper' } as SourcePage;
  assert.equal(hasTranscription({ ...page, fields: [['Name', 'Nora Finch']] }), true);
  assert.equal(hasTranscription({ ...page, table: { columns: ['Work'], rows: [['Shirt cuffs']] } }), true);
  assert.equal(hasTranscription({ ...page, date: '17 November 1888', signature: 'Maggie' }), true);
});
