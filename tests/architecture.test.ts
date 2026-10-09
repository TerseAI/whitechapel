import assert from 'node:assert/strict';
import { isBuiltin } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));

for (const layer of ['frontend', 'backend', 'shared']) {
  test(`${layer} depends only on its own code and shared modules`, () => {
    const program = layerProgram(layer);
    const violations: string[] = [];
    for (const source of program.getSourceFiles()) {
      const path = relative(root, source.fileName);
      if (path.startsWith('..') || path.startsWith('node_modules' + sep)) continue;
      const owner = path.split(sep)[0];
      if (owner !== layer && owner !== 'shared') violations.push(path);
      if (layer === 'backend') continue;
      for (const imported of ts.preProcessFile(source.text).importedFiles) {
        if (isBuiltin(imported.fileName) || /^(durable-actors|terse-sdk|express)(\/|$)/.test(imported.fileName)) {
          violations.push(`${path} imports ${imported.fileName}`);
        }
      }
    }
    assert.deepEqual(violations, [], 'Keep runtime-specific dependencies inside their owning layer.');
  });
}

function layerProgram(layer: string) {
  const file = resolve(root, layer, 'tsconfig.json');
  const config = ts.readConfigFile(file, ts.sys.readFile);
  assert.equal(config.error, undefined, `Cannot read ${layer}/tsconfig.json`);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(file));
  assert.deepEqual(parsed.errors, []);
  assert.ok(parsed.fileNames.length, `${layer} must contain source files`);
  return ts.createProgram(parsed.fileNames, parsed.options);
}
