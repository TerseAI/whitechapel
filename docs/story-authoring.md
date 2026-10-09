# Authoring a story

A story supplies data and assets to the existing investigation engine. You can replace the plot, cast, documents, physical evidence, scene sets and cutscenes without editing application components.

## Start with an empty package

```sh
npm run story:new -- your-story
npm run story:check -- stories/your-story/story.json
STORY_PATH=stories/your-story/story.json npm run dev
```

The directory contains `story.json` and `assets/`. Keep paths relative to `assets/`, for example `documents/orders.webp`. Absolute paths, remote asset URLs and traversal out of this directory are rejected. Register actual image dimensions and keep model resources inside the package. Prefer self-contained GLB models.

One story is selected per server. The gateway and actor runtime must receive the same `STORY_PATH`; both launchers arrange this automatically. Restart after editing story data. Clients load the story presentation from `/api/story`; the gateway serves its assets under `/story-assets/<id>/<version>/`. Vite's production bundle contains the shell and shared assets, so deploy the selected story directory beside the backend as well.

`id` identifies the story, `version` identifies the content revision, and `schemaVersion: 2` is the engine's current story format. Saved cases and browser credentials are scoped to story identity and version. There is no campaign migration. Use **Reset game** to clear this browser's saved case access before starting a fresh case, and bump `version` for published content revisions.

Use [story.schema.json](../stories/story.schema.json) for editor help. The starter is the smallest working package. [The framework fixture](../tests/fixtures/framework/story.json) demonstrates the full collection → interview → inspection → connection → report flow. Its schematic SVGs are test fixtures, not the production art direction.

## Package sections

| Field | Contents |
| --- | --- |
| `title`, `subtitle`, `description`, `cover` | Entrance presentation; `cover` references an image ID |
| `inspectors` | Exactly two selectable roles with names and procedural appearances |
| `chapters` | Ordered stages, places, cast, requirements and transitions |
| `sites`, `map` | Shared geographic records and optional source image |
| `characters` | Witness appearances, location, dialogue and interview rules |
| `clues` | Evidence records, paper or image references and discovery chapter |
| `documents` | Multi-page originals and their canonical transcriptions |
| `objects` | Physical models, illustrated views, inspection steps and evidence rewards |
| `deductions`, `reconstructions` | Valid evidence connections and optional sequence puzzles |
| `cutscenes` | Cards, images and staged dialogue shots |
| `assets`, `models`, `voices`, `music` | Package media catalogues and optional soundtrack |
| `ending` | Text shown when the case is complete |

Catalogue keys must match the contained record's `id`. IDs accept letters, digits, underscores and hyphens. Keep them meaningful within this story; no particular witness, evidence or location ID has special engine behavior.

## Stages and winning a level

A chapter lists `locations`, `npcIds`, `clueIds`, `deductionIds`, `requiredEvidence` and optional `requiredInterviews`. Evidence and discoveries persist between stages. `reviewEvidence` selects the relevant papers for the chapter's review. Unused arrays and dictionaries stay empty.

A chapter's `flow` defines its entry and completion:

```json
{
  "entry": "reception",
  "entryCutscene": "arrival",
  "completion": { "kind": "continue", "label": "Retire for the evening" },
  "after": { "target": "advance", "cutscene": "morning" }
}
```

Every completion mode requires the chapter's evidence, deductions and interviews. Both investigators must agree.

| Completion | Authoring |
| --- | --- |
| `continue` | Provide the button `label`; no accusation is required |
| `report` | Set chapter `question`, `options`, `acceptedAnswers`, `report`, and optional `reportByAnswer` |
| `findings` | Set `options`, `supported` and `rejection` inside the completion object |

`after.target` is `advance`, `finish` or `epilogue`. An epilogue also needs `flow.epilogue: { entry, requiredEvidence, message, cutscene? }`, plus `epilogueLocations` and `epilogueNpcIds`. Collecting its required evidence finishes the case. Use a final `continue` stage when leaving should be an explicit decision.

A stage may have a `briefing` document ID. It opens after its entry cutscene, with **Begin the enquiry** on first viewing and **Continue the enquiry** on return.

