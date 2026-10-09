# Contributing to Whitechapel

Use Node.js 22 and `npm ci`. See the [README](README.md) for local play and the
[repository conventions](AGENTS.md) before editing. The default starter is empty;
use `npm run dev:sixth-murder` to play the included story.

Keep changes focused. For behavior changes, add a failing behavior test before
implementation, then run `npm test` and `npm run build`. Story changes also need
`npm run build:sixth-murder` and `npm run test:sixth-murder:rules`. Interface changes
need the relevant browser check documented in the README or feature contract.
Live AI checks use paid services; the normal test suite needs no API keys.

The static-copy plugin uses a Chokidar 4 override to avoid the older watcher's
vulnerable brace parser. Keep its targets as explicit file paths in
`vite.config.ts`; Chokidar 4 does not expand glob patterns.

Keep plot details and production material inside their story package. Retain
asset sources, licenses and generation provenance. Do not contribute private
configuration, credentials, copied game scripts, unlicensed media or recordings
that impersonate a real person without permission. Research links are references,
not permission to redistribute the linked material.

Describe the resulting behavior and validation in pull requests. Contributions
to original project material use the [MIT license](LICENSE); third-party material
must identify its own compatible redistribution terms in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
