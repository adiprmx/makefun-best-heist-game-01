// Every sound in the game, synthesised live with WebAudio — no audio files.
// The context only starts after the player's first gesture, so a silent
// screenshot run never trips on it; every call is guarded either way.
let ctx = null;
let muted = false;

export function initAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch (e) { /* no audio in this browser run — the game plays on silently */ }
}

export function setMuted(m) {
  muted = m;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  try {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* ignore */ }
}

function noisePuff(dur, vol) {
  if (!ctx || muted) return;
  try {
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = vol;
    s.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    s.start(t);
  } catch (e) { /* ignore */ }
}

export const sfx = {
  pickup() { tone(880, 0.09, 'sine', 0.18); tone(1318, 0.12, 'sine', 0.15, 0.07); },
  alarm() { tone(220, 0.25, 'sawtooth', 0.12, 0, 440); },
  caught() { tone(400, 0.4, 'square', 0.14, 0, 110); },
  smoke() { noisePuff(0.35, 0.12); },
  unlock() { tone(523, 0.1, 'triangle', 0.16); tone(784, 0.14, 'triangle', 0.16, 0.09); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, i * 0.11)); },
  click() { tone(660, 0.05, 'sine', 0.12); },
};
