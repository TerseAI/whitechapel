import { createRequire } from 'node:module';

// The actor compiler bundles CommonJS provider dependencies into ESM without a Node require shim.
(globalThis as typeof globalThis & { require?: NodeRequire }).require ??= createRequire(import.meta.url);
