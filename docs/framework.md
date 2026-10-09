# Investigation framework

Whitechapel loads an empty story by default. Its engine supports authored investigations for one player or two human players in co-op.

See [story authoring](story-authoring.md) for package structure, progression, assets and examples.

## Case modes and multiplayer behavior

A new case starts with an explicit solo or co-op choice and opens in a lobby. In co-op, two human players must select different inspectors and be connected and ready. Selection is fixed after play begins. Reconnecting retains discoveries and character selection; there is no automated partner.

Solo cases use one chosen inspector, who begins without a second player. Their own vote advances reports, continuation and cutscenes. Joint inspections require that player at the authored location, with all evidence and observation prerequisites retained. The authority persists the mode at creation, rejects extra members in a solo case and never converts a co-op case when someone disconnects. Solo play still requires a connection to the actor service.

The lobby shows whether each player is choosing, ready or reconnecting. Players can cancel readiness while waiting. A lobby disconnection clears readiness, so returning players confirm again before starting. The invitation opens while the partner is absent and collapses when they connect; it remains available to reopen. Copying includes a manual selection fallback when clipboard access is unavailable.

**Reset game** is available in the lobby, while reconnecting and in the investigation footer. The landing page only offers starting or joining a case. After confirmation, reset clears Whitechapel's saved case credentials, briefing and discovery markers, and preferences from this browser. It removes the invitation from the URL and returns to the entrance. Other applications' local storage and cloud cases are untouched. This browser loses access to its previous cases; to restart a co-op enquiry, create a new case and send a new invitation. Cancel or Escape leaves the saved data in place.

Movement and waves use a direct browser-to-scene WebSocket. Other gameplay actions and shared progress use a separate case WebSocket. The gateway authorizes connections and handles AI generation. Reconnection obtains a fresh grant and restores the actor snapshot.

Players can investigate separately. Evidence, observations, witness replies and established connections are shared. A witness can speak with one investigator at a time. In co-op, both players must agree on reports even during temporary disconnection.

Detectives share their facing angle with movement updates, including turns made while stationary and their final turn toward a witness. Both clients retain that direction when reopening a scene or reconnecting.

Choose **Wave** or press **G** while exploring to turn toward the camera and wave to your partner. Both players see the gesture. Walking cancels it immediately; conversations and cutscenes disable it. Reduced motion uses a held raised hand.

Cutscenes persist their run, current turn, readiness, acknowledgements and skip votes. In co-op, both players load and acknowledge each turn. A solo player acknowledges each turn and can skip a scene alone. Disconnect pauses progress. Stale or duplicate commands cannot skip ahead. **Skip scene together** requires both votes. Missing, muted or failed voices fall back to reading one subtitle at a time. Reduced motion disables camera transitions.

## Empty shell and test fixture

`stories/starter/story.json` has one empty interior, the default Reed/Ellis roles and a joint Finish action. It has no campaign characters, clues, documents, objects, maps, cutscenes or recordings.

`npm run dev:framework` selects `tests/fixtures/framework/story.json` and creates fresh temporary storage on ports 5288, 5289 and 7288. The fixture contains three stages, six destinations, an interview, a two-page document, a two-step illustrated object and a reconstruction. It is not bundled into the default story. Backend, shared-code, story and story-asset edits restart the services and reload the browser; Enter in the dev terminal triggers the same restart. These reloads retain the current storage directory. Ctrl+C stops the preview; a new launcher session creates fresh preview storage.

With the preview running, `npm run test:framework` uses two Chrome profiles to check the multiplayer flow. It saves screenshots in `.qa/framework/`. `STORY_PATH` can select another story in this launcher too.

`npm run test:solo` checks solo entry, membership protection, scene advancement, inspections, reports, the complete fixture and saved completion, with desktop and phone captures. Against another story it checks entry and reconnection. `npm run test:sixth-murder -- --solo` plays through every chapter of The Sixth Murder against its preview; use `AI_MODE=authored` on the preview for deterministic checks.

