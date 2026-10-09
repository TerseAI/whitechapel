# Whitechapel visual design

Whitechapel combines dim Victorian settings, warm gaslight, pale papers and a compact investigation interface. Scene content comes from story packages; the shared shell supplies navigation, reading, interviews and the Case Map.

## Materials and typography

Use blue-black framing, warm lamps, cool ambient light and textured masonry. The shared palette centres on ink `#111d23`, canvas `#101a20`, text `#e7e5df`, gaslight `#d8bc82` and muted text `#aab6b8`. Gold draws attention to actions and focus; it should not fill large reading surfaces.

Bodoni Moda is bundled locally, with Georgia and serif fallbacks. Use it for titles, names and spoken passages. Avenir Next, Avenir and Segoe UI provide platform sans serif fallbacks for controls and status. Keep essential text readable on phones.

The landing page gives the title, a plain description of the co-op game and a generously spaced start action over the story cover. Inspector selection uses flat ink surfaces and square borders. A gold outline and checkmark identify the selected inspector; keep both portraits fully legible when one belongs to the partner. Avoid background glows and colored selection fills on these entrance pages.

Paper varies with its author and purpose. Preserve the texture and physical marks of the illustrated original while supplying a clear transcription. Follow [paper documents](docs/art/paper-documents.md).

## Exploration and people

Let the set carry atmosphere. Keep movement, witness availability and evidence controls clear. Questions and established findings belong on the Case Map. Story-authored silhouettes, clothing and optional portraits identify characters consistently across visits.

Use the same authored navigation coordinates for visible interaction points and server movement checks. Decorative geometry must not conceal a required object or suggest a route the players cannot walk.

## Investigation surfaces

The Case Map is a fixed mahogany and olive-baize board. Papers stay in place while players draw red thread between them. It has no camera zoom or panning; titles appear on hover or keyboard focus. Narrow screens scroll through the board. The sidebar keeps its objective compact and prioritizes questions and leads above the discovery recap; the board retains the remaining screen space. See [Case Map behavior](docs/case-map.md).

Interviews fill the scene with the witness and one subtitle turn. Choices appear between exchanges. Documents use focused reading views with controls outside their illustrations. Transcriptions contain source wording only; visual descriptions stay behind an optional control. Photographs open as images with a Turn over action, preserving the saved transcription preference for written pages. Physical objects fill the inspection view, with small actions on the relevant detail and no numbered checklist or permanent description panel. Descriptions remain optional; recorded views can be revisited. Preserve image proportions, zoom, page navigation and readable transcription.

Cutscenes use staged actors, authored camera shots, cards and images. Text must remain legible against each composition. Both players share the same progress; visual transitions follow the reduced-motion preference.

## Controls and feedback

Use concrete action labels, visible keyboard focus and accessible names when navigation hides its text. Retain native modal focus behavior for dialogs. Closing a surface should return the player to the investigation they were conducting.

Confirmed discoveries and chapter conclusions receive clear visual feedback and distinct sound cues. Errors explain the failed action and how to proceed. Saved discoveries should not replay celebrations on reload. See [interviews](docs/interviews.md) and [assets](docs/assets.md) for audio behavior and provenance.