Locations, topics and deductions accept `requiresAll` evidence IDs, `requiresDeduction`, `requiresChoice: { id, value }` and `requiresReport`. A chapter report can write a `decision` using its selected answer; dialogue branches can write a `choice`. These conditions express prerequisites without prescribing the order of unrelated interviews. Ensure required evidence remains obtainable: validation checks references and local navigation, not every possible narrative decision path.

## Scenes, maps and artwork

Every place has a unique `id`, a registered `siteId`, its visible name, subtitle and description, an `indoor` flag, and a `scene`:

- `basic-room` provides an empty interior.
- `basic-yard` provides an empty exterior.
- `model` uses a `sceneAsset` ID from `models`.

`backdrop` references an image. `props` place decorative primitives, image planes or models using `position`, optional `rotation` and `scale` tuples. Supported models are `box`, `sphere`, `cylinder`, `image` and `gltf`; the last two require an `asset` ID from the corresponding catalogue.

Photograph documents may set `presentation: "photograph"` for a two-sided Turn over control. Omit transcription fields on image-only pages. A page’s optional `heading` is text on the original, while `label` names its navigation control. `description` supplies an optional visual description outside the transcription; it must not explain deductions.

To give a directly inspected paper its illustrated appearance in the room, add an `image` prop with the same ID as its hotspot and use the document's original artwork asset. The prop replaces the generic evidence marker mesh; the hotspot button retains the normal inspection action. A page lying face up uses an X rotation of `-Math.PI / 2` (write the numeric value in JSON).

`navigation` supplies `bounds`, rectangular `obstacles`, optional two-player `spawns` (`{ x, z }`), character positions keyed by appearance ID in `characters`, and clue positions keyed by hotspot ID. Coordinates are scene units; y is up, z is depth. Collision is authored separately from visible models. Default spawns are `(-1, 8)` and `(1, 8)`. Navigation coordinates fit within ±100; compact scenes work best with the current camera and half-unit pathfinding grid. The basic sets use the starter's room footprint. Custom sets should use `model` and an authored layout.

A `hotspot` references an evidence ID and has a visible `label`. `navigation.clues` controls its 3D position; `x` and `y` are retained presentation coordinates. `hideWhenFound` removes a recovered hotspot. An object catalogue entry can take over that hotspot and require several inspections before recording the evidence.

An image entry looks like:

```json
"orders-original": {
  "src": "documents/orders.webp",
  "width": 1086,
  "height": 1448,
  "description": "The supervisor's handwritten orders."
}
```

The optional map supplies its own image path, dimensions, source attribution and `kind` (`historical` or `fictional`). Sites share one pixel coordinate across all visits. A fictional site may have a pin only on a fictional map. Historical maps require a SHA-256 hash and reviewed sources; see [the geography contract](geography/README.md). These records support story geography and validation; players travel through the destination list, without a separate district-map screen.

## Characters and interviews

Every appearance requires a stable `entityId`. Use the same entity ID when the same person reappears in another chapter; their memory then belongs to one NPC actor. Each chapter may activate only one appearance of that entity. `mind.identity`, when present, must match `entityId`. Each active appearance needs an explicit `navigation.characters[appearanceId]` position in its scene.

Copy an inspector's `appearance` as a starting point for a witness. Height, build, face proportions, clothes, hat and facial hair are authored values. Optional `garment` selects `lounge`, `frock`, `work-jacket`, `police-tunic` or `day-dress`; `hairStyle` selects `short`, `chignon`, `braided-coil` or `pinned-plait`. The latter three represent long hair dressed and pinned up. `neckwear` supplies the civilian tie or neckcloth colour. Omitted styles retain the default coat or dress and short hair or chignon. Continue to set `dress: true` for dress-wearing characters. Reed and Ellis are the default roles; other story packages can define their own two roles.

Each witness has a `greeting`, `topics` and a location. Its optional `portrait` references an image ID for the People page. List its ID in each chapter where it appears. Reuse an ID to retain the conversation record; use a distinct character ID for a later visit that needs separate testimony. Cutscene actors can reference any registered character independently of the chapter's interview cast.

