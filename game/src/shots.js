// The autopilot: walks each room's route for the screenshots, reads the
// patrols before it moves, and retreats to the last reached waypoint when
// spotted. It never leaves the route — every move is between two points on
// the room's designed path — so it can neither bee-line through a wall nor
// wait out a patrol in the middle of a gap. It plays with the game's own
// rules only — no teleports, no cheats — so the end shot's win screen is a
// win the game itself produced.
import { seeingObservers, anyoneSees, observerSees, inSmoke } from './world.js';
import { CONE_RANGE, CONE_HALF, CAM_RANGE, CAM_HALF } from './config.js';

let wp = 0;
let lastLevel = -1;
let lastReached = null;
let waitFrames = 0;
let pushTimer = 0;
let rewalks = 0;
let lastDest = null;
let lastWatched = null;
let lastPos = null;
let stuckFrames = 0;
let unstuckTimer = 0;

export function autopilotReset() {
  wp = 0;
  lastLevel = -1;
  lastReached = null;
  waitFrames = 0;
  pushTimer = 0;
  rewalks = 0;
  lastPos = null;
  stuckFrames = 0;
  unstuckTimer = 0;
}

// Read-only peek for diagnostics: where the autopilot is headed and why.
export function autopilotState() {
  return { wp, waitFrames, lastDest, lastWatched, lastOut, lastReached };
}

let lastOut = null;

function moveToward(out, t, tx, ty) {
  const dx = tx - t.x;
  const dy = ty - t.y;
  // Tight dead zone: a 6px zone once left the thief 2px short of clearing
  // a wall corner, wedged forever because no key was ever pressed.
  if (Math.abs(dx) > 2) out[dx > 0 ? 'right' : 'left'] = true;
  if (Math.abs(dy) > 2) out[dy > 0 ? 'down' : 'up'] = true;
  out.sprint = Math.hypot(dx, dy) > 120;
}

// Would any eye see a thief standing at (x, y) right now?
function pointWatched(run, x, y) {
  const L = run.level;
  for (const g of L.guards) {
    if (observerSees(g, x, y, CONE_RANGE, CONE_HALF, L.def.solids, L.smokes, L.elapsed)) return true;
  }
  for (const c of L.cameras) {
    if (observerSees(c, x, y, CAM_RANGE, CAM_HALF, L.def.solids, L.smokes, L.elapsed)) return true;
  }
  return false;
}

// Would any eye see a thief walking the straight segment from (ax, ay) to
// (bx, by)? Sampled, because a destination can be safe while the walk there
// crosses a sweeping cone.
function segmentWatched(run, ax, ay, bx, by) {
  for (let i = 1; i <= 8; i++) {
    const f = i / 8;
    if (pointWatched(run, ax + (bx - ax) * f, ay + (by - ay) * f)) return true;
  }
  return false;
}

