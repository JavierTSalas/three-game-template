import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyInputs, FILES } from './init.mjs';

// The classic template failure mode is "broke at init time" — this is the one check
// that guards it. (This file is deleted by init.mjs along with itself.)
test('applyInputs stamps every token and the package name', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const tmp = mkdtempSync(join(tmpdir(), 'tgt-init-'));
  for (const f of FILES) {
    mkdirSync(dirname(join(tmp, f)), { recursive: true });
    copyFileSync(join(root, f), join(tmp, f)); // throws if a listed file is missing — good
  }

  applyInputs(tmp, { id: 'rollabout', title: 'ROLLABOUT', author: 'javier', bg: '#0e1420', accent: '#e07a5f' });

  for (const f of FILES) {
    const s = readFileSync(join(tmp, f), 'utf8');
    assert.doesNotMatch(s, /__(?:GAME_ID|GAME_TITLE|AUTHOR)__/, `${f} still has tokens`);
  }
  assert.equal(JSON.parse(readFileSync(join(tmp, 'package.json'), 'utf8')).name, 'rollabout');
  assert.match(readFileSync(join(tmp, 'scripts/splash.js'), 'utf8'), /#e07a5f/);
  assert.match(readFileSync(join(tmp, 'scripts/player.js'), 'utf8'), /0xe07a5f/); // JS hex form too
  assert.match(readFileSync(join(tmp, 'manifest.json'), 'utf8'), /#0e1420/);
  assert.match(readFileSync(join(tmp, 'index.html'), 'utf8'), /ROLLABOUT/);
});
