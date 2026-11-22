// Keyboard, mouse and touch. Keys move the thief; a click or tap sets a
// walk target; the smoke button in the HUD (and Space / E) spends a bomb.
export function createInput(canvas, toLogical, hooks) {
  const keys = new Set();
  let target = null;
  let smokeQueued = false;

  function key(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(key(e));
    hooks.onGesture();
    if (e.code === 'Space' || e.code === 'KeyE') smokeQueued = true;
    if (e.code === 'KeyP') hooks.onPause();
    if (e.code === 'KeyR') hooks.onRestart();
    if (e.code === 'KeyM') hooks.onMute();
    if (e.code === 'Space' || e.code === 'Enter') hooks.onConfirm();
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    hooks.onGesture();
    const p = toLogical(e.clientX, e.clientY);
    if (hooks.onCanvasTap(p)) return; // the HUD smoke button ate the tap
    target = p;
  });

  return {
    read() {
      const out = {
        up: keys.has('ArrowUp') || keys.has('KeyW'),
        down: keys.has('ArrowDown') || keys.has('KeyS'),
        left: keys.has('ArrowLeft') || keys.has('KeyA'),
        right: keys.has('ArrowRight') || keys.has('KeyD'),
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        smoke: smokeQueued,
        target,
      };
      smokeQueued = false;
      return out;
    },
    queueSmoke() { smokeQueued = true; },
    clearSmoke() { smokeQueued = false; },
    clearTarget() { target = null; },
  };
}
