'use strict';
// ================= TIỆN ÍCH CHUNG =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

const G = {
  run: null,
  busy: false,
  ev: [],
  settings: { speed: 1, sound: true, volume: 0.6, crt: true },
};

// ---------- RNG có seed (mulberry32) ----------
function hashSeed(str) {
  let h1 = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h1 = Math.imul(h1 ^ str.charCodeAt(i), 3432918353);
    h1 = (h1 << 13) | (h1 >>> 19);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^= h1 >>> 16) >>> 0;
}
function R() {
  if (!G.run) return Math.random();
  let t = (G.run.rng = (G.run.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const RI = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (arr) => arr[Math.floor(R() * arr.length)];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function weighted(obj) {
  let tot = 0;
  for (const k in obj) tot += obj[k];
  let x = R() * tot;
  for (const k in obj) {
    x -= obj[k];
    if (x < 0) return k;
  }
  return Object.keys(obj)[0];
}
function randomSeed() {
  const ch = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += ch[Math.floor(Math.random() * ch.length)];
  return s;
}

// ---------- Định dạng số ----------
function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  if (!isFinite(n)) return 'vô cực';
  const a = Math.abs(n);
  if (a >= 1e11) {
    const e = Math.floor(Math.log10(a));
    const m = n / Math.pow(10, e);
    return m.toFixed(3).replace('.', ',') + 'e' + e;
  }
  if (Number.isInteger(n)) return n.toLocaleString('vi-VN');
  if (a >= 1000) return Math.round(n).toLocaleString('vi-VN');
  return (Math.round(n * 100) / 100).toLocaleString('vi-VN');
}
const fx = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

// ---------- Markup mô tả: [m]+4[/] ----------
function fmt(s) {
  if (typeof s === 'function') s = s();
  if (!s) return '';
  s = String(s);
  let prev;
  do {
    prev = s;
    s = s.replace(/\[([\w$]+)\]([^\[]*?)\[\/\]/g, (m, t, x) => `<span class="t-${t === '$' ? 'money' : t}">${x}</span>`);
  } while (s !== prev);
  return s.replace(/\n/g, '<br>');
}

// ---------- Thời gian ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms / (G.settings.speed || 1)));
const waitRaw = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

// ---------- Âm thanh tổng hợp (WebAudio) ----------
const SND = {
  ctx: null,
  master: null,
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = G.settings.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  },
  tone(freq, dur, type = 'square', vol = 0.1, slide = 0, delay = 0) {
    if (!this.ctx || !G.settings.sound) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.08, freq = 2000, delay = 0, q = 1) {
    if (!this.ctx || !G.settings.sound) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
  },
  play(name, p = 0) {
    if (!this.ctx || !G.settings.sound) return;
    const up = Math.pow(1.059, Math.min(p, 24));
    switch (name) {
      case 'hover': this.tone(1400, 0.03, 'sine', 0.02); break;
      case 'select': this.tone(660, 0.06, 'triangle', 0.12); this.noise(0.04, 0.05, 3000); break;
      case 'deselect': this.tone(500, 0.06, 'triangle', 0.1); break;
      case 'card': this.noise(0.08, 0.12, 2500, 0, 0.8); break;
      case 'deal': this.noise(0.05, 0.08, 3500, 0, 0.8); break;
      case 'chips': this.tone(520 * up, 0.09, 'triangle', 0.13); this.tone(1040 * up, 0.06, 'sine', 0.04); break;
      case 'mult': this.tone(330 * up, 0.11, 'square', 0.07); this.tone(660 * up, 0.08, 'triangle', 0.06); break;
      case 'xmult': this.tone(392 * up, 0.16, 'square', 0.08); this.tone(587 * up, 0.16, 'square', 0.06, 0, 0.04); this.tone(784 * up, 0.2, 'triangle', 0.08, 0, 0.08); break;
      case 'money': this.tone(988, 0.07, 'square', 0.06); this.tone(1319, 0.18, 'square', 0.06, 0, 0.06); break;
      case 'button': this.tone(240, 0.06, 'square', 0.06); this.noise(0.03, 0.05, 1200); break;
      case 'buy': this.tone(988, 0.07, 'square', 0.07); this.tone(1319, 0.1, 'square', 0.06, 0, 0.06); this.tone(1760, 0.2, 'triangle', 0.06, 0, 0.12); break;
      case 'sell': this.tone(1319, 0.07, 'square', 0.06); this.tone(988, 0.15, 'square', 0.06, 0, 0.06); break;
      case 'msg': this.tone(700 * up, 0.08, 'triangle', 0.08); break;
      case 'again': this.tone(880, 0.06, 'square', 0.06); this.tone(1175, 0.1, 'square', 0.05, 0, 0.05); break;
      case 'tick': this.tone(1200 + Math.random() * 300, 0.025, 'square', 0.025); break;
      case 'score': this.tone(220, 0.25, 'sawtooth', 0.06, 220); this.noise(0.2, 0.06, 800); break;
      case 'glass': this.noise(0.3, 0.18, 5000, 0, 2); this.tone(2400, 0.15, 'sine', 0.04, -800); break;
      case 'tarot': this.tone(523, 0.3, 'sine', 0.08); this.tone(659, 0.3, 'sine', 0.07, 0, 0.07); this.tone(784, 0.4, 'sine', 0.07, 0, 0.14); break;
      case 'planet': this.tone(392, 0.4, 'sine', 0.08, 392); this.tone(784, 0.4, 'triangle', 0.05, 0, 0.1); break;
      case 'level': this.tone(440, 0.1, 'square', 0.06); this.tone(554, 0.1, 'square', 0.06, 0, 0.08); this.tone(659, 0.2, 'square', 0.06, 0, 0.16); break;
      case 'destroy': this.noise(0.35, 0.15, 600, 0, 0.7); this.tone(200, 0.3, 'sawtooth', 0.05, -150); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, 0, i * 0.1)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.06, 0, i * 0.18)); break;
      case 'error': this.tone(140, 0.15, 'square', 0.08); this.tone(110, 0.2, 'square', 0.08, 0, 0.08); break;
      case 'open': this.noise(0.3, 0.12, 1800, 0, 0.5); this.tone(300, 0.3, 'triangle', 0.06, 600); break;
      case 'flip': this.noise(0.06, 0.1, 4000); break;
      case 'boss': this.tone(110, 0.6, 'sawtooth', 0.08, -30); this.tone(165, 0.6, 'sawtooth', 0.05, -40, 0.05); break;
    }
  },
};
