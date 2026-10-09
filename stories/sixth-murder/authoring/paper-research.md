# Paper originals: historical references and production

These are fictional props used in November 1888, not facsimiles or claims that the named people wrote historical documents. Canonical wording and clue content remain in `documents.mjs`.

## References

- [The National Archives: police letters, 1888–89](https://cdn.nationalarchives.gov.uk/documents/education/jacktheripper.pdf), especially MEPO 1/48, Charles Warren to James Fraser, 9 October 1888 (PDF pp. 7–8), and MEPO 1/55 (pp. 11–12). These establish contemporary correspondence structure: address/date, direct salutation, running paragraphs and a personal sign-off. They inform the police letter and professional manuscript treatment; they do not authenticate our invented orders or surgeon's report.
- [The Illustrated Police News, 22 September 1888](https://victorianweb.org/periodicals/ipn/6.html), period front-cover scan hosted by Victorian Web. Reference for emphatic newspaper lettering and line-engraved illustration. Our much shorter fictional article uses a compact column layout; it is not an actual issue, and its illustration remains explicitly an artist's impression.
- [Science Museum Group: Edmondson ticket history and dimensions](https://collection.sciencemuseumgroup.org.uk/objects/co8918294/brighton-no-2-platform-ticket). Small rectangular cardboard tickets, typically 30 × 57 mm, were already widespread by 1842. The collection object itself is later; it supports the format, not a specific 1888 Great Western fare, colour or imprint. Our ticket is a simplified fictional example. The passenger's name and intended departure remain handwritten on the separate sleeve.
- [Victorian garment manufacturer's manuscript volume](https://dev.richardfordmanuscripts.co.uk/catalogue/14437), E. J. Walker: ruled manuscript records with costings, sizing and wage tables. This dealer description supports a modest ruled-account visual treatment; our two-entry work card is an authored adaptation, not a documented workshop form.

## Material and handwriting decisions

The game shows papers in use, not museum objects browned by a further century of storage. Office sheets use cool ivory-grey paper and restrained wear. Private correspondence uses modest stationery and less formal hands. Abberline's flowing hand, Alden's narrower professional script and the sister's simpler roundhand differ. Maggie's closing letter uses her earlier work note as a handwriting reference. The work record combines printed labels, ruling and handwritten entries. Photo reverses use stiff mounting card and preserve their inscriptions and missing-name clue.

The newspaper uses letterpress-like type and a wood engraving. Its hearth counterpart must retain the same edition, wording and scarf image, with fire damage removing the final paragraph. It represents another copy of that issue, not a fragment missing from the common-room copy.

## Reproduction and review

`paper-production.json` records the complete built-in image generation prompts, input references, actual dimensions, canonical-page hashes, PNG/WebP hashes and review notes. The PNG files in `../assets/documents/` are the selected generated masters. WebP files are encoded with ImageMagick at quality 94 without resizing or retouching.

Inspect every generated original against `documents.mjs` before marking it reviewed. Check all text, especially Finch/Vale, dates, quantities, clinical qualifications and the newspaper scarf. Asset hashes identify reviewed files; they do not replace visual inspection. After changing text, revise the original and its provenance together. `render-documents.mjs` preserves reviewed papers and refuses stale or modified originals. It continues to composite the two existing photograph fronts.

Run `node --test stories/sixth-murder/authoring/paper-artwork.test.mjs`, then `node stories/sixth-murder/authoring/assemble-assets.mjs` and `node stories/sixth-murder/authoring/build-story.mjs`. Run `npm run build:sixth-murder` after registration. With `npm run dev:sixth-murder` running, `node stories/sixth-murder/authoring/paper-playtest.mjs` mounts the actual shared reader to check every document at desktop and phone sizes and saves screenshots under `.qa/papers/`. `node stories/sixth-murder/authoring/newspaper-playtest.mjs` checks the tabletop, reader and Case Map together. Originals retain their measured aspect ratios; the shared reader still opens with the transcription and remembers the player's choice.
