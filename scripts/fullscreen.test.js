import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleFullscreen } from './fullscreen.js';

test('entering fullscreen does not request an orientation lock', async () => {
  const previousDocument = globalThis.document;
  const previousScreen = globalThis.screen;
  let orientationLockCalls = 0;

  globalThis.document = {
    fullscreenElement: null,
    webkitFullscreenElement: null,
    documentElement: {
      requestFullscreen: async () => {},
    },
  };
  globalThis.screen = {
    orientation: {
      lock: async () => { orientationLockCalls += 1; },
    },
  };

  try {
    await toggleFullscreen();
    assert.equal(orientationLockCalls, 0);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousScreen === undefined) delete globalThis.screen;
    else globalThis.screen = previousScreen;
  }
});
