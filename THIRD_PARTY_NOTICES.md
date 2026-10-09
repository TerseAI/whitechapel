# Licenses and asset credits

The root [MIT license](LICENSE) covers original Whitechapel source, documentation,
story writing and project-owned media, to the extent contributors hold rights in
them. The components listed below retain their own licenses. MIT does not grant
rights to third-party services, trademarks, voices or linked research material.

## Runtime and tooling

Dependencies are installed through `npm ci`; their licenses remain in their npm
packages. In particular, `terse-sdk`, `terse-types` and `terse-cli` 0.9.15 ship the
**Sustainable Use License 1.0**, with limitations on commercial use and
redistribution. Those packages are source-available and are not covered by this
repository's MIT license. Review their [bundled license](licenses/terse-LICENSE.md)
before distributing or operating a derivative. Generated Terse client bindings
in `backend/src/actors/generated/` and `shared/actors/generated.d.ts` retain any
applicable generator-template terms; this project does not relicense Terse code.

`durable-actors` 0.7.16 is MIT. Other direct dependencies use MIT, ISC or Apache-2.0;
the lockfile pins the installed versions. Keep dependency notices when shipping
bundles. Service subscriptions and API access are separate from source licensing.

Browser voice detection also copies these files from installed dependencies into
`dist/vad/`: the VAD worklet (ISC), Silero VAD v5 model (MIT), and ONNX Runtime Web
WASM/JavaScript (MIT). Their notices are shipped in
[`frontend/public/licenses/`](frontend/public/licenses/).

## Bundled third-party media

| Files | Creator and source | Terms |
| --- | --- | --- |
| `frontend/public/fonts/bodoni-moda.ttf` | The Bodoni Moda Project Authors, [Google Fonts](https://github.com/google/fonts/tree/main/ofl/bodonimoda) | [SIL Open Font License 1.1](frontend/public/fonts/OFL.txt) |
| `frontend/public/materials/dark_brick_wall-*.jpg` | [Poly Haven: Dark Brick Wall](https://polyhaven.com/a/dark_brick_wall) | [CC0](https://polyhaven.com/license); colour, normal and roughness maps |
| `frontend/public/materials/cobblestone_floor_08-*.jpg` | [Poly Haven: Cobblestone Floor 08](https://polyhaven.com/a/cobblestone_floor_08) | [CC0](https://polyhaven.com/license); colour, normal and roughness maps |
| `frontend/public/audio/effects/paper-rustle.mp3` | [Paper Rustle by BenjaminNelan](https://freesound.org/people/BenjaminNelan/sounds/353125/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); unmodified MP3 preview; [credits](frontend/public/audio/effects/CREDITS.md) |
| `stories/sixth-murder/assets/music/darkest-child.mp3` | “Darkest Child” Kevin MacLeod ([incompetech.com](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100783)) | [CC BY 4.0](stories/sixth-murder/assets/music/CC-BY-4.0.txt); recording unmodified, looped with playback volume adjustment; [credits](stories/sixth-murder/assets/music/CREDITS.txt) |

## Original and generated media

The interface cues are synthesized by the scripts in this repository. Story models are authored procedural geometry; their sources
and spatial checks are in `stories/sixth-murder/authoring/`.

Story illustrations, portraits and paper props were generated with Codex image
generation and edited for the fictional story. Prerecorded character speech was
generated with Google Cloud Text-to-Speech. Prompts, cast assignments and
production records remain with the story. These are fictional props and
synthetic performances, not archival facsimiles or recordings of historical
people. See [asset provenance](docs/assets.md),
[image production](stories/sixth-murder/authoring/media-production.json) and
[voice production](stories/sixth-murder/authoring/voice-production.json).

Live dialogue and speech use the services described in
[deployment](docs/deployment.md). Regeneration requires your own provider access
and compliance with the provider's current terms. The source license grants
only the rights contributors can grant; it does not guarantee copyright
protection or exclusive rights in generated output.

Historical research links provide context. No permission to copy modern books,
photographs, maps or transcripts is implied by those links.