A `mind` enables free-form spoken conversation when the server is configured. Give it `identity` (shared across appearances), `persona`, `manner`, `goals`, `voice`, `background` and `knowledge`. Optional `model` overrides the character model. These profiles are private server data, assembled with conversation memory at each turn.

Write the direction for the appearance, not for the person. Two appearances share an `identity` so their conversation memory carries over, but a witness met before a death and questioned after it wants different things and sounds different; give each its own `persona`, `manner`, `goals` and situated `background`. `persona` is who this person is in this scene, `manner` is how they speak — register, sentence length, what they do when uncomfortable — and `goals` are what they want from this conversation. Keep all four in the character's own world: the performer is told never to mention the machinery, so direction that refers to disclosure stages, topics or the director contradicts its own instructions. Leave gated secrets to `knowledge`, including facts that would reveal a character's guilt.

Each knowledge entry has an `id`, a stable `topicId` used for progress tracking, `subject`, declarative `facts`, and a `when` disclosure condition. It can carry the common story gates, `requiresEvidence`, `requiresPresented` (acceptable attached exhibit IDs), `afterUnsuccessfulTopic`, an evidence `reward` and a persistent `choice`. Write facts and their uncertainty or attribution, not a mandatory question or answer. A model may converse without selecting any disclosure; Jev tracks the eligible facts actually communicated across replies and both investigators for the same NPC appearance. An account earns its reward once all its facts have been established; partial replies remain in its attributed testimony. Profiles must not put gated secrets in unconditional background or personality text.

Optional `mind.disclosures` entries contain a `description`, literal `terms`, an `afterEvidence` ID and a player-facing `message` for facts the player must not disclose prematurely. Models cannot bypass physical inspections, evidence gates, deductions or reports. See [interviews](interviews.md).

The existing `topics` and branches retain deterministic story-rule fixtures and stable progress IDs. They provide authored conversation menus alongside optional live voice. Their lines are not substituted for failed generated dialogue. `performance: "verbatim"` applies to the deterministic authored path; live dialogue instead validates the corresponding knowledge facts.

Branches contain `text`, optional alternating `turns`, an evidence `reward`, and an optional persistent `choice`. Interview turns use `speaker: "investigator"` or `"witness"`. Subtitles appear one turn at a time; missing voices use **Continue**. Put every decisive fact in the authored dialogue and evidence, rather than expecting the engine to infer it.

A topic with `documentId` is a direct handover: this field refers to the **evidence ID**, whose own `documentId` points to a paper in `documents`. Its success branch supplies the handover wording and matching reward. This skips the response-choice exchange. Use `requiresEvidence`, the common gates, or `afterUnsuccessfulTopic` to reveal additional topics.

Interviews allow recovery from unsuccessful answers by default. Set the character's `repeatable: false` for one attempt per topic. Set `requiredTopics` when all particular successful answers must be recorded before that interview counts toward chapter completion. Avoid mandatory one-attempt success gates without an authored recovery route.

## Papers and physical evidence

An evidence entry has a title, description, detail, provenance, location, `kind` (`object` or `testimony`) and zero-based `chapter`. It may reference an `image` or `documentId`.

A document has a title, format and one or more pages. Each page references an illustrated `artwork` and supplies a heading with paragraphs, fields, tables, signature or marginalia for the readable overlay. Original images and transcription must agree. The shared reader preserves mode across documents and visits. Follow [the paper direction](art/paper-documents.md); don't replace illustrated originals with styled text cards.

An object names its model, site and hotspots. Each inspection step has an ID, label and observation; it can require earlier steps, evidence, or both investigators at `togetherAt`. Use `blockedMessage` when the reason matters to the story. `views.initial` gives its initial image. `views.steps` maps observations to image IDs and percentage coordinates for their inspection markers. Observations are withheld from the case view until recorded. Inspection actions appear on the initial artwork, or on the artwork of their last prerequisite step. Position each marker on that source view, not on the resulting detail image. Players can return to other reachable views and revisit recorded details. Keep observation text to visible facts; it appears only in the optional Descriptions control.

Object `evidence` entries specify the reward ID, chapter, required steps and `reviewAsObject`. A physical object can produce several discoveries, including a paper opened from inside it. Keep the object available until all required steps can be completed. Decorative objects belong in scene `props`, not evidence.

