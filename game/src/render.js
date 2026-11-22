// Every pixel of Velvet Vault: the night museum, the cones, the guards, the
// loot, the thief, the HUD, and the title / pause / busted / getaway screens.
// Draw order matters: cones first, then solids over them, so a cone reads as
// stopped by a wall. Nothing here loads a file — it is all canvas paint.
import { VIEW_W, VIEW_H, FIELD, HUD_H, THIEF_R, CONE_RANGE, CAM_RANGE, MAX_LIVES } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawCone(ctx, x, y, angle, range, half, rgb, alerted) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 8, x, y, range);
  const base = alerted ? '255,70,60' : rgb;
  g.addColorStop(0, `rgba(${base},0.40)`);
  g.addColorStop(0.7, `rgba(${base},0.16)`);
  g.addColorStop(1, `rgba(${base},0.02)`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `rgba(${base},0.45)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx) {
  ctx.fillStyle = '#0b0d18';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const tile = 80;
  for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += tile) {
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += tile) {
      const dark = ((x - FIELD.x) / tile + (y - FIELD.y) / tile) % 2 === 0;
      ctx.fillStyle = dark ? '#101327' : '#0d1020';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // A worn red carpet down the middle of the room, for the eye to follow.
  ctx.fillStyle = '#3d1220';
  ctx.fillRect(FIELD.x + 560, FIELD.y, 120, FIELD.h);
  ctx.fillStyle = '#571a2c';
  ctx.fillRect(FIELD.x + 572, FIELD.y, 96, FIELD.h);
  // Gold trim around the room.
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = 3;
  ctx.strokeRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
  ctx.strokeStyle = 'rgba(138,109,47,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(FIELD.x + 6, FIELD.y + 6, FIELD.w - 12, FIELD.h - 12);
}

function drawSolids(ctx, solids) {
  for (const s of solids) {
    if (s.kind === 'pillar') {
      ctx.fillStyle = '#1d2338';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2b3350';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else if (s.kind === 'wall') {
      ctx.fillStyle = '#232a44';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2f3a5c';
      ctx.fillRect(s.x, s.y, s.w, 4);
      ctx.strokeStyle = '#8a6d2f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else {
      // Crate: low cover the thief can hide behind.
      ctx.fillStyle = '#4a3419';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#6b4a24';
      ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = '#c9a24b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y + 4);
      ctx.lineTo(s.x + s.w - 4, s.y + s.h - 4);
      ctx.moveTo(s.x + s.w - 4, s.y + 4);
      ctx.lineTo(s.x + 4, s.y + s.h - 4);
      ctx.strokeStyle = 'rgba(201,162,75,0.5)';
      ctx.stroke();
    }
  }
}

function drawLoot(ctx, loot, taken, elapsed) {
  loot.forEach((lo, i) => {
    if (taken.has(i)) return;
    const pulse = 1 + 0.12 * Math.sin(elapsed * 4 + i * 1.7);
    const r = 13 * pulse;
    ctx.save();
    ctx.shadowColor = '#ffd34d';
    ctx.shadowBlur = 18;
    ctx.translate(lo.x, lo.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-r / 2.8, -r / 2.8, r * 0.7, r * 0.7);
    ctx.restore();
  });
}

function drawExit(ctx, exit, open, elapsed) {
  if (exit.kind === 'van') {
    const blink = open ? 0.7 + 0.3 * Math.sin(elapsed * 5) : 0.25;
    ctx.save();
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = open ? 24 : 6;
    ctx.fillStyle = open ? '#14532d' : '#1c2b22';
    rr(ctx, exit.x - 52, exit.y - 22, 104, 44, 10);
    ctx.fill();
    ctx.strokeStyle = `rgba(74,222,128,${blink})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(exit.x - 34, exit.y - 12, 26, 14);
    ctx.fillRect(exit.x + 2, exit.y - 12, 26, 14);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(exit.x - 28, exit.y + 22, 9, 0, Math.PI * 2);
    ctx.arc(exit.x + 28, exit.y + 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = open ? '#4ade80' : '#5b6b5e';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'GETAWAY — GO!' : 'GETAWAY VAN', exit.x, exit.y - 32);
    ctx.restore();
    return;
  }
  // A door on the east wall: grey and locked, green and open.
  const x = exit.x - 8;
  const y = exit.y - 42;
  ctx.save();
  ctx.shadowColor = open ? '#4ade80' : '#666';
  ctx.shadowBlur = open ? 20 : 4;
  ctx.fillStyle = open ? '#14532d' : '#2a2f3a';
  rr(ctx, x, y, 18, 84, 4);
  ctx.fill();
  ctx.strokeStyle = open ? '#4ade80' : '#8a8f9a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (!open) {
    ctx.fillStyle = '#c9a24b';
    ctx.fillRect(exit.x - 4, exit.y - 6, 12, 12);
    ctx.beginPath();
    ctx.arc(exit.x + 2, exit.y - 6, 7, Math.PI, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c9a24b';
    ctx.stroke();
  } else {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('EXIT OPEN', exit.x - 16, exit.y + 5);
  }
  ctx.restore();
}

