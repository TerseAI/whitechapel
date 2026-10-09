# Mystery in Whitechapel

Mystery game based in Victorian London, for one player or two-player co-op. The repository contains a reusable investigation framework and an empty starting scene with Inspector Reed and Inspector Ellis. Stories supply their own plot, cast and assets.

## Run

Requires Node.js 22.19 or newer in the 22.x release line, and npm. Run `nvm use` if you use nvm. Local play works without provider accounts; live AI conversations are optional.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5188**. Choose **Play solo** to investigate with one detective, or **Play with a partner** and send the lobby invitation. In co-op, both players must choose different inspectors and mark themselves ready. Use separate browser profiles to test both players on one computer.

The launcher uses ports 5188, 3188 and 7188 and saves cases in `.durable-actors/`. Frontend edits refresh through Vite. Backend, shared-code, story and story-asset edits restart the development services and reload the preview automatically. Press Enter in the dev terminal to restart manually. Saved cases stay in the same directory; only one runtime may use a data directory at a time.

## Play Mystery in Whitechapel

```sh
npm run dev:sixth-murder
```

Open **http://127.0.0.1:5388** and choose solo or co-op. Cases are saved in `.durable-actors/sixth-murder/`, separately from the framework server. This story follows Reed and Ellis through an evening at the Lantern, an open murder enquiry, a search, a playable confrontation and a return to the inn. Co-op players choose different inspectors and agree on chapter conclusions. Solo players choose either inspector and submit their own conclusions. The case can be completed without a confession.

For live characters, copy `.env.example` to `.env.local` and set `TYPESAFE_API_KEY` and `FAL_KEY`. Jev selects permitted reactions; each character uses Gemini 3.8 Flash (`google/gemini-3.8-flash`) with medium thinking through fal’s OpenRouter endpoint by default, with individual goals and persistent memory. Dialogue, transcription and speech use fal credits; no separate OpenAI API key is needed. ElevenLabs Turbo v2.5 speech runs through fal and is streamed from temporary provider links; the game does not store generated audio files. Click Start talking once, then speak naturally; each message is sent when you stop, or use hold to talk instead. ElevenLabs Scribe v2 through fal transcribes each message; characters respond naturally, including small talk and follow-ups. Authored questions and response choices remain available alongside optional live voice conversation. The script's clues, objects, prerequisites and protected disclosures remain authoritative. Keys stay on the server; restart the launcher after changing them. Use `AI_MODE=live` to require model credentials. `AI_MODE=authored` disables live conversation for deterministic framework testing.

`npm run test:ai` runs a live browser check against port 5388 and uses provider credits. `npm run test:persistence` verifies generation checkpoints and committed evidence across real runtime restarts using isolated temporary storage. Mystery in Whitechapel uses story version 6; start a new case for this version.

The story package and its production material live in [stories/sixth-murder/](stories/sixth-murder/). `npm run build:sixth-murder` validates and builds it; the empty starter remains the default for framework work. For an isolated development case, run `STORY_PATH=stories/sixth-murder/story.json FRAMEWORK_PORT=5388 npm run dev:framework`, then `npm run test:sixth-murder` in another terminal to exercise the complete two-player case. Add `-- --solo` for the one-detective playthrough.

## Hosting

Run `npm run cloud:prepare` to package Mystery in Whitechapel, then `npm run test:cloud` to verify that exact package locally. After deployment, `npm run test:cloud:hosted` checks the real cloud actors using `TERSE_ACTOR_URL` and `TERSE_API_KEY` from `.env.local`.

The shared game is hosted on Vercel at [whitechapel-rho.vercel.app](https://whitechapel-rho.vercel.app) and opens without a website password. Each pair has its own two-player cloud case; **Play solo** creates a case for one detective. See [deployment](docs/deployment.md) for Vercel settings and plain `terse deploy`. `npm run dev:cloud` remains the development launcher.

See [deployment preparation and commands](docs/deployment.md) for project linking, deployment and gateway hosting. Artwork remains in its story package. Local development uses fresh `.durable-actors/` storage.

## Create a story

```sh
npm run story:new -- your-story
npm run story:check -- stories/your-story/story.json
STORY_PATH=stories/your-story/story.json npm run dev
```

Each story is a `story.json` file with an `assets/` directory beside it. The schema covers chapters, scenes, geography, inspectors, witnesses, interviews, evidence, documents, objects, deductions, reconstructions, cutscenes, images, models, voices and music. The creation command makes an empty package and refuses to overwrite an existing directory.

Read [the authoring guide](docs/story-authoring.md) for field meanings, examples and extension points. [The JSON Schema](stories/story.schema.json) supplies editor completion; `story:check` also validates references, walkable scenes and asset files. Start new cases after changing a story's structure. Bump its `version` when publishing a revision. Saved cases require the same story ID and version; there are no save migrations.

## Features

- Shared 3D exploration, movement, witness interaction and reconnecting sessions.
- Spoken character conversations with persistent memory, exhibit presentation and validated evidence disclosures.
- Multi-page illustrated documents, readable transcription, zoom and remembered reading preference.
- Physical objects with inspection steps, changing illustrations and optional joint attendance.
- A fixed Case Map with evidence connections, reconstruction puzzles and shared conclusions.
- Joint cutscenes with cards, images, staged actors, camera framing, subtitles and optional audio.
- Reports, findings, non-accusatory continuation, epilogues and saved endings.

## Validate

```sh
npm test
npm run build
```

For a separate test story with no campaign content:

```sh
npm run dev:framework
# In another terminal:
npm run test:framework
npm run test:solo
```

The preview runs at **http://127.0.0.1:5288**, uses separate ports and creates temporary actor storage, retained across development reloads until you stop the launcher. Its fixture exercises three stages, six destinations, a witness, a paper, an illustrated object and a reconstruction. Chrome is required for the browser check. Screenshots go to `.qa/framework/`. The `test:map`, `test:documents`, `test:objects` and `test:case-map` commands run this same integrated check.

## Conversation actor

[ConversationActor](backend/src/actors/conversation-actor.ts) owns authenticated character conversations, persistent history, microphone uploads and resumable interview generation. [InterviewCoordinator](backend/src/intelligence/coordinator.ts) orchestrates character decisions, dialogue, review and speech.

## Repository

| Path | Purpose |
| --- | --- |
| `stories/starter/` | Empty default story |
| `shared/story/` | Story contracts, schema and reference validation |
| `shared/game/` | Pure game rules and client/server contracts |
| `backend/src/` | Story loading, HTTP gateway and authoritative actors |
| `frontend/src/` | Reusable game interface and renderers |
| `frontend/public/` | Shared fonts, textures, sound effects and interface assets |
| `tests/fixtures/framework/` | Test-only story and clearly labelled fixture artwork |

See [framework behavior and limits](docs/framework.md), [architecture](docs/architecture.md), [paper direction](docs/art/paper-documents.md), and [geography](docs/geography/README.md). The [documentation index](docs/README.md) also covers historical context, source reading and interview writing.

## License and contributions

Original project material is [MIT licensed](LICENSE). Third-party dependencies and media retain their own terms; see [licenses and credits](THIRD_PARTY_NOTICES.md) before redistributing. Story illustrations and prerecorded voices include generated media with provenance in the story package.

See [contributing](CONTRIBUTING.md) for development checks and [security](SECURITY.md) for private vulnerability reporting and deployment considerations.
