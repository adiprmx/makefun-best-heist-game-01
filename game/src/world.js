// The rules of the heist: patrols, vision cones, the alarm, loot, smoke,
// getting caught, and the getaway. One fixed step (DT) per frame, so the
// same inputs always play out the same way.
import {
  FIELD, THIEF_R, WALK_SPEED, SPRINT_MULT, CONE_RANGE, CONE_HALF,
  CAM_RANGE, CAM_HALF, ALARM_RISE, ALARM_FALL, SMOKE_COUNT, SMOKE_RADIUS,
  SMOKE_SECS, SMOKE_COST, LOOT_SCORE, LEVEL_BONUS, WIN_BONUS, MAX_LIVES,
} from './config.js';
import { LEVELS } from './levels.js';
import { sfx } from './audio.js';

export const DT = 1 / 60;

export function newRun(seed) {
  return {
    mode: 'title', levelIndex: 0, score: 0, lives: MAX_LIVES,
    time: 0, frame: 0, seed, level: null, caughtTimer: 0,
    winAtFrame: -1, stats: null, best: 0,
  };
}

export function startLevel(run, idx) {
  const def = LEVELS[idx];
  run.levelIndex = idx;
  run.level = {
    def,
    alarm: 0,
    lootTaken: new Set(),
    smokesLeft: SMOKE_COUNT,
    smokes: [],
    thief: { x: def.spawn.x, y: def.spawn.y, angle: -Math.PI / 2, moving: false, sprinting: false },
    guards: def.guards.map((g) => ({
      path: g.path,
      speed: g.speed,
      seg: 0,
      x: g.path[0][0],
      y: g.path[0][1],
      angle: Math.atan2(g.path[1][1] - g.path[0][1], g.path[1][0] - g.path[0][0]),
    })),
    cameras: def.cameras.map((c) => ({ ...c, angle: c.base })),
    exitOpen: false,
    elapsed: 0,
    wasSeen: false,
  };
}

export function startGame(run) {
  run.mode = 'playing';
  run.score = 0;
  run.lives = MAX_LIVES;
  run.time = 0;
  run.stats = null;
  startLevel(run, 0);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Does the segment (x1,y1)-(x2,y2) cross rect r? Slab test, no allocation.
function segHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function losClear(x1, y1, x2, y2, solids) {
  for (const s of solids) if (segHitsRect(x1, y1, x2, y2, s)) return false;
  return true;
}

export function inSmoke(x, y, smokes, now) {
  for (const s of smokes) {
    if (now < s.until && Math.hypot(x - s.x, y - s.y) < SMOKE_RADIUS) return true;
  }
  return false;
}

// One eye (a guard or a camera) on the thief: in range, inside the cone,
// with a clear line of sight, and neither end hidden in smoke.
export function observerSees(obs, tx, ty, range, half, solids, smokes, now) {
  const dx = tx - obs.x;
  const dy = ty - obs.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d > 30 && Math.abs(angleDiff(Math.atan2(dy, dx), obs.angle)) > half) return false;
  if (inSmoke(tx, ty, smokes, now) || inSmoke(obs.x, obs.y, smokes, now)) return false;
  if (d <= 30) return true;
  return losClear(obs.x, obs.y, tx, ty, solids);
}

// Every eye currently watching the thief, nearest first.
export function seeingObservers(run) {
  const L = run.level;
  if (!L) return [];
  const t = L.thief;
  const out = [];
  for (const g of L.guards) {
    if (observerSees(g, t.x, t.y, CONE_RANGE, CONE_HALF, L.def.solids, L.smokes, L.elapsed)) out.push(g);
  }
  for (const c of L.cameras) {
    if (observerSees(c, t.x, t.y, CAM_RANGE, CAM_HALF, L.def.solids, L.smokes, L.elapsed)) out.push(c);
  }
  out.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  return out;
}

export function anyoneSees(run) {
  return seeingObservers(run).length > 0;
}

function circleHitsSolids(x, y, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    if (Math.hypot(x - cx, y - cy) < r) return true;
  }
  return false;
}

export function trySmoke(run) {
  const L = run.level;
  if (!L || run.mode !== 'playing' || L.smokesLeft <= 0 || run.caughtTimer > 0) return false;
  L.smokesLeft -= 1;
  run.score = Math.max(0, run.score - SMOKE_COST);
  L.smokes.push({ x: L.thief.x, y: L.thief.y, until: L.elapsed + SMOKE_SECS });
  sfx.smoke();
  return true;
}

function doCaught(run) {
  const L = run.level;
  run.lives -= 1;
  sfx.caught();
  if (run.lives <= 0) {
    run.mode = 'over';
    run.stats = { score: run.score, time: run.time, lives: 0, level: run.levelIndex + 1 };
    return;
  }
  L.alarm = 0; // a fresh start after a catch — never respawn already half-caught
  run.caughtTimer = 1.4; // SECONDS: update() counts it down by DT each frame
}

