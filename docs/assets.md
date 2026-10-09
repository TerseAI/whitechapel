# Assets and production

`frontend/public/` contains shared interface assets. Each story owns its images, models, music and character recordings in an `assets/` directory beside `story.json`. The default Whitechapel package has no story media.

## Shared assets

| Asset | Origin | License or provenance |
| --- | --- | --- |
| `frontend/public/materials/dark_brick_wall-*.jpg` | [Poly Haven](https://polyhaven.com/a/dark_brick_wall) | CC0; 1K colour, OpenGL normal and roughness maps |
| `frontend/public/materials/cobblestone_floor_08-*.jpg` | [Poly Haven](https://polyhaven.com/a/cobblestone_floor_08) | CC0; 1K colour, OpenGL normal and roughness maps |
| `frontend/public/materials/street-smoke.svg`, `gaslamp-halo.svg` | Original procedural textures | Fractal noise and radial gradients for outdoor smoke and lamp glow |
| `frontend/public/art/case-board.webp` | Built-in Codex image generation | Empty mahogany and olive-baize board; [prompt and provenance](art/case-board-prompt.txt), [source image](art/masters/case-board.png) |
| `frontend/public/fonts/bodoni-moda.ttf` | [Google Fonts: Bodoni Moda](https://github.com/google/fonts/tree/main/ofl/bodonimoda) | [Bundled SIL Open Font License](../frontend/public/fonts/OFL.txt) |
| `frontend/public/audio/effects/*.wav` | Original synthesized cues | Created by `scripts/generate-game-cues.py` |
| `frontend/public/audio/effects/paper-rustle.mp3` | BenjaminNelan, Paper Rustle | CC0; [bundled credits](../frontend/public/audio/effects/CREDITS.md) |
| `frontend/public/audio/silence.wav` | Silent playback asset | Used to initialize browser audio; contains no character speech |
| `frontend/public/favicon.svg` | Original gaslamp icon | Shared Whitechapel interface artwork |
| Procedural scene and character geometry | `frontend/src/World3D.tsx` and `frontend/src/scenes/` | Source-owned reusable renderers |
| Icons | lucide-react | ISC dependency license |

`frontend/public/materials/sources.json` records texture source URLs. `scripts/fetch-materials.mjs` downloads these shared materials.

## Story images and models

Register images with their actual dimensions and models with their package-relative paths. Prefer self-contained GLB files. Retain source, license and generation provenance with the package’s authoring material. Historical reference images and authored game illustrations serve different purposes; a research link does not grant redistribution rights.

The renderer supports basic room and yard sets, imported models, backdrops, decorative props, character portraits and illustrated inspections. Use consistent scale and test on smaller displays before increasing asset resolution. Collision boundaries are authored separately from visible geometry.

Papers use an illustrated original and readable transcription. Physical objects can have multiple views tied to inspection steps. Follow [paper production](art/paper-documents.md) and [story authoring](story-authoring.md).

## Speech and music

The framework plays prerecorded story files and optional live synthesized speech. Prerecorded assets require no provider credentials to play; live dialogue and speech use the services described in [deployment](deployment.md). Write and review dialogue before recording it. Register each voice clip’s path, exact text and measured duration in the story’s `voices` catalogue. Recordings belong to the story that owns those lines.

Listen for pronunciation, unexpected pauses and correspondence with the subtitles. File validity alone does not establish performance quality. Missing or muted recordings fall back to readable turns; cutscene recordings must match their authored text during validation. See [interview playback](interviews.md).

A story may supply a music loop and credits. Voices, music and interface effects have separate volume controls. Music quiets during dialogue and pauses while the tab is hidden.

## Validation

`npm run story:check` checks registered files and references. `npm run build` checks the selected package and compiles the shell. The framework browser fixture exercises images, models, documents and physical inspection with clearly labelled test artwork. Its assets belong under `tests/fixtures/framework/`, outside the shipped default story.

## Redistribution

See [licenses and credits](../THIRD_PARTY_NOTICES.md) for the MIT scope, dependency terms and media exceptions. Keep required notices with redistributed files. The story retains current production originals and generator inputs alongside runtime assets; superseded takes, retired puzzle assets and generated review screenshots are excluded.
