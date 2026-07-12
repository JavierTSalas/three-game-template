// Fullscreen helper — hidden where unsupported (iPhone Safari has no element fullscreen).
export const fsSupported = () =>
  !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

export const fsActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export async function toggleFullscreen() {
  try {
    if (fsActive()) {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    } else {
      const el = document.documentElement;
      await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
      try { await screen.orientation.lock('landscape'); } catch { /* desktop / unsupported */ }
    }
  } catch { /* user gesture expired or platform said no — button stays honest via fsActive */ }
}

// wire a button to the toggle + keep its label truthful across F11/system exits
export function bindFsButton(btn) {
  if (!fsSupported()) { btn.style.display = 'none'; return; }
  const label = () => { btn.textContent = fsActive() ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN'; };
  btn.addEventListener('click', () => toggleFullscreen().then(label));
  document.addEventListener('fullscreenchange', label);
  label();
}
