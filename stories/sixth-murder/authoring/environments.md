# Environment production

Eight self-contained GLB sets supply the case’s rooms and yard. `scenes.json` contains the model catalogue, shared sites, location presentation and navigation, plus physical-object model bindings. The story generator merges these with the authored story. Run:

```sh
node stories/sixth-murder/authoring/generate-environments.mjs
node --import tsx --test stories/sixth-murder/authoring/environments.test.mjs
node stories/sixth-murder/authoring/review-environments.mjs
```

The final command uses installed Chrome to render all eight sets and writes production proof images under `review/`. `environment-preview.html` uses the engine’s lighting palette and camera lens. These proofs review models independently; the live two-player playtest remains necessary for witness, hotspot and subtitle layout.

The scenes use Three.js geometry and its glTF exporter. All geometry and materials are authored here; there are no downloaded model dependencies, external model resources or third-party image textures. Material groups merge into 11–15 draw calls per environment. Floorboards, iron fastenings, cobbles, furniture joinery and varied surface colours are geometry. Lamps carry `KHR_lights_punctual` lights. The engine supplies shared daylight, fog and shadows. Set dimensions suit the existing constrained camera: front walls and forward ceiling beams are cut away, and two investigators have a clear central approach aisle.

## Continuity

The Lantern geometry preserves a low rear extension, 1.9-unit broad landing, three shallow steps rising only 0.45 units and a short trunk route. The yard’s Baines window, upper steps, washhouse and discovery corner are registered in `spatialContract`. The Baines room includes the same yard geometry rotated around that window; its projecting washhouse obstructs the discovery corner while leaving the upper steps visible. No body, wound illustration or abandoned scarf is modelled. The trunk remains by the service entrance; the horse stays outside the playable yard. The common-room set is reused throughout; stage-specific story objects supply the changing props.

Nora’s room has a stripped bed, displaced clothes, rug, empty candlestick stand and washstand. The brass fastening is at floor level beneath the washstand; the model does not name its origin. The workshop contains garment work, cloth rolls, scissors, thread, a treadle machine and dress form. Arthur’s hearth is unlit and contains concealed charred material; recovery and comparison occur through the object inspector. Alden’s workroom has a firmly closed adjoining door. The station includes a chair aligned to its seated witness at `[0, 0, -2.8]`, with the table beyond the clear approach space.

All invented settings have fictional site records and null map points. Arthur’s invented lodging is the upstairs room above Bell’s boot-repair shop, off Commercial Road. The historical Commercial Street station also has no map pin; rooms are interpretations, not surveyed plans.

## Historical basis and limits

- [Howard J. Goldsmid, *Dottings of a Dosser* (1886), chapter 2](https://victorianlondon.org/publications6/dosser-02.htm), reviewed 12 September 2026: period first-person description supports shared tables, benches, cooking fires, crockery, boarded floors and plaster. The Lantern is a different invented establishment. Goldsmid’s hostile commentary on lodgers is not adopted as characterization.
- [Historic England, Former Police Station, list entry 1065207](https://historicengland.org.uk/listing/the-list/list-entry/1065207), reviewed 12 September 2026: supports the Commercial Street station’s date and exterior sash-window vocabulary. It does not document this interview room or its furnishings.
- The repository’s [scene research](../../../docs/scene-research.md), [geography contract](../../../docs/geography/README.md) and active [plot overview](../../../docs/the-sixth-murder-plot-overview.md) govern the fictional room relationships and evidence. Working-room furnishings and object arrangements are artistic interpretations of ordinary late-Victorian domestic and trade use.

## Verification

`environments.test.mjs` exercises the actual shared half-unit navigation from both spawns to every authored witness and clue. It verifies the window’s restricted sightline and short route, self-contained GLB resources, material and file-size budgets and practical lights. The authoring script is deterministic; regenerating models preserves locations and site identity across chapters.
