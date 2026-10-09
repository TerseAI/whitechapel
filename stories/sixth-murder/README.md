# The Sixth Murder

A complete story package for **Whitechapel**, based on the [active plot overview](../../docs/the-sixth-murder-plot-overview.md). Two investigators arrive at the Lantern on 16 November 1888. The following morning brings an enquiry into a woman they met there.

## Play

From the repository root:

```sh
npm run dev:sixth-murder
```

Open **http://127.0.0.1:5388**. Create a case and share its invitation with the other player. Choose different inspectors, then both select **I’m ready**. On one computer, use separate browser profiles or an ordinary window and a private window. Cases persist in `.little-actors/sixth-murder/` when the server restarts.

Click the room to walk, or select a witness or object to approach it. Interviews belong to one investigator at a time; close the conversation to let your partner take over. Spoken exchanges reveal one subtitle turn at a time. Muting changes this to **Continue** for each turn. Papers open with readable transcriptions; **View original** shows the illustrated document.

Use the **Case map** to review questions and collected evidence. Drag between pinned papers to draw a connection. Scroll vertically to reach further papers; on small screens the questions have a separate panel above them. **Places to visit** and the district map provide travel. Both investigators must agree to finish a stage or submit a report. A disconnected partner must return before the agreement can complete.

The five stages are arrival, an open enquiry, the search, Arthur’s account and the return to the Lantern. Earlier enquiry rooms remain available during the search. The final report can be supported without a confession. The script targets approximately an hour; actual duration depends on reading, discussion and optional questions and has not been measured with human players.

## Authoring and validation

The current writing is in `authoring/dialogue-script.md`, the active plot overview and canonical document text. Illustrated papers match that text, including both newspaper copies and Maggie’s revised closing letter. Their originals, transcriptions, desktop and phone layouts have been checked. Voice recordings cover the current dialogue.

`story.json` is generated from the canonical modules in `authoring/`. Edit those modules, then rebuild the package:

```sh
node stories/sixth-murder/authoring/build-story.mjs
npm run story:check -- stories/sixth-murder/story.json
npm run test:sixth-murder:rules
npm run build:sixth-murder
```

With the game running, these complete the case using two browser sessions and authoritative game actions:

```sh
npm run test:sixth-murder
PLAYTEST_ROUTE=denial npm run test:sixth-murder
PLAYTEST_VOICES=1 npm run test:sixth-murder
```

Chrome must be installed. Screenshots and results are written to `.qa/sixth-murder/`. The denial route deliberately leaves recoverable objects behind on the first visit and omits optional admissions at the station. The checks also exercise rejected connections and reports, joint agreement, responsive boards, illustrated papers and a saved ending. `PLAYTEST_VOICES=1` additionally checks actual MP3 playback, subtitle sequencing, response timing and muted replay in the opening interview.

| Source | Purpose |
| --- | --- |
| `authoring/build-story.mjs` | Stages, travel, findings and transitions |
| `authoring/dialogue.mjs` | Canonical spoken dialogue and branches |
| `authoring/evidence.mjs` | Evidence, objects, connections and reconstruction |
| `authoring/documents.mjs` | Paper text and page structure |
| `authoring/scenes.json` | Generated rooms, navigation and site records |
| `authoring/assets.json` | Integrated image and voice catalogue |
| `authoring/assemble-assets.mjs` | Rebuilds the catalogue from media production registries |
| `authoring/voice-oracle.mjs` | Exact cues expected by the playback engine |
| `authoring/environments.md` | Room production, references and continuity |

The artwork, prompts, production scripts and provenance stay with this package. Voice generation uses the canonical dialogue and caches recordings by speaker and exact text; changing a line requires a matching new recording. The voice coverage test compares every expected runtime cue, including either detective’s responses and transition narration, against the packaged text and audio file.

The voice catalogue contains 811 runtime cues sharing 809 recordings, all generated with `gemini-3.1-flash-tts-preview`, the established cast and character directions, and the approved shortened prompt. `authoring/voice-refresh.json` records exact script coverage. `authoring/voice-production.json` records the generation model and prompt variants. The generator’s `--quote-text` option surrounds supplied dialogue with quotation marks for rejected short replies and retakes, without changing spoken words. Cached recordings retain their original model metadata; use `--force-ids` to regenerate selected cues.

Every recording has undergone automated transcription and sound checks, with flagged clips checked against the intended dialogue and confirmed faults retaken. `authoring/voice-quality-review.json` records those results and file hashes. Gemini 2.5 Pro is used only for audio review, never for voice generation. This automated review does not replace a human listening assessment. Background music is “Darkest Child” by Kevin MacLeod, licensed under CC BY 4.0; the original 72-second ambient loop remains available as an alternative.

The conversation and route tests check the current writing, including early visits, alternate marriage discoveries, recovered refusals and both denial and partial-admission endings. Illustrated-paper matching, exact voice coverage and the full two-player playtest with opening-interview audio playback pass. Human playtesting is still needed to assess pacing.

## Historical setting

Nora, Arthur, this crime, the Lantern and the other domestic or trade interiors are fictional. Commercial Street station is historical; its depicted interview room is an interpretation. Invented addresses have no historical map pins. Room relationships follow the script, including the low rear extension, broad service steps and the washhouse that blocks Baines’s view of the discovery corner.

The case distinguishes medical observations, witnesses’ accounts and the investigators’ inferences. It neither resolves nor identifies the offender in the historical Whitechapel murders. Source discussion and the limits of the room references are recorded in [environment production](authoring/environments.md) and the [plot overview](../../docs/the-sixth-murder-plot-overview.md).
