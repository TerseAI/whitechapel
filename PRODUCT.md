# Whitechapel

## Purpose

A detective game for one person or two people in co-op, built around investigation, witness interviews and shared deductions. Historical research focuses on Whitechapel in 1888. Fictional dialogue, evidence and resolutions must remain distinguishable from the historical record.

## Platform and scope

The game runs in a browser. React and TypeScript provide the interface, Three.js with React Three Fiber renders scenes, and an Express gateway connects clients to durable-actors for authoritative saved state.

The repository provides an empty story and a reusable framework. Story packages supply plots, locations, characters, documents, physical objects, media and cutscenes. Chapter count and playtime depend on the authored story and two-player playtesting.

## Cooperative play

In co-op, two human players must choose different inspectors and be ready before a case begins. They can explore separately, share discoveries and see each other in a scene. Only one investigator can interview a given witness at a time. Both must agree on reports; disconnection does not count as agreement.

Solo cases use one chosen detective. Reports, scene acknowledgements and joint inspections require that player only; evidence, observation and location prerequisites still apply. Case mode is fixed when created, saved across reconnections, and solo cases cannot accept a partner.

Inspector Reed is short and stocky with a large moustache. Inspector Ellis is very tall with sideburns. These are the default roles; their appearance provides a clear distinction without an elaborate backstory.

## Investigation principles

- Give both partners useful work and a reason to discuss their discoveries.
- Make conclusions follow from observable evidence and specific testimony.
- Give unsuccessful approaches understandable consequences and preserve a route to essential findings.
- Write witnesses as people with their own concerns.
- Keep the women’s lives visible in the historical context; appearance and social identity are not evidence of guilt.

## Access and presentation

Provide subtitles, keyboard-accessible controls, readable documents, reduced motion and no timed deductions. Use atmosphere, testimony and objects to convey a crime without requiring graphic imagery.

See [framework behavior and limits](docs/framework.md), [story authoring](docs/story-authoring.md), and [historical research](docs/history.md).