`npm run test:lobby` checks keyboard selection, invitation copying and its fallback, partner arrival, readiness cancellation, reconnection and the joint start. It also checks both entrance pages at desktop, tablet and phone sizes, saving screenshots in `.qa/lobby/`. Set `FRAMEWORK_ORIGIN` when using a different preview port.

`npm run test:reset` checks local reset against the framework fixture: confirmation, Cancel/Escape, focus return, blocked storage, clearing game data, removing the invitation URL, reload, fresh case creation, partner preservation and recovery while disconnected. It captures the lobby, confirmation and game footer at desktop and phone sizes in `.impeccable/review/`.

For detective movement, start the preview with `STORY_PATH=stories/starter/story.json npm run dev:framework`, then run `node scripts/movement-sync-check.mjs`. This checks both detectives’ facing across walking, stationary turns, Case Map visits and browser reloads. Set `FRAMEWORK_ORIGIN` when using a different preview port.

Against that same starter preview, `node scripts/movement-performance-check.mjs` checks that keyboard walking does not schedule a React scene commit every animation frame. It reports scene commits and frame timings from headless Chrome. `tests/movement.test.ts` covers delayed and uneven position arrivals, bounded prediction, late stops and travel resets.

Set `FRAMEWORK_PORT` to choose a separate web port; the gateway uses the next port and the actor runtime uses that port plus 2000. `FRAMEWORK_DATA_DIR` selects persistent storage instead of a new temporary directory. The `dev:sixth-murder` command uses this launcher with its own story, ports and saved-case directory.

## Content boundaries

The selected story is validated and loaded at startup. `/api/story` exposes presentation metadata and media catalogues; it excludes chapter definitions, evidence catalogues, dialogue branch definitions, deductions, reconstructions and endings. Treat media metadata as public presentation, not secret storage. Registered recordings and images are static assets.

The case authority sends collected evidence and its document content, available topics, observed object details, and established connections. Collected testimony also includes the actual successful exchanges that produced that record, with speakers identified. Earlier interview records remain saved privately after a stage changes; only the active cast appears as witnesses. Reconstruction prompts omit answer order and accepted pairs. Saved cases carry the story ID and version. Changing either requires a new case.

The frontend renders generic sets or authored GLB scenes, authored props and appearances, the shared document reader, physical inspections, interviews, cutscenes and the Case Map. Application components are independent of story content. New model types or gameplay actions require explicit schema and engine extensions.

Scene objects use compact inspection markers. Hovering or keyboard focus reveals their names; the labels do not intercept clicks on nearby witnesses. Physical inspection fills the panel with the authored artwork. Reachable actions appear on the image, with labels on hover, keyboard focus or touch devices. Prerequisite steps stay hidden until reachable; cooperation and evidence locks retain their explanations. Completed details can be revisited, and recorded descriptions are available behind Descriptions rather than a permanent observation panel. Discoveries still belong to the shared Case Map.

Character name tags sit above the model’s headwear, accounting for height, face proportions and seated posture.

Outdoor scenes combine depth fog with drifting ground and upper haze. Nearby interview faces stay clear while distant walls fade; reduced motion freezes the drifting layers. Cutscenes set their authored camera before voice playback begins.

## Authoring and engine limits

Write and review each scene’s script and evidence flow, then author its story package. Create the final room sets, papers, object illustrations and recordings. Stage the cutscenes and playtest the length with two unfamiliar players.

Staged shots and title cards are supported. Scripted walking, animated handovers and doors, video playback and a visual timeline editor are not implemented. A story requiring those actions needs an explicit engine extension.

## Investigation guidance and discovery records

The Case Map presents the chapter objective, questions, established findings and available leads. Leads can navigate to a place, witness or object; co-op players may claim them to coordinate, without locking the other investigator out. Progressive hints reveal only the requested level. Hints and assignments are saved in CaseActor, and completed leads remain available in collapsed form.

Required progress counts the chapter’s authored evidence, deductions and interviews. Optional inspections and conversations do not block a report. New discoveries identify their finder and remain unread in each investigator’s browser until explicitly marked reviewed. Interviews keep authored topic and response choices alongside optional live microphone conversation, and collected discoveries link back to the Case Map.
