# __GAME_TITLE__

A mobile-landscape browser game by __AUTHOR__.

**Play it:** _add your Vercel URL here after the first deploy_

## Controls

- **Touch:** floating joystick in the bottom-left zone (appears under your thumb) ·
  double-tap the stick = dash · **HOP** and **DASH** buttons · drag the right half
  of the screen = orbit camera.
- **Desktop:** **WASD or arrow keys** roll · **Space** = hop · **E** (or Shift) = dash ·
  drag = orbit · **Esc** = pause (settings live there: fullscreen, sound).

## Run / develop

    npm install
    npm run dev        # http://localhost:8180 — LAN-exposed, open it on your phone too
    npm test           # pure logic tests (node:test)
    npm run build      # production bundle → dist/

All tuning lives in `TUNE` in `logic.js` (tested in `logic.test.js`); content lives in
`data/level.json`; engine gotchas and the growing-a-game guide live in `CLAUDE.md`;
viewport/PWA and 3D-asset playbooks live in `docs/`.

## Deploy (once)

Import this repo at [vercel.com](https://vercel.com) → framework preset **Other** —
`vercel.json` already pins the build (`npm run build`) and output (`dist/`). After that,
every push to `main` deploys. Installed-PWA players pick up new builds via the
**↻ REFRESH APP** button on the menu.

## Post-birth checklist

- [ ] Replace `icons/icon-192.png` + `icons/icon-512.png` with your art
- [ ] Retint: CSS vars in `index.html` (`--bg`, `--accent`, …), `manifest.json` colors,
      terrain theme in `scripts/terrain.js`
- [ ] Import the repo in Vercel; paste the play URL at the top of this README
- [ ] Replace the platformer sandbox with your mechanic (`CLAUDE.md` → "Growing a game")
- [ ] Portrait game instead? Flip `manifest.json → orientation` and the `#rotateHint`
      media query in `index.html`

## Credits

- Engine: **[three-game-engine](https://github.com/WesUnwin/three-game-engine)** by Wes Unwin
  (MIT), bundling **three.js** (MIT), **Rapier** physics by Dimforge (Apache-2.0), and
  **three-mesh-ui** (MIT)
- Fonts: **Luckiest Guy** by Astigmatic & **Baloo 2** by Ek Type (both SIL Open Font License)
- Tooling: webpack · Playwright · Blender · gltf-transform · Vercel

---

Built from [three-game-template](https://github.com/JavierTSalas/three-game-template) ·
co-developed with Claude.
