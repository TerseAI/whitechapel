# Geography contract

The default story has no map. Each package supplies `sites` and an optional `map`, using the types in `shared/geography/atlas.ts`. Every scene needs a `siteId`. Repeated location IDs keep the same site across chapters; several rooms can share a site.

Sites record their name, address, precision, sources, placement notes, review date and optional pixel coordinate. Points are measured from the map image's upper-left corner. They are image registrations, not distances or walking times.

Historical sites need sources and a review date. A historical map needs its source attribution, image dimensions and SHA-256 hash. Validation checks the hash against the actual file, along with every pin's bounds. Replacing a source map requires reviewing all registered points and updating the hash. Do not squeeze a place beyond the extract into its bounds.

Invented addresses cannot have pins on historical maps. Use `kind: "fictional"` and `point: null` for fictional interiors in a historical setting. A fictional map may contain fictional pins. Players travel directly through the destination list; there is no separate district-map screen. Optional map records remain part of story geography and validation.

Research and register the relevant sites in each story’s package. Kelly & Co.'s 1888 Post Office Directory map remains a possible historical source: [BnF catalogue and viewer](https://gallica.bnf.fr/ark:/12148/btv1b530605145). Historical map pins describe streets or site vicinities, not surveyed doors or verified interior plans.

Run `npm run story:check -- stories/<id>/story.json` before play. `npm run build` validates the selected story too. With `npm run dev:framework` running, `npm run test:map` exercises travel destinations and responsive views using the neutral fixture. See [story authoring](../story-authoring.md).
