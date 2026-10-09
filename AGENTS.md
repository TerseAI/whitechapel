# Terse engineering conventions

Rules for working in this repo. Keep changes minimal and idiomatic.

## Story geography

Before changing a travel destination, map, historical address, or chapter location, read [the district map contract](docs/geography/README.md). Use story-owned `sites` records following the types in `shared/geography/atlas.ts`; every scene needs a `siteId`. Real sites keep the same position across chapters. Never give an invented address a historical pin or alter the source map without reviewing every registered point. `npm run build` runs the geographic checks; use `npm run test:map` for map interactions and responsive review.

## Core rules

1. **Minimize comments.** Add one only when a choice is non-obvious, odd, or a deliberate compromise whose rationale must remain beside the code.

2. **Prefer a library** over building it yourself for common problems.

3. **Use dependency injection at effectful boundaries.** Code against a narrow interface when an implementation must be replaceable, and inject dependencies through constructors. Do not add interfaces around pure helpers.

4. **Follow the step-down rule.** Present public orchestration first, followed by progressively lower-level helpers in call order.

5. **Keep methods and functions short.** Split work into named operations when a function mixes responsibilities or abstraction levels.

6. **Follow SOLID principles**

7. **Follow TDD.** Add a failing behavior test before production changes, then implement and refactor.

8. **Domain driven design** Organize your code follow domain driven design principles.

## Paper and documents

Before working on briefings, evidence documents, letters, ledgers, newspapers, paper props or drawn maps, read [the paper direction](docs/art/paper-documents.md).

- Every paper document needs an illustrated original and a readable transcription overlay. Show the transcription by default and remember the player’s preference across documents and visits. Reuse `DocumentReader`.
- Match the material, handwriting and layout to the author and purpose. Keep text and visual clues consistent between the original and transcription.
- Briefings are correspondence or orders from the investigators’ supervisor, with concrete instructions and a reason for sending them.
- Use built-in Codex capabilities or open-source tooling. Keep story artwork, prompts and provenance with its story package.

## Investigation interface

See [the Case Map contract](docs/case-map.md) before changing investigation UX.

- Questions and established findings belong on the Case Map. Keep the 3D scene clear for movement and witness interaction.
- The Case Map is a fixed evidence billboard. Papers stay pinned in place; dragging between them draws red thread. No board zoom or panning. Hover or keyboard focus reveals titles. Preserve successful connections, success feedback and incorrect-answer feedback.
- Give the board the available space. Keep its questions visible and Places to visit collapsed behind a toggle on opening.
- In co-op, two human players must select different detectives and be ready before starting. Both must agree on reports; temporary disconnection does not waive agreement. Explicit solo cases use one chosen detective, with reports, cutscenes and joint inspections adapted to that player; preserve evidence and location prerequisites. See [framework behavior](docs/framework.md).
- The default detectives are Inspector Reed (short and stocky, with a large moustache) and Inspector Ellis (very tall, with sideburns). Their names and appearances identify the roles; no elaborate backstories are required.
- Briefings say “Begin the enquiry” on first viewing and “Continue the enquiry” on return.
- Interviews use one subtitle turn at a time, revealed when its voice starts. Response choices appear after the exchange. Muting silences the voice while subtitles keep advancing. Unavailable voices or Read instead use Continue per turn. See [interviews](docs/interviews.md).

## Story packages and documentation

The game is called Whitechapel. The default `stories/starter` package is empty. Use [story authoring](docs/story-authoring.md) and `stories/story.schema.json` for content. Keep plot IDs out of engine components. Saved cases require a matching story ID and version; no compatibility adapters or migrations are provided.

Keep `docs/` focused on historical research, source discussion, current framework behavior and authoring. Story-specific scripts, assets and production records belong with their story package. Keep repository documentation current rather than retaining superseded drafts or decision logs.

`docs/the-sixth-murder-plot-overview.md` is the user's active working script. Preserve it in place during framework work and documentation cleanup. It is not an archived or superseded draft.
