# Paper documents

Each paper combines an illustrated original with a readable transcription through the shared document reader.

## Material and writing

Office correspondence uses pale ivory-grey paper, restrained fibres, natural folds, subtly uneven edges and modest handling wear. Blue-black cursive should have connected letters, varied strokes, human spacing and a distinct signature. Show the whole sheet from above with a narrow charcoal surround.

Match the paper to its author, time and use. Avoid orange parchment, burnt edges, excessive stains, decorative quills, unexplained wax seals and modern interface symbols printed into the original. Registers, letters, newspaper cuttings and sketches need distinct compositions. Preserve recurring handwriting.

System cursive fonts on flat textured rectangles are not finished manuscript artwork. Use period originals to establish the writing hand, margins, ruling and sign-off. Printed ephemera needs period typesetting and printing texture; a work account, railway ticket and newspaper should not share a letter template. Damage must have an authored cause, and papers used in the period should not look aged by another century. Keep reviewed image originals protected from schematic rendering scripts.

Write each document before creating artwork. Establish its author, recipient, date, purpose and available knowledge. Briefings come from the investigators' supervisor, with concrete instructions and a reason for sending them. Keep gameplay terminology and omniscient plot summaries out of correspondence.

## Authoring and production

1. Put canonical text into the story's `documents` catalogue. Record every required visual clue before drawing it.
2. Produce the complete illustrated prop using the built-in image-generation workflow or appropriate open-source tools. Adapt the material direction to the document’s author and format.
3. Inspect the image at full size against the canonical wording. Check names, dates, numbers, signatures, corrections and spatial relationships. The transcription is not permission to ship incorrect information in the original.
4. Save the image inside the story's `assets/documents/` directory. Register its actual dimensions in `assets`; retain prompts and provenance with that story's authoring material.
5. Reference its image ID from the page's `artwork` field. Use `StoryDocumentReader`, which wraps the shared `DocumentReader`, for originals, transcription, pages, zoom and continuation controls.
6. Verify both modes at desktop and phone sizes. Check clues in the image and accessible wording, not only compilation.

Generated props are fictional illustrations, not archival facsimiles. Research unfamiliar historical formats before claiming accuracy. The National Archives' [police letter and memorandum examples](https://cdn.nationalarchives.gov.uk/documents/education/jacktheripper.pdf) provide format references.

## Reader contract

New players see the readable transcription for written pages. Photograph fronts contain no transcription: show the image with a Turn over action, and offer the writing on the reverse through the usual reader. Viewing a photograph does not change the saved reading preference. **View original** reveals the artwork; **Read transcription** returns to the overlay. The preference persists across papers, pages and visits through `investigation.documents.view`, with an in-memory fallback when storage is unavailable.

Transcribe only words on the source: headings are optional and must actually appear on the paper. Keep visual descriptions behind a separate Visual description control outside the sheet, using observable details rather than interpretations or production notes. Preserve image aspect ratio, selectable text, keyboard access, original zoom and page navigation; reset zoom when changing pages. Controls stay outside the illustrated sheet. Briefings say **Begin the enquiry** on first viewing and **Continue the enquiry** on return. Physical marks used as evidence should be revealed through authored inspection steps and described accessibly at the same point.

The Case Map uses the same registered images. Documents stay with their custodians or at authored scene hotspots. Puzzle rules belong to the shared domain and case authority, not document components.

Run `npm run story:check` and `npm run build`. With `npm run dev:framework` running, `npm run test:documents` checks the reusable reader and shared discoveries. The neutral fixture uses explicitly labelled schematic SVGs only for automated tests; they are not production artwork.

See [story authoring](../story-authoring.md) for the data contract and extension points.
