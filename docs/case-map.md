# Case Map

The Case Map holds shared evidence, questions and established findings on a fixed board. A compact objective opens the chapter guidance. Questions and open leads appear before the discovery recap so the next action remains visible on phones. Leads offer navigation, optional shared assignments and progressive hints; assignments do not restrict investigation. New discoveries identify their finder and stay unread until explicitly marked reviewed. Hints and assignments persist in the case; unread state belongs to each investigator’s browser.

- Papers stay pinned in place. No paper movement, canvas panning, zoom gestures, zoom buttons or fit controls. The layout adapts to the available screen; a narrow or short screen scrolls vertically through the physical board without scaling the camera.
- Give the board the available space without an additional title block. Places to visit starts collapsed whenever the Case Map opens; the compact Places button expands or collapses it. Questions remain visible; on narrow screens they occupy a compact panel above the board, with their own vertical scrolling. Earlier chapters remains available in the board's instruction row.
- Use the illustrated originals from the selected story’s document catalogue. Titles appear on hover and keyboard focus; Read opens the existing original/transcription reader. Touch users can tap two papers or use their visible Read/Connect controls.
- Players drag from anywhere on a paper to another paper to draw red thread. A temporary thread follows the pointer; the papers remain stationary. Connect on two papers remains available for keyboard use. Only the backend determines whether a pair establishes a finding. Failed attempts show a prominent explanation and retry instruction; they do not add a permanent thread.
- While a thread is being dragged, hide the paper's Read/Connect controls and disable their pointer events. Otherwise these hover controls intercept drops near the bottom of a paper, silently cancelling valid links. Restore them when the gesture ends.
- A successful connection stays visible and produces a dismissible celebration with its title and explanation. Partner discoveries and route reconstruction use the same celebration. Detailed celebrations appear only on the Case Map; findings made while exploring wait until the map is opened. Existing connections do not celebrate again on reload.
- Review this chapter sits above the board, with question progress and a clear ready-to-review state. Completed chapters retain a completion marker there after reopening the game.
- Confirmed server progress plays distinct cues for an established link, readiness for review, and an accepted chapter conclusion. A chapter completion panel shows the accepted finding, then introduces the next supervisor note. Saved progress does not replay celebrations on reload. Opening a document plays a paper rustle; Sound effects has its own persisted volume control. Transitions respect reduced motion.
- Questions and established findings live on the Case Map. Keep exploration focused on movement and witness interaction.
- New players see the readable document overlay. The selected original/transcription mode persists across all papers and visits.
- Briefings are supervisor correspondence. First viewing says “Begin the enquiry”; returning says “Continue the enquiry”. Seen state is per case, investigator and chapter.

## Ownership and persistence

In co-op, two human players must join, choose different detectives and be ready before play begins. Both must agree on reports, including after a temporary disconnection. See [framework behavior](framework.md).

`frontend/src/case-map/` owns the board, paper nodes, questions, report UI and celebration. React Flow supplies connection gestures with a locked viewport. `board-layout.ts` lays papers out in acquisition order; no saved camera or draggable positions are read or written. `RedThread.tsx` draws the cord and its small shadow between the brass pins.

The physical board uses generated mahogany and olive baize artwork, soft paper shadows, restrained rotation and red cord. See [the exact built-in image-generation prompt and provenance](art/case-board-prompt.txt). The [National Trust's surviving mahogany and green-baize furniture](https://www.nationaltrustcollections.org.uk/exhibition/desks-for-a-clerk-and-an-artist) informs the material direction; the [National Archives' 1888 police correspondence](https://cdn.nationalarchives.gov.uk/documents/education/jacktheripper.pdf) provides paper format references. The red-thread billboard is a cinematic interpretation, not a documented reconstruction of police practice.

The backend Durable Object persists `connectedEvidence`. `backend/src/cases/connections.ts` exposes only established deductions and their actual evidence pairs. Never send unsolved answer pairs to the frontend to arrange the board.

The server’s report agreement uses room membership, not presence. A co-op case requires exactly two members to choose the same conclusion; an offline partner still counts. An explicitly solo case requires its one member’s conclusion. Incorrect conclusions clear votes and leave discoveries intact. Cooperative searches require both investigators at the authored location; a solo case requires its single investigator there. Both modes retain evidence and inspection prerequisites.

Reconstruction puzzles are authored by deduction ID in the story package. Valid connections open a server-supplied sequence prompt; the answer order remains at the authority. Successful connections retain the exact pair submitted by the players. There is no saved-case compatibility fallback.

## Validation

`npm test` checks connection privacy, report agreement, object prerequisites and story validation. With `npm run dev:framework` running, `npm run test:case-map` exercises the neutral story through paper reading, object inspection, a rejected and accepted reconstruction, joint reports, reload and completion. The same check includes responsive lobby, cutscene and map views.

`node scripts/case-map-layout-check.mjs` renders an isolated 47-paper board without creating a case. It checks settled horizontal bounds, visible and scrollable questions, last-row reading, collapsed Places and saved threads at desktop, phone and landscape sizes. Set `FRAMEWORK_ORIGIN` to use a preview other than `http://127.0.0.1:5288`.

See [story authoring](story-authoring.md) for data fields. Evidence without artwork receives an identifiable record marker on the board; paper documents require authored originals.
