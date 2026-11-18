/* =========================================================
   Bip și Codul Magic — utilitare comune
   (DOM, salvare, sunete, voce, confetti, ferestre, mascota)
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP = window.BIP || {};

  /* ---------- DOM ---------- */
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(x => append(el, x)); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  const clone = o => JSON.parse(JSON.stringify(o));
  let uidN = 0;
  const uid = p => (p || 'b') + (++uidN).toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const num = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? (d || 0) : n; };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    let n = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    n = (n ^ (n >>> 13)) * 1274126177 | 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function roundRect(ctx, x, y, w, hh, r) {
    r = Math.max(0, Math.min(r, w / 2, hh / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
  function emoji(ctx, ch, x, y, size) {
    ctx.font = Math.round(size) + 'px ' + EMOJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y + size * 0.05);
  }
  function download(filename, text, type) {
    const blob = text instanceof Blob ? text : new Blob([text], { type: type || 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function pickFile(accept) {
    return new Promise(resolve => {
      const inp = h('input', { type: 'file', accept: accept || '.json,application/json' });
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        if (!f) { resolve(null); return; }
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => resolve(null);
        r.readAsText(f);
      });
      inp.click();
    });
  }

  /* ---------- salvare locală ---------- */
  const Store = {
    KEY: 'bip-cod-magic-v1',
    data: null,
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = {};
      d.v = 1;
      d.profiles = d.profiles || {};
      d.order = Array.isArray(d.order) ? d.order.filter(id => d.profiles[id]) : Object.keys(d.profiles);
      d.settings = Object.assign({ muted: false, speed: 1 }, d.settings || {});
      if (d.current && !d.profiles[d.current]) d.current = null;
      this.data = d;
    },
    save() {
      clearTimeout(this._t);
      try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* stocare indisponibilă */ }
    },
    saveSoon() {
      clearTimeout(this._t);
      this._t = setTimeout(() => this.save(), 350);
    }
  };
  window.addEventListener('beforeunload', () => { if (Store.data) Store.save(); });

  /* ---------- sunete (sintetizate, fără fișiere) ---------- */
  const Sound = {
    ctx: null,
    master: 1,
    muted() { return !!(Store.data && Store.data.settings.muted); },
    ac() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC(); } catch (e) { return null; }
      }
      if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* ignorăm */ } }
      return this.ctx;
    },
    tone(freq, dur, o) {
      o = o || {};
      const ac = this.ac(); if (!ac) return;
      const t = ac.currentTime + (o.at || 0);
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      const vol = (o.vol || 0.12) * this.master;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
    },
    noise(dur, o) {
      o = o || {};
      const ac = this.ac(); if (!ac) return;
      const t = ac.currentTime + (o.at || 0);
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = o.ftype || 'lowpass'; f.frequency.value = o.freq || 1200;
      const g = ac.createGain(); g.gain.value = (o.vol || 0.15) * this.master;
      src.connect(f); f.connect(g); g.connect(ac.destination);
      src.start(t);
    },
    play(name) {
      if (this.muted()) return;
      const fn = SFX[name] || SFX.click;
      try { fn(this); } catch (e) { /* fără sunet */ }
    },
    note(freq, dur) {
      if (this.muted()) return;
      try { this.tone(freq, Math.max(0.08, dur), { type: 'triangle', vol: 0.16, attack: 0.01 }); } catch (e) { /* */ }
    }
  };
  const SFX = {
    click: s => s.tone(660, 0.05, { type: 'triangle', vol: 0.06 }),
    pick: s => s.tone(420, 0.07, { vol: 0.07, slide: 640 }),
    snap: s => { s.tone(900, 0.04, { type: 'square', vol: 0.03 }); s.tone(1300, 0.05, { type: 'triangle', vol: 0.05, at: 0.03 }); },
    trash: s => { s.tone(500, 0.18, { type: 'sawtooth', vol: 0.035, slide: 120 }); s.noise(0.12, { vol: 0.05, freq: 900 }); },
    step: s => s.tone(240, 0.06, { type: 'triangle', vol: 0.07, slide: 300 }),
    turn: s => s.tone(520, 0.09, { vol: 0.05, slide: 780 }),
    bump: s => { s.tone(140, 0.2, { type: 'square', vol: 0.05, slide: 70 }); s.noise(0.15, { vol: 0.12, freq: 500 }); },
    gem: s => { s.tone(988, 0.12, { type: 'triangle', vol: 0.08 }); s.tone(1319, 0.18, { type: 'triangle', vol: 0.08, at: 0.08 }); s.tone(1976, 0.22, { vol: 0.05, at: 0.16 }); },
    win: s => { [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.22, { type: 'triangle', vol: 0.09, at: i * 0.11 })); s.tone(1568, 0.45, { vol: 0.05, at: 0.48 }); },
    fail: s => { s.tone(392, 0.18, { type: 'triangle', vol: 0.07 }); s.tone(311, 0.32, { type: 'triangle', vol: 0.07, at: 0.16, slide: 260 }); },
    star: s => s.tone(1760, 0.15, { vol: 0.06, slide: 2400 }),
    badge: s => { [784, 988, 1175, 1568].forEach((f, i) => s.tone(f, 0.25, { type: 'square', vol: 0.03, at: i * 0.09 })); },
    draw: s => s.tone(330, 0.05, { type: 'triangle', vol: 0.03, slide: 360 }),
    // sunete pentru Atelier
    pop: s => s.tone(700, 0.08, { vol: 0.12, slide: 240 }),
    coin: s => { s.tone(988, 0.08, { type: 'square', vol: 0.045 }); s.tone(1319, 0.25, { type: 'square', vol: 0.045, at: 0.08 }); },
    boing: s => s.tone(180, 0.35, { vol: 0.14, slide: 520 }),
    laser: s => s.tone(1400, 0.25, { type: 'sawtooth', vol: 0.045, slide: 180 }),
    drum: s => { s.tone(150, 0.18, { vol: 0.2, slide: 50 }); s.noise(0.08, { vol: 0.1, freq: 3000, ftype: 'highpass' }); },
    victory: s => {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(n =>
        s.tone(n[0], n[1] > 0.6 ? 0.5 : 0.15, { type: 'triangle', vol: 0.1, at: n[1] }));
    },
    beep: s => s.tone(880, 0.15, { type: 'square', vol: 0.045 })
  };

  /* ---------- voce (citire cu voce tare, dacă există o voce românească) ---------- */
  const Speech = {
    voice: null,
    init() {
      if (!('speechSynthesis' in window)) return;
      const pick = () => {
        const vs = window.speechSynthesis.getVoices() || [];
        const ro = vs.filter(v => /^ro([-_]|$)/i.test(v.lang));
        this.voice = ro.find(v => /natural|online/i.test(v.name)) || ro[0] || null;
        document.dispatchEvent(new Event('bip-voices'));
      };
      pick();
      try { window.speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) { window.speechSynthesis.onvoiceschanged = pick; }
    },
    available() { return !!this.voice; },
    speak(text) {
      if (!this.voice) return;
      const clean = String(text)
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}▶⏹↺↻⬆⬇⬅➡«»„”"]/gu, ' ')
        .replace(/\s+/g, ' ').trim();
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.voice = this.voice; u.lang = this.voice.lang; u.rate = 0.95; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      } catch (e) { /* */ }
    },
    stop() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* */ } }
  };

  /* ---------- confetti ---------- */
  const Confetti = {
    parts: [], running: false,
    burst(n) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const cv = document.getElementById('confetti'); if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      const W = window.innerWidth, H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      this.cv = cv; this.ctx = cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const colors = ['#FFC531', '#4A6CF7', '#22B35E', '#EF4E57', '#8A5CF5', '#0EA5B7', '#FF8FB1'];
      for (let i = 0; i < (n || 140); i++) {
        this.parts.push({
          x: W / 2 + (Math.random() - 0.5) * W * 0.5, y: H * 0.38 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4,
          w: 6 + Math.random() * 7, hh: 8 + Math.random() * 8, c: colors[i % colors.length],
          r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 0
        });
      }
      if (!this.running) { this.running = true; requestAnimationFrame(() => this.step()); }
    },
    step() {
      const ctx = this.ctx, W = window.innerWidth, H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);
      this.parts = this.parts.filter(p => p.y < H + 40 && p.life < 260);
      for (const p of this.parts) {
        p.life++; p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.hh / 2, p.w, p.hh * Math.abs(Math.cos(p.r * 1.7)) + 1);
        ctx.restore();
      }
      if (this.parts.length) requestAnimationFrame(() => this.step());
      else { this.running = false; ctx.clearRect(0, 0, W, H); }
    }
  };

  /* ---------- ferestre (modale) ---------- */
  const Modal = {
    stack: [],
    open(o) {
      const back = h('div', { class: 'modal-back' });
      const box = h('div', { class: 'modal ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true' });
      if (o.title) box.appendChild(h('h2', null, o.title));
      if (o.body) {
        if (typeof o.body === 'string') box.appendChild(h('div', { class: 'modal-body', html: o.body }));
        else append(box, o.body);
      }
      let closed = false;
      const handle = {
        el: box,
        close: () => {
          if (closed) return; closed = true;
          back.remove();
          const i = Modal.stack.indexOf(handle); if (i >= 0) Modal.stack.splice(i, 1);
          if (o.onClose) o.onClose();
        }
      };
      handle.dismiss = o.dismiss !== false;
      if (o.buttons && o.buttons.length) {
        const acts = h('div', { class: 'actions' });
        o.buttons.forEach(b => {
          const btn = h('button', { class: 'btn ' + (b.cls || ''), type: 'button' }, b.text);
          btn.addEventListener('click', () => {
            Sound.play('click');
            const r = b.onClick ? b.onClick(handle) : undefined;
            if (b.close !== false && r !== false) handle.close();
          });
          acts.appendChild(btn);
        });
        box.appendChild(acts);
      }
      back.appendChild(box);
      if (handle.dismiss) back.addEventListener('pointerdown', e => { if (e.target === back) handle.close(); });
      document.getElementById('modal-root').appendChild(back);
      this.stack.push(handle);
      setTimeout(() => {
        const f = box.querySelector('[autofocus]') || box.querySelector('.actions .btn:last-child');
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
      }, 40);
      return handle;
    },
    closeAll() { while (this.stack.length) this.stack[this.stack.length - 1].close(); },
    top() { return this.stack[this.stack.length - 1]; }
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const t = Modal.top(); if (t && t.dismiss) t.close(); }
  });

  /* ---------- mascota Bip (SVG original) ---------- */
  function bipSVG(o) {
    o = o || {};
    const mood = o.mood || 'happy';
    const up = o.arms === 'up';
    const mouths = {
      happy: '<path d="M47 63 Q60 75 73 63" stroke="#63F5FF" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
      sad: '<path d="M48 71 Q60 61 72 71" stroke="#63F5FF" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
      wow: '<ellipse cx="60" cy="67" rx="6.5" ry="7.5" fill="#63F5FF"/>',
      think: '<path d="M50 68 Q60 64 71 67" stroke="#63F5FF" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
    };
    const eyes = mood === 'happy'
      ? '<path d="M40 56 Q47 46 54 56" stroke="#63F5FF" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M66 56 Q73 46 80 56" stroke="#63F5FF" stroke-width="5" fill="none" stroke-linecap="round"/>'
      : mood === 'think'
        ? '<ellipse cx="49" cy="50" rx="6" ry="8" fill="#63F5FF"/><ellipse cx="75" cy="50" rx="6" ry="8" fill="#63F5FF"/><circle cx="51" cy="47" r="2" fill="#fff"/><circle cx="77" cy="47" r="2" fill="#fff"/>'
        : '<ellipse cx="47" cy="53" rx="7" ry="9" fill="#63F5FF"/><ellipse cx="73" cy="53" rx="7" ry="9" fill="#63F5FF"/><circle cx="49.5" cy="49.5" r="2.4" fill="#fff"/><circle cx="75.5" cy="49.5" r="2.4" fill="#fff"/>';
    const arms = up
      ? '<path d="M31 106 Q15 98 13 82" stroke="#2B3A67" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="13" cy="79" r="6" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>' +
        '<path d="M89 106 Q105 98 107 82" stroke="#2B3A67" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="107" cy="79" r="6" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>'
      : '<path d="M31 106 Q16 112 15 126" stroke="#2B3A67" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="15" cy="129" r="6" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>' +
        '<path d="M89 106 Q104 112 105 126" stroke="#2B3A67" stroke-width="5.5" fill="none" stroke-linecap="round"/><circle cx="105" cy="129" r="6" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>';
    return '<svg class="bip-svg" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<line x1="60" y1="25" x2="60" y2="11" stroke="#2B3A67" stroke-width="4" stroke-linecap="round"/>' +
      '<circle class="bip-ant" cx="60" cy="9" r="7" fill="' + (o.light || '#FF5A5F') + '" stroke="#2B3A67" stroke-width="3"/>' +
      '<rect x="9" y="44" width="13" height="25" rx="5" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>' +
      '<rect x="98" y="44" width="13" height="25" rx="5" fill="#FFB020" stroke="#2B3A67" stroke-width="3"/>' +
      '<rect x="18" y="24" width="84" height="66" rx="22" fill="#EAF2FF" stroke="#2B3A67" stroke-width="4"/>' +
      '<rect x="28" y="35" width="64" height="44" rx="15" fill="#1F2A55"/>' +
      '<g class="bip-eyes">' + eyes + '</g>' + (mouths[mood] || mouths.happy) +
      '<rect x="51" y="89" width="18" height="9" rx="2" fill="#9DB0D8" stroke="#2B3A67" stroke-width="3"/>' +
      arms +
      '<rect x="30" y="96" width="60" height="44" rx="14" fill="#4C8DFF" stroke="#2B3A67" stroke-width="4"/>' +
      '<circle cx="60" cy="116" r="7" fill="#FFD43B" stroke="#2B3A67" stroke-width="3"/>' +
      '<circle cx="44" cy="129" r="3" fill="#2B3A67" opacity=".35"/><circle cx="76" cy="129" r="3" fill="#2B3A67" opacity=".35"/>' +
      '</svg>';
  }
  function bipImage(o) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bipSVG(o).replace(' class="bip-svg"', ''));
    return img;
  }

  /* ---------- robotul văzut de sus (pentru labirint și desen) ---------- */
  function drawBotTop(ctx, x, y, s, angle, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(s * 0.04, s * 0.08, s * 0.46, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    // roți
    ctx.fillStyle = '#2B3A55';
    roundRect(ctx, -s * 0.52, -s * 0.3, s * 0.17, s * 0.6, s * 0.07); ctx.fill();
    roundRect(ctx, s * 0.35, -s * 0.3, s * 0.17, s * 0.6, s * 0.07); ctx.fill();
    // corp
    ctx.fillStyle = o.body || '#EAF2FF';
    ctx.strokeStyle = '#2B3A55';
    ctx.lineWidth = Math.max(2, s * 0.055);
    roundRect(ctx, -s * 0.38, -s * 0.38, s * 0.76, s * 0.76, s * 0.22); ctx.fill(); ctx.stroke();
    // urechi
    ctx.fillStyle = '#FFB020';
    roundRect(ctx, -s * 0.46, -s * 0.1, s * 0.1, s * 0.2, s * 0.04); ctx.fill();
    roundRect(ctx, s * 0.36, -s * 0.1, s * 0.1, s * 0.2, s * 0.04); ctx.fill();
    // ecranul (fața) în față
    ctx.fillStyle = '#1F2A55';
    roundRect(ctx, -s * 0.29, -s * 0.34, s * 0.58, s * 0.27, s * 0.1); ctx.fill();
    ctx.fillStyle = '#63F5FF';
    ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.21, s * 0.065, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.12, -s * 0.21, s * 0.065, 0, Math.PI * 2); ctx.fill();
    // antena
    ctx.fillStyle = o.light || '#FF5A5F';
    ctx.beginPath(); ctx.arc(0, s * 0.12, s * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.stroke();
    // săgeata direcției
    ctx.fillStyle = '#FFB020';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6); ctx.lineTo(-s * 0.13, -s * 0.44); ctx.lineTo(s * 0.13, -s * 0.44); ctx.closePath();
    ctx.fill(); ctx.lineWidth = Math.max(1.5, s * 0.03); ctx.stroke();
    ctx.restore();
  }

  BIP.util = { h, append, clone, uid, clamp, sleep, num, esc, mulberry, hash2, roundRect, emoji, EMOJI_FONT, download, pickFile, bipSVG, bipImage, drawBotTop };
  BIP.Store = Store;
  BIP.Sound = Sound;
  BIP.Speech = Speech;
  BIP.Confetti = Confetti;
  BIP.Modal = Modal;
})();
