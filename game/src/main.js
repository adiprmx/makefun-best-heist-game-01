// Boot and the frame loop. One fixed step per animation frame keeps the
// game deterministic: the same seed and the same inputs always replay the
// same heist, which is what makes the screenshots reproducible.
import { VIEW_W, VIEW_H } from './config.js';
import { newRun, startGame, update } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { initAudio, setMuted } from './audio.js';
import { autopilotInput, autopilotState, shotReady } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // null, or 'start' | 'play' | 'end'
const seed = Number(params.get('seed') || '1');

const run = newRun(seed);
try {
  run.best = Number(localStorage.getItem('velvet-vault-best') || 0);
} catch (e) { /* storage unavailable — best score just stays 0 */ }

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
let muted = false;

function fitCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  const ox = (w - VIEW_W * scale) / 2;
  const oy = (h - VIEW_H * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// The HUD smoke button: a tap on it spends a bomb instead of walking.
function smokeButtonHit(p) {
  return p.x >= 900 && p.x <= 1060 && p.y >= 14 && p.y <= 50;
}

const input = createInput(canvas, (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  const scale = Math.min(r.width / VIEW_W, r.height / VIEW_H);
  const ox = (r.width - VIEW_W * scale) / 2;
  const oy = (r.height - VIEW_H * scale) / 2;
  return { x: (cx - r.left - ox) / scale, y: (cy - r.top - oy) / scale };
}, {
  onGesture() { initAudio(); },
  onConfirm() {
    if (run.mode === 'title' || run.mode === 'over' || run.mode === 'win') {
      startGame(run);
      input.clearTarget();
      input.clearSmoke(); // Space starts the game; it must not also spend a bomb
    }
  },
  onPause() {
    if (run.mode === 'playing') run.mode = 'paused';
    else if (run.mode === 'paused') run.mode = 'playing';
  },
  onRestart() {
    if (run.mode !== 'title') startGame(run);
  },
  onMute() {
    muted = !muted;
    setMuted(muted);
  },
  onCanvasTap(p) {
    if (run.mode === 'title' || run.mode === 'over' || run.mode === 'win') {
      startGame(run);
      input.clearTarget();
      input.clearSmoke();
      return true;
    }
    if (smokeButtonHit(p)) {
      input.queueSmoke();
      return true;
    }
    return false;
  },
});

function frame() {
  if (frozen) return;
  let inp = input.read();
  if (shot) {
    // Screenshot mode: the game starts itself for play/end shots and the
    // autopilot drives. The start shot keeps the title screen.
    if (shot !== 'start' && run.mode === 'title' && run.frame > 5) startGame(run);
    inp = autopilotInput(run);
    window.__heistAutoOut = inp; // diagnostics: what the autopilot commanded
  }
  update(run, inp);
  render(ctx, run);

  if (run.mode === 'win' || run.mode === 'over') {
    try {
      if (run.score > run.best) {
        run.best = run.score;
        localStorage.setItem('velvet-vault-best', String(run.best));
      }
    } catch (e) { /* ignore */ }
  }

  if (statusEl) {
    const L = run.level;
    statusEl.textContent = run.mode === 'playing' && L
      ? `${L.def.name}. Loot ${L.lootTaken.size} of ${L.def.loot.length}. Alarm ${Math.round(L.alarm)}. Score ${run.score}.`
      : run.mode;
  }
  if (shot && shotReady(run, shot)) {
    window.__shotReady = true;
    // Freeze the simulation the moment the frame is ready, so a re-shoot
    // captures the exact same frame instead of one a few frames later.
    frozen = true;
  }
  if (!frozen) requestAnimationFrame(frame);
}
let frozen = false;

// A read-only peek at the run for diagnostics (the screenshot driver uses
// it to watch the autopilot; the game itself never reads it).
window.__heistDebug = () => {
  const L = run.level;
  return {
    mode: run.mode,
    level: run.levelIndex,
    lives: run.lives,
    score: run.score,
    time: Math.round(run.time),
    frame: run.frame,
    alarm: L ? Math.round(L.alarm) : null,
    loot: L ? `${L.lootTaken.size}/${L.def.loot.length}` : null,
    exitOpen: L ? L.exitOpen : null,
    thief: L ? { x: Math.round(L.thief.x), y: Math.round(L.thief.y), moving: L.thief.moving, sprinting: L.thief.sprinting } : null,
    smokes: L ? L.smokesLeft : null,
    auto: autopilotState(),
    autoOut: window.__heistAutoOut || null,
  };
};
requestAnimationFrame(frame);
