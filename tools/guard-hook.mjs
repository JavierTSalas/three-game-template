#!/usr/bin/env node
// PreToolUse(Bash) guard: block deploy/link commands while inside the TEMPLATE checkout.
// Building a game here — or attaching a Vercel project to the template repo — once clobbered
// a shipped game's production URL. Birth a new repo first (`npm run birth -- <game>`), then
// run vercel from THAT sibling checkout. Belt-and-suspenders on top of tools/birth.mjs.
//
// Wired in .claude/settings.json. Exit 2 = block and feed the stderr reason back to Claude.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let cmd = '';
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  cmd = input?.tool_input?.command ?? '';
} catch { process.exit(0); } // not the shape we expect — don't get in the way

// Only guard the template repo itself; born games (origin != template) deploy freely.
let origin = '';
try { origin = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { process.exit(0); }
if (!/three-game-template/.test(origin)) process.exit(0);

// Only treat `vercel` as a command when it sits at a command position — start of line, or
// after a shell separator (; && || | newline ( ` { and do/then). This is what keeps a commit
// message or echo that merely MENTIONS "vercel deploy" from tripping the guard.
const AT_CMD = String.raw`(?:^|[\n;&|(\`{]|&&|\|\||\bdo\b|\bthen\b)\s*`;
// Dangerous invocations only (bare `vercel` deploys too). Everything else — build, dev, env,
// ls, whoami, inspect, pull — passes untouched.
const DANGER = String.raw`vercel(?:\s*$|\s+(deploy|link|redeploy|promote|--prod|-p\b|git\s+connect|alias\b))`;
const BLOCKED = new RegExp(AT_CMD + DANGER, 'm');
if (BLOCKED.test(cmd)) {
  process.stderr.write(
    'BLOCKED: this is the three-game-template checkout — never deploy or vercel-link a game here.\n' +
    'It attaches a game-named Vercel project to the template repo, and future template pushes\n' +
    'overwrite that game\'s production URL. Birth the game into its own repo first:\n' +
    '  npm run birth -- <game-id> "Title"\n' +
    'then cd ../<game-id> and run vercel from there. (Read-only vercel commands are allowed.)\n');
  process.exit(2);
}
process.exit(0);
