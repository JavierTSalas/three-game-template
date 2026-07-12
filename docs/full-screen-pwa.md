# Full-screen mobile web games & PWA — the pattern that works

Everything here was learned the hard way shipping real mobile browser games — every pitfall
in the table below actually shipped at some point and got root-caused on-device.
The theme of every bug: **two rulers measuring the same thing**. There must be exactly one
authority for viewport size, and it is CSS.

## The one rule

> CSS owns display size. JS only copies what CSS produced into the drawing buffer.

```css
/* zero viewport units anywhere on the page shell */
html, body { position: fixed; inset: 0; overflow: hidden;
             touch-action: none; overscroll-behavior: none; }
#gameCanvas { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
```

```js
// per frame (resize events race fullscreen/rotation on mobile — poll, don't listen)
function fitCanvas() {
  if (canvas.style.width) {            // inline px pins clientWidth — strip FIRST
    canvas.style.removeProperty('width');
    canvas.style.removeProperty('height');
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h || (last.w === w && last.h === h)) return;
  last = { w, h };
  renderer.setSize(w, h, /* updateStyle */ false); // NEVER let three write styles back
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
```

A `position: fixed; inset: 0` element tracks the **layout viewport** exactly — through URL-bar
hide/show, element fullscreen, rotation, and PWA standalone mode — on iOS Safari, Android
Chrome, and desktop, with no units and no JS. That's why it's the authority.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1,
      user-scalable=no, viewport-fit=cover">
```

Plus `env(safe-area-inset-*)` margins on HUD controls (notch/home-bar), and for PWA install:
`manifest.json` with `"display": "standalone"` + any registered service worker.

## Common pitfalls (each one shipped here at some point)

| Pitfall | Symptom | Why it breaks |
|---|---|---|
| `height: 100vh` on body | bottom strip hidden behind the URL bar | iOS/Android `vh` = *largest* viewport; URL bar overlaps it |
| `width: 100dvw` on body | horizontal scrollbar, right edge clipped | `dvw` includes the scrollbar gutter; any vertical scrollbar makes body wider than the viewport |
| sizing canvas from `window.innerWidth/innerHeight` | canvas clipped/letterboxed after fullscreen or rotation | stale on Android after fullscreen/PWA transitions until the next tap |
| sizing canvas from `visualViewport` while CSS uses `dvh` | scrollbar + one clipped edge | visual and layout viewport legitimately differ (scrollbar, pinch, URL bar) — two rulers |
| three.js `renderer.setSize(w, h)` (default `updateStyle: true`) | resizes stop working entirely | it stamps inline `width/height` **px** styles, which override `width:100%` AND pin `clientWidth`, so change detection never fires again |
| `resize` event listeners as the only trigger | works on desktop, fails on phones | the event races the real layout during fullscreen/rotation; poll each frame instead (it's one comparison — free) |
| `.screen` overlays with `overflow-y: auto` + `justify-content: center` | desktop scrollbar, mobile page-panning, title cropped | overflowing centered flex crops both ends and makes the whole overlay a scroll container; scroll an inner column instead (`overflow-y:auto; scrollbar-width:none; justify-content: safe center`) and keep the screen itself `overflow: hidden; touch-action: none` |
| engine `setupFullScreenCanvas: true` | entire DOM HUD vanishes | it does `document.body.innerHTML = ''` (three-game-engine v0.10) |
| `game.pause()` style rAF stalls for pause menus | physics explosion on resume | dt accumulates; freeze physics via a live-checked flag instead |

## Debug checklist

When "there's a scrollbar / something's cut off":

```js
const se = document.scrollingElement, c = document.getElementById('gameCanvas');
({ pageScrollX: se.scrollWidth  > se.clientWidth,   // must be false
   pageScrollY: se.scrollHeight > se.clientHeight,  // must be false
   cssVsBuffer: [c.clientWidth, c.clientHeight, c.width, c.height], // must match (× dpr)
   inlinePx: c.getAttribute('style') })              // must be empty
```

If `pageScroll*` is true, something is sized with a viewport unit or JS pixels — find it and
make it `fixed inset:0` or `%`. If `inlinePx` has values, something called a style-writing
resize API.

## Cache busting — getting a fresh build into an installed PWA

Context: the prod bundle is `index.bundle.js` (**not** content-hashed), the service worker is
a pass-through (exists only for installability), and Vercel serves statics with
`max-age=0, must-revalidate`. Normal browser tabs revalidate fine; **installed PWAs and
long-lived tabs don't** — the game runs for hours without a navigation, so players sit on
stale builds. Browsers offer no auto-update path we control, so the UX is a button, not a
reinstall.

### What's shipped: the ↻ REFRESH APP button (menu rail, index.js)

Nukes every cache layer, then reloads past the HTML cache:

```js
const keys = await caches?.keys() ?? [];               // CacheStorage (SW caches)
await Promise.all(keys.map(k => caches.delete(k)));
const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
await Promise.all(regs.map(r => r.unregister()));      // boot re-registers on next load
location.href = location.pathname + '?u=' + Date.now(); // nonce busts the HTML cache;
                                                        // fresh HTML revalidates the bundle
```

The query nonce is the load-bearing part: `location.reload()` can serve the PWA's cached
HTML, but a never-seen URL forces a network fetch, and the fresh HTML's script tag
revalidates `index.bundle.js` against Vercel (`must-revalidate` → 200 with the new build).

### Optional upgrade: version detection (not shipped)

If we ever want the button to light up only when an update exists:

1. **Stamp a version at build time.** In `webpack.prod.cjs`, emit `dist/version.json`:

   ```js
   const { execSync } = require('child_process');
   const BUILD = execSync('git rev-parse --short HEAD').toString().trim();
   // + DefinePlugin: __BUILD__: JSON.stringify(BUILD)
   // + emit { "build": BUILD } as version.json (a tiny plugin or a build script step)
   ```

2. **Poll it past every cache.** `cache: 'no-store'` bypasses the HTTP cache; the query-string
   nonce additionally defeats any proxy/SW that ignores it — that pair is the actual
   cache-busting mechanism:

   ```js
   async function newVersionAvailable() {
     try {
       const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
       return (await r.json()).build !== __BUILD__;
     } catch { return false; } // offline — never nag
   }
   ```

3. **Check at friendly moments only** — menu, pause, extraction report — never mid-run.
   On mismatch show a small "new version — tap to update" pill that runs
   `location.reload()`. Don't auto-reload: yanking a run away is worse than staleness.

4. **If the service worker ever grows a real cache**, version its cache name with the same
   build stamp and `caches.delete` old ones in `activate` — otherwise step 2 reports the new
   version but the reload serves the old files, the worst of both worlds.

Cheaper alternative if we adopt content-hashed bundles (`[contenthash]` filenames): the
version probe can just HEAD `index.html` and compare `etag` — but the explicit `version.json`
survives every hosting/header change, so prefer it.