export function autopilotInput(run) {
  const out = { up: false, down: false, left: false, right: false, sprint: false, smoke: false, target: null };
  if (run.mode !== 'playing' || !run.level) return out;
  const L = run.level;
  const t = L.thief;

  if (run.caughtTimer > 0) {
    // Caught: respawn at the door and re-walk the room's route from the
    // start — never bee-line across patrol zones to a far waypoint.
    lastReached = { x: L.def.spawn.x, y: L.def.spawn.y };
    wp = 0;
    return out;
  }
  if (run.levelIndex !== lastLevel) {
    lastLevel = run.levelIndex;
    wp = 0;
    lastReached = { x: L.def.spawn.x, y: L.def.spawn.y };
    waitFrames = 0;
    pushTimer = 0;
    rewalks = 0;
    lastPos = null;
    stuckFrames = 0;
    unstuckTimer = 0;
  }

  // A committed push ticks down even while the thief is seen, so the push
  // cannot be frozen mid-sprint by a cone sweeping across.
  if (pushTimer > 0) pushTimer -= 1;

  // Spotted: fall back to the last waypoint actually reached — a point on
  // the room's safe route. During a committed push the thief keeps walking
  // instead of retreating: the alarm can climb, but the exit is closer than
  // the way back. Smoke if the alarm is hot. On the final climb to the
  // getaway, never retreat at all: every retreat re-exposes the thief to
  // the same cone that just saw it, and the climb is short enough that the
  // alarm cannot fill before the van.
  if (anyoneSees(run)) {
    if (L.alarm > 30 && L.smokesLeft > 0) out.smoke = true;
    // Never retreat on the final climb — but only once the thief is actually
    // out on it. At the staging point it still flees like anywhere else.
    const safe = lastReached || L.def.spawn;
    const finalClimb = wp === L.def.route.length - 1 && L.exitOpen
      && Math.hypot(t.x - safe.x, t.y - safe.y) > 20;
    if (pushTimer <= 0 && !finalClimb) {
      const dest = lastReached || L.def.spawn;
      if (Math.hypot(dest.x - t.x, dest.y - t.y) > 20) {
        moveToward(out, t, dest.x, dest.y);
        out.sprint = true;
      } else {
        // Already at the safe point and still seen: flee away from the watcher.
        const o = seeingObservers(run)[0];
        const ax = t.x - o.x;
        const ay = t.y - o.y;
        const d = Math.hypot(ax, ay) || 1;
        moveToward(out, t, t.x + (ax / d) * 100, t.y + (ay / d) * 100);
        out.sprint = true;
      }
      return out;
    }
    // Final climb (or a committed push): keep walking toward the exit.
  }

  // The route is done but the exit never opened: a gem was missed on the
  // way. Re-walk the route from the start — every gem sits on it — instead
  // of cutting straight across the room to the gem.
  const route = L.def.route;
  if (wp >= route.length) {
    if (L.exitOpen) return out;
    if (rewalks >= 2) return out; // genuinely unreachable; don't loop forever
    rewalks += 1;
    wp = 0;
    lastReached = { x: L.def.spawn.x, y: L.def.spawn.y };
  }
  const dest = { x: route[wp][0], y: route[wp][1] };

  // Cool down: never start a leg with a hot alarm — a climb begun at 54
  // ends in a catch. Wait at the last reached waypoint, unseen, until the
  // meter drops back under 25. The final climb is exempt: once the thief
  // is on it, the alarm cannot fill before the van, and dragging it back
  // down only re-exposes it to the same cones.
  const finalClimb = wp === route.length - 1 && L.exitOpen;
  if (L.alarm > 25 && !finalClimb) {
    const safe = lastReached || L.def.spawn;
    if (Math.hypot(safe.x - t.x, safe.y - t.y) > 20) {
      moveToward(out, t, safe.x, safe.y);
      out.sprint = true;
    }
    return out;
  }

  // Read the patrols before moving: never walk into a watched segment.
  // Inside a smoke puff the thief cannot be seen anywhere, so there is
  // nothing to wait for. When the way is hot, fall back to the last reached
  // waypoint and wait THERE — never stand in the open mid-path. After a
  // long wait, commit to a push: walk for 2.5 seconds no matter what the
  // cones do, or the thief would wait out the whole patrol cycle one frame
  // at a time.
  const hidden = inSmoke(t.x, t.y, L.smokes, L.elapsed);
  lastDest = dest;
  // The final climb never waits: the thief sprints for the van the moment
  // the alarm has cooled, and the climb is short enough to survive being
  // seen on the way. Waiting there only re-exposes it to the same cones.
  lastWatched = !finalClimb && pushTimer <= 0 && !hidden && (pointWatched(run, dest.x, dest.y) || segmentWatched(run, t.x, t.y, dest.x, dest.y));
  if (lastWatched) {
    waitFrames += 1;
    const safe = lastReached || L.def.spawn;
    if (Math.hypot(safe.x - t.x, safe.y - t.y) > 20) {
      moveToward(out, t, safe.x, safe.y);
      out.sprint = true;
      return out;
    }
    // Smoke is for the push, not the wait: routine waits burn nothing, so
    // a bomb is still in hand when the thief finally commits to a hot leg.
    if (waitFrames > (wp === route.length - 1 ? 1500 : 420)) {
      waitFrames = 0;
      if (L.smokesLeft > 0) out.smoke = true; // cover the push
      // Commit: walk through the sweep, don't peek a frame. The final
      // climb to the getaway gets a longer commit — it is the whole run.
      // But it only ever pushes after a long wait for a clear window,
      // because the getaway corridor is watched for most of each patrol
      // cycle and a blind push walks straight into the guard's cone.
      pushTimer = wp === route.length - 1 ? 300 : 150;
    } else {
      stuckFrames = 0; // waiting on purpose is not being stuck
      return out;
    }
  } else {
    waitFrames = 0;
  }

  const d = Math.hypot(dest.x - t.x, dest.y - t.y);
  if (d < 14) {
    lastReached = { x: dest.x, y: dest.y };
    wp += 1;
    return out;
  }

  // Unstick failsafe: a diagonal approach can wedge the thief into a wall
  // corner where neither axis can move. If commanded movement stops changing
  // the position for 1.5 seconds, back out toward the last reached waypoint
  // for a moment and try the approach again from a cleaner angle.
  if (unstuckTimer > 0) {
    unstuckTimer -= 1;
    const safe = lastReached || L.def.spawn;
    moveToward(out, t, safe.x, safe.y);
    out.sprint = true;
    return out;
  }
  if (lastPos && Math.hypot(t.x - lastPos.x, t.y - lastPos.y) < 1) {
    stuckFrames += 1;
    if (stuckFrames > 90) {
      unstuckTimer = 45;
      stuckFrames = 0;
    }
  } else {
    stuckFrames = 0;
  }
  lastPos = { x: t.x, y: t.y };

  moveToward(out, t, dest.x, dest.y);
  return out;
}

// When a shot's frame is ready to be taken. The play shot waits for a moment
// the alarm is actually showing, so the meter is visible doing its job.
export function shotReady(run, shot) {
  if (shot === 'start') return run.frame >= 40;
  if (shot === 'play') {
    const L = run.level;
    // Catch a moment the alarm is actually working — a cone on the thief —
    // or take the frame at 15 seconds either way.
    return run.mode === 'playing' && ((run.frame >= 150 && L && (L.alarm >= 10 || anyoneSees(run))) || run.frame >= 900);
  }
  if (shot === 'end') return run.mode === 'win' && run.frame - run.winAtFrame >= 30;
  return false;
}