function drawSmoke(ctx, smokes, now) {
  for (const s of smokes) {
    if (now >= s.until) continue;
    const left = s.until - now;
    const a = Math.min(0.5, left * 0.25);
    ctx.save();
    ctx.fillStyle = `rgba(200,200,210,${a})`;
    for (let i = 0; i < 5; i++) {
      const ang = i * 1.256 + now;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(ang) * 55, s.y + Math.sin(ang) * 45, 52, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawGuard(ctx, g, alerted) {
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = '#1b2b4a';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alerted ? '#ff463c' : '#7ea4ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Cap and facing tick.
  ctx.fillStyle = '#0e1830';
  ctx.beginPath();
  ctx.arc(0, -3, 10, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#dbe4ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(g.angle) * 20, Math.sin(g.angle) * 20);
  ctx.stroke();
  if (alerted) {
    ctx.fillStyle = '#ff463c';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -24);
  }
  ctx.restore();
}

function drawCamera(ctx, c, alerted) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = '#232a44';
  rr(ctx, -12, -8, 24, 16, 4);
  ctx.fill();
  ctx.strokeStyle = alerted ? '#ff463c' : '#5ac8ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = alerted ? '#ff6b60' : '#bfe9ff';
  ctx.beginPath();
  ctx.arc(12, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawThief(ctx, t, frame) {
  const bob = t.moving ? Math.sin(frame * 0.35) * 1.5 : 0;
  ctx.save();
  ctx.translate(t.x, t.y + bob);
  ctx.shadowColor = '#ffd34d';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.arc(0, 0, THIEF_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Gold mask band with two eyes.
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(-11, -4, 22, 7);
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.arc(-5, -0.5, 2, 0, Math.PI * 2);
  ctx.arc(5, -0.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(t.angle) * 18, Math.sin(t.angle) * 18);
  ctx.stroke();
  ctx.restore();
}

function drawMaskIcon(ctx, x, y, alive) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = alive ? '#0a0a12' : 'rgba(10,10,18,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alive ? '#ffd34d' : 'rgba(255,211,77,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = alive ? '#ffd34d' : 'rgba(255,211,77,0.35)';
  ctx.fillRect(-8, -3, 16, 5);
  ctx.restore();
}

function drawHUD(ctx, run) {
  const L = run.level;
  ctx.fillStyle = '#0a0c16';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#8a6d2f';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('VELVET VAULT', 20, 30);
  ctx.fillStyle = '#9aa3c0';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(L ? L.def.name : '', 20, 52);

  // Loot count.
  const taken = L ? L.lootTaken.size : 0;
  const total = L ? L.def.loot.length : 0;
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`◆ LOOT  ${taken}/${total}`, 330, 32);
  ctx.fillStyle = '#9aa3c0';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`SCORE ${run.score}`, 330, 54);

  // Alarm meter — the number the whole heist turns on.
  const ax = 520;
  const alarm = L ? L.alarm : 0;
  ctx.fillStyle = alarm > 60 ? '#ff6b60' : '#e8e4d8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('ALARM', ax, 24);
  ctx.fillStyle = '#232a44';
  rr(ctx, ax, 32, 230, 20, 5);
  ctx.fill();
  const frac = alarm / 100;
  ctx.fillStyle = frac > 0.6 ? '#ff463c' : frac > 0.3 ? '#ff9f2e' : '#ffd34d';
  if (frac > 0.01) {
    rr(ctx, ax + 2, 34, Math.max(8, 226 * frac), 16, 4);
    ctx.fill();
  }
  ctx.strokeStyle = '#8a8f9a';
  ctx.lineWidth = 1.5;
  rr(ctx, ax, 32, 230, 20, 5);
  ctx.stroke();

  // Lives.
  for (let i = 0; i < MAX_LIVES; i++) drawMaskIcon(ctx, 800 + i * 30, 40, i < run.lives);

  // Smoke bombs.
  ctx.fillStyle = '#c8c8d2';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SMOKE ×${L ? L.smokesLeft : 0}  [SPACE]`, 900, 30);
  ctx.fillStyle = '#9aa3c0';
  ctx.font = '13px system-ui, sans-serif';
  const mm = Math.floor(run.time / 60);
  const ss = String(Math.floor(run.time % 60)).padStart(2, '0');
  ctx.fillText(`TIME ${mm}:${ss}`, 900, 54);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5,6,14,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 76px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 360 + i * 34));
}

export function render(ctx, run) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (run.mode === 'title') {
    drawFloor(ctx);
    ctx.fillStyle = 'rgba(5,6,14,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 96px Georgia, serif';
    ctx.fillText('VELVET VAULT', VIEW_W / 2, 250);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '24px Georgia, serif';
    ctx.fillText('A three-room stealth heist — in, out, and gone before dawn.', VIEW_W / 2, 300);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = '#c8c8d2';
    const lines = [
      'Sneak past the guards and their vision cones. Cameras sweep the halls.',
      'Lift every gem to unlock the exit — then run for the getaway van.',
      'Seen too long and the alarm fills: caught three times and the job is blown.',
      'Smoke bombs (SPACE) blind every eye for a few seconds. Sprinting is fast — and loud.',
      '',
      'WASD / arrows move · Shift sprint · click to walk · P pause · M sound',
    ];
    lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 360 + i * 32));
    const pulse = 0.65 + 0.35 * Math.sin(run.frame * 0.08);
    ctx.fillStyle = `rgba(255,211,77,${pulse})`;
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillText('PLAY  —  press SPACE or click', VIEW_W / 2, 620);
    if (run.best > 0) {
      ctx.fillStyle = '#9aa3c0';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(`Best score: ${run.best}`, VIEW_W / 2, 660);
    }
    return;
  }

  const L = run.level;
  if (!L) return;
  drawFloor(ctx);
  // Cones under the solids, so walls read as cover.
  for (const g of L.guards) {
    const alerted = L.wasSeen;
    drawCone(ctx, g.x, g.y, g.angle, CONE_RANGE, 0.62, '255,180,60', alerted);
  }
  for (const c of L.cameras) {
    drawCone(ctx, c.x, c.y, c.angle, CAM_RANGE, 0.5, '90,200,255', false);
  }
  drawSolids(ctx, L.def.solids);
  drawLoot(ctx, L.def.loot, L.lootTaken, L.elapsed);
  drawExit(ctx, L.def.exit, L.exitOpen, L.elapsed);
  drawSmoke(ctx, L.smokes, L.elapsed);
  for (const g of L.guards) drawGuard(ctx, g, L.wasSeen);
  for (const c of L.cameras) drawCamera(ctx, c, false);
  drawThief(ctx, L.thief, run.frame);
  drawHUD(ctx, run);

  if (run.caughtTimer > 0) {
    ctx.fillStyle = 'rgba(255,40,30,0.22)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b60';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('SPOTTED!', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Back to the shadows — one life gone.', VIEW_W / 2, VIEW_H / 2 + 34);
  }

  if (run.mode === 'paused') {
    overlay(ctx, 'PAUSED', ['The guards wait for no one. Press P to keep moving.'], '#e8e4d8');
  } else if (run.mode === 'over') {
    overlay(ctx, 'BUSTED!', [
      `The crew got pinched in room ${run.stats ? run.stats.level : 1}.`,
      `Score ${run.stats ? run.stats.score : run.score} · ${run.stats ? Math.floor(run.stats.time) : 0}s on the job`,
      '',
      'Press R to run it back.',
    ], '#ff6b60');
  } else if (run.mode === 'win') {
    const s = run.stats;
    overlay(ctx, 'CLEAN GETAWAY', [
      `All ${s ? s.loot : 0} gems lifted · ${s ? Math.floor(s.time) : 0}s · ${s ? s.lives : 3} ${s && s.lives === 1 ? 'life' : 'lives'} left`,
      `SCORE ${s ? s.score : run.score}`,
      '',
      'The van is already three blocks away. Press R to steal again.',
    ], '#4ade80');
  }
}
