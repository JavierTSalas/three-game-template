#!/usr/bin/env node
// One-command birth: template → new private GitHub repo → new Vercel project, all pointed
// at a SIBLING directory. Exists so nobody ever builds a game (or runs `vercel`) inside the
// template checkout again — that once attached a game's Vercel project to the template repo.
//
//   npm run birth -- <game-id> ["Display Title"] ["Author"]
//
// Needs: gh (authed). Optional: vercel (authed) — skipped with instructions if missing.
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exit, argv } from 'node:process';

const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const die = msg => { console.error(`\n✖ ${msg}`); exit(1); };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = (argv[2] || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
if (!id) die('Usage: npm run birth -- <game-id> ["Display Title"] ["Author"]');
const title = argv[3] || id.replace(/-+/g, ' ').toUpperCase();
const author = argv[4] || sh('git config user.name', { cwd: root }) || 'you';

// guard: only run from the template itself
const origin = sh('git remote get-url origin', { cwd: root });
if (!/three-game-template/.test(origin)) die(`This checkout's origin is ${origin} — birth only runs from the template.`);
if (!existsSync(join(root, 'init.mjs'))) die('init.mjs missing — this checkout is already a born game.');

const dest = join(dirname(root), id);
if (existsSync(dest)) die(`${dest} already exists.`);
try { sh('gh auth status'); } catch { die('gh is not authenticated — run `gh auth login` first.'); }
const owner = sh('gh api user -q .login');

console.log(`\n🐣 Birthing ${title} (${owner}/${id}) into ${dest}\n`);

// 1. clone the template's committed state locally (no template-repo flag needed), re-point origin
run(`git clone --quiet "${root}" "${dest}"`);
run(`gh repo create ${id} --private --source "${dest}" --remote origin-new`, root);
sh('git remote remove origin', { cwd: dest });
sh('git remote rename origin-new origin', { cwd: dest });

// 2. stamp identity (init.mjs reads piped answers; empty lines accept color defaults)
const init = spawnSync('node', ['init.mjs'], { cwd: dest, input: `${id}\n${title}\n${author}\n\n\n`, stdio: ['pipe', 'inherit', 'inherit'] });
if (init.status !== 0) die('init.mjs failed — the repo was created; finish by hand in ' + dest);
run('git add -A', dest);
run(`git commit --quiet -m "birth: ${title} (from three-game-template)"`, dest);
run('git push --quiet -u origin main', dest);

// 3. Vercel: NEW project linked to the NEW repo (never the template)
let deployed = false;
try {
  sh('vercel whoami');
  run(`vercel link --yes --project ${id}`, dest);
  run('vercel git connect --yes', dest);
  deployed = true;
} catch {
  console.log('\n(vercel CLI missing or not authed — import the repo at vercel.com when ready)');
}

console.log(`
  ${title} is born.

    cd ${dest}
    npm install && npm run dev      # play it at :8180
    cp docs/prd-template.md docs/${id}-prd.md   # write the PRD FIRST (AGENTS/CLAUDE requirement)

  repo:   https://github.com/${owner}/${id}
  vercel: ${deployed ? `project "${id}" — every push to main deploys` : 'import the repo at vercel.com once'}
  This template checkout stays pristine — do all game work in ${basename(dest)}/.
`);
