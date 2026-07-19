#!/usr/bin/env node
// Birth ritual: stamp your game's identity into the template, then get out of the way.
//   node init.mjs
// Prompts (Enter accepts the default), rewrites the files below, renames README.game.md
// over README.md, and deletes itself + its test. Zero dependencies.
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv, exit } from 'node:process';
import { readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// every file that carries identity tokens or the default palette
export const FILES = [
  'package.json',
  'index.html',
  'index.js',
  'manifest.json',
  'scripts/splash.js',
  'scripts/pause.js',
  'scripts/player.js',
  'scripts/hints.js',
  'CLAUDE.md',
  'README.game.md',
];

const DEF_BG = '#101623', DEF_ACCENT = '#22c4a8';

export function applyInputs(root, { id, title, author, bg, accent }) {
  for (const f of FILES) {
    const p = join(root, f);
    let s = readFileSync(p, 'utf8');
    s = s.replaceAll('__GAME_ID__', id)
         .replaceAll('__GAME_TITLE__', title)
         .replaceAll('__AUTHOR__', author);
    if (f === 'package.json') s = s.replace('"three-game-template"', JSON.stringify(id));
    // palette: CSS/string hex + the JS 0x form (player mesh, splash canvas)
    s = s.replaceAll(DEF_BG, bg).replaceAll('0x' + DEF_BG.slice(1), '0x' + bg.slice(1))
         .replaceAll(DEF_ACCENT, accent).replaceAll('0x' + DEF_ACCENT.slice(1), '0x' + accent.slice(1));
    writeFileSync(p, s);
  }
}

const isHex = c => /^#[0-9a-fA-F]{6}$/.test(c);

async function main() {
  const root = dirname(fileURLToPath(import.meta.url));
  if (!existsSync(join(root, 'README.game.md'))) {
    console.log('Already initialized — nothing to do.');
    exit(0);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  // Don't use rl.question: piped answers (CI, `printf '...' | node init.mjs`) can arrive
  // between questions and get dropped, and question() after EOF throws. Buffer every
  // line ourselves and consume one per prompt — identical behavior typed or piped.
  const pending = [];
  let stdinDone = false;
  rl.on('line', l => pending.push(l));
  rl.once('close', () => { stdinDone = true; });
  const ask = async (q, def) => {
    stdout.write(`${q} [${def}]: `);
    while (!pending.length && !stdinDone) await new Promise(r => setTimeout(r, 15));
    const a = (pending.shift() ?? '').trim();
    if (stdinDone) stdout.write('\n'); // keep piped output readable
    return a || def;
  };

  const defId = basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-game';
  let id = await ask('Game id (npm/package-safe)', defId);
  id = id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || defId;
  const title = await ask('Display title', id.replace(/-+/g, ' ').toUpperCase());
  const author = await ask('Author (splash byline: "a game by …")', 'you');
  let bg = await ask('Background color (hex)', DEF_BG);
  if (!isHex(bg)) bg = DEF_BG;
  let accent = await ask('Accent color (hex)', DEF_ACCENT);
  if (!isHex(accent)) accent = DEF_ACCENT;
  rl.close();

  applyInputs(root, { id, title, author, bg, accent });
  renameSync(join(root, 'README.game.md'), join(root, 'README.md')); // the game's README takes over
  rmSync(join(root, 'init.test.mjs'), { force: true });
  rmSync(fileURLToPath(import.meta.url)); // this script's work is done

  console.log(`
  ${title} is born.

  Next steps:
    npm install && npm run dev     # play it at :8180 (LAN-exposed for your phone)
    npm test                       # keep this green
    # replace icons/icon-192.png + icon-512.png with your art
    # import the repo at vercel.com once — every push to main deploys
    # then: CLAUDE.md → "Growing a game from the skeleton"
`);
}

// run only when executed directly (not when imported by the test)
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  await main();
}