An alternative witness lead does not mark a paper source as inspected. Recorded steps remain available for reinspection while any reward from the current or an earlier chapter is still uncollected, including document rewards. `reviewAsObject` controls how recovered evidence is reviewed; it does not prevent later recovery.

An object's reward chapter is its earliest discovery stage. Missed rewards remain available in later stages that retain the object's site and hotspot; future rewards remain withheld. Include earlier ordinary hotspot evidence in the later chapter's `clueIds` when it should remain recoverable.

A deduction accepts a pair in `requires`, with optional `alternatives`. Its question appears on the Case Map; explanation and the successful pair are revealed after solving. To require reconstruction, add a `reconstructions` entry with the same deduction ID, accepted pairs, labelled events, the correct `order`, instructions and failure feedback. Event order in `events` is the initial arrangement players see. The server checks the submitted sequence; the correct order is not sent as part of the puzzle.

## Cutscenes and sound

A cutscene has a location and an ordered list of steps. Each step is one turn:

```json
{
  "kind": "shot",
  "speaker": "reed",
  "text": "The line approved in the script.",
  "camera": { "position": [3, 2.6, 6], "target": [-0.9, 1.4, 1] },
  "actors": [
    { "id": "reed", "position": [-1.1, 0, 1], "heading": 1 },
    { "id": "ellis", "position": [1.1, 0, 1], "heading": -1 }
  ]
}
```

Use `kind: "card"` for a title and text. Either kind can reference an `image`. A shot requires camera position and target, and can stage any registered actors. Without `actors`, it uses the two inspectors. Heading is in radians. `speakerName` optionally overrides the displayed name. An optional `clip` references a voice record with exactly matching text.

Register recordings in `voices` using `{ src, text, durationMs }`; all files live in the story's assets directory. The reader checks text against the recording manifest before playing it. A missing or mismatched interview clip falls back to reading. Cutscene clip references must exist and match during validation. The optional `music` path supplies the background loop. Neither playback path needs an external generation service.

Interview voice IDs follow the existing convention:

- `<witness>-greeting`, `<witness>-<topic>-claim`.
- `detective-<inspector>-<witness>-<topic>-ask` and the selected approach instead of `ask`.
- `<witness>-<topic>-<approach>`; unsupported proof uses `unsupported`.
- Further witness turns append `-turn-<index>`; investigator turns use `detective-<inspector>-<reply-clip>-turn-<index>` (zero-based).

Record or generate audio from the final script, measure durations and register it in this package. Recording production is separate from playback and has no provider-specific engine dependency.

## Extending the engine

Add new reusable behavior in `shared/game`, its server handling in the case authority, and its renderer in the relevant frontend module. Add the schema and authoring fields together, with a behavior test using the neutral fixture. Keep plot names and evidence IDs out of components and validators.

The framework supports staged cuts, images, dialogue and basic actor motion. It does not include a timeline editor, scripted walking paths, animated object exchanges, door choreography, video playback, or a visual story editor. A script requiring these actions needs an explicit engine extension. Plot writing, final artwork, scene models, voice production and two-player pacing tests remain story work.

## Investigation guidance

A chapter may provide `guidance: { introduction, leads }`. Each lead has an `id`, `title`, `detail`, optional `location`, `character` or `hotspot` target, and `completeWhen` with an `evidence` or `deduction` ID. Optional `hints` are ordered from general direction to a specific next step. Leads accept the common story gates; gate clue-bearing titles and hints so they cannot disclose later discoveries. Only available leads and the requested hint are sent to players. Matching deduction questions follow the lead gates.

The Case Map shows the chapter purpose, open leads, established findings and attributed new discoveries. Players can follow a lead, claim it for coordination or request the next hint. Claims do not restrict actual investigation. Completed leads collapse; unread discoveries remain marked until explicitly reviewed.

Keep `requiredEvidence`, `requiredDeductions` and `requiredInterviews` to the work needed for the chapter's conclusion. Incidental inspections and optional conversations need not block progress. Progress counts those authored requirements, and the opening guidance should explain the next action and how to conclude the stage. Changes to saved-case structure or story progress require a story version bump.