export function update(run, input) {
  run.frame += 1;
  if (run.mode !== 'playing') return;
  const L = run.level;
  if (run.caughtTimer > 0) {
    run.caughtTimer -= DT;
    if (run.caughtTimer <= 0) {
      L.thief.x = L.def.spawn.x;
      L.thief.y = L.def.spawn.y;
    }
    return;
  }
  L.elapsed += DT;
  run.time += DT;

  // Guards walk their loops; their gaze follows their motion.
  for (const g of L.guards) {
    const target = g.path[(g.seg + 1) % g.path.length];
    const dx = target[0] - g.x;
    const dy = target[1] - g.y;
    const d = Math.hypot(dx, dy);
    const step = g.speed * DT;
    if (d <= step) {
      g.x = target[0];
      g.y = target[1];
      g.seg = (g.seg + 1) % g.path.length;
    } else {
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
    }
    const want = Math.atan2(dy, dx);
    g.angle += angleDiff(want, g.angle) * Math.min(1, 10 * DT);
  }
  // Cameras sweep back and forth around their base angle.
  for (const c of L.cameras) {
    c.angle = c.base + Math.sin(L.elapsed * c.speed + c.phase) * c.sweep;
  }

  // The thief: keys win over a click target; axis-separated sliding on solids.
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx === 0 && my === 0 && input.target) {
    const dx = input.target.x - L.thief.x;
    const dy = input.target.y - L.thief.y;
    const d = Math.hypot(dx, dy);
    if (d > 10) { mx = dx / d; my = dy / d; }
  }
  const mag = Math.hypot(mx, my);
  const t = L.thief;
  if (mag > 0.01) {
    const sp = WALK_SPEED * (input.sprint ? SPRINT_MULT : 1);
    const vx = (mx / mag) * sp * DT;
    const vy = (my / mag) * sp * DT;
    if (!circleHitsSolids(t.x + vx, t.y, THIEF_R, L.def.solids)) t.x += vx;
    if (!circleHitsSolids(t.x, t.y + vy, THIEF_R, L.def.solids)) t.y += vy;
    t.x = Math.max(FIELD.x + THIEF_R, Math.min(FIELD.x + FIELD.w - THIEF_R, t.x));
    t.y = Math.max(FIELD.y + THIEF_R, Math.min(FIELD.y + FIELD.h - THIEF_R, t.y));
    t.angle = Math.atan2(my, mx);
    t.moving = true;
    t.sprinting = !!input.sprint;
  } else {
    t.moving = false;
    t.sprinting = false;
  }
  if (input.smoke) trySmoke(run);

  // Bumping into a guard is an instant catch.
  for (const g of L.guards) {
    if (Math.hypot(g.x - t.x, g.y - t.y) < 30) { doCaught(run); return; }
  }

  // The alarm climbs while seen, falls while hidden; full means caught.
  const seen = anyoneSees(run);
  if (seen) {
    L.alarm += ALARM_RISE * DT;
    if (!L.wasSeen) sfx.alarm();
  } else {
    L.alarm -= ALARM_FALL * DT;
  }
  L.wasSeen = seen;
  L.alarm = Math.max(0, Math.min(100, L.alarm));
  if (L.alarm >= 100) { doCaught(run); return; }

  // Loot: close enough and it is yours; the last one opens the exit.
  L.def.loot.forEach((lo, i) => {
    if (!L.lootTaken.has(i) && Math.hypot(lo.x - t.x, lo.y - t.y) < 36) {
      L.lootTaken.add(i);
      run.score += LOOT_SCORE;
      sfx.pickup();
      if (L.lootTaken.size === L.def.loot.length) {
        L.exitOpen = true;
        sfx.unlock();
      }
    }
  });

  // The exit: next room, or the van and the win.
  if (L.exitOpen) {
    const e = L.def.exit;
    if (Math.hypot(e.x - t.x, e.y - t.y) < 36) {
      run.score += LEVEL_BONUS;
      if (run.levelIndex + 1 >= LEVELS.length) {
        const timeBonus = Math.max(0, 1500 - Math.floor(run.time) * 5);
        run.score += WIN_BONUS + timeBonus;
        run.mode = 'win';
        run.winAtFrame = run.frame;
        run.stats = {
          score: run.score,
          time: run.time,
          lives: run.lives,
          loot: LEVELS.reduce((n, l) => n + l.loot.length, 0),
        };
        sfx.win();
      } else {
        startLevel(run, run.levelIndex + 1);
      }
    }
  }
}
