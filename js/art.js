/* =========================================================
   Bip și Codul Magic — lumea desenului (Bip pictorul)
   Coordonate logice: 400 × 400, originea în centru, y în sus.
   Direcția 0 = sus, se întoarce în sensul acelor de ceas.
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { clamp, drawBotTop, sleep, num } = BIP.util;
  const { PEN_HEX, RAINBOW } = BIP.OPT;
  const Sound = BIP.Sound;
  const SIZE = 400;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const rad = d => d * Math.PI / 180;

  /* Rulează instant un program de desen (pentru modelul de urmat) */
  function trace(blocks, start) {
    const t = { x: start.x, y: start.y, h: start.h, pen: true };
    const segs = [];
    let guard = 0;
    const run = list => {
      list.forEach(b => {
        if (++guard > 20000) return;
        switch (b.type) {
          case 'artMove': {
            const d = num(b.args.n);
            const x2 = t.x + Math.sin(rad(t.h)) * d, y2 = t.y + Math.cos(rad(t.h)) * d;
            if (t.pen) segs.push({ x1: t.x, y1: t.y, x2: x2, y2: y2 });
            t.x = x2; t.y = y2; break;
          }
          case 'artRight': t.h += num(b.args.d); break;
          case 'artLeft': t.h -= num(b.args.d); break;
          case 'penUp': t.pen = false; break;
          case 'penDown': t.pen = true; break;
          case 'repeat': for (let i = 0; i < Math.round(num(b.args.n)); i++) run(b.body || []); break;
          default: break;
        }
      });
    };
    run(blocks);
    return segs;
  }

  function samplePts(segs, step) {
    const pts = [];
    segs.forEach(s => {
      const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      const n = Math.max(1, Math.ceil(L / step));
      for (let i = 0; i <= n; i++) pts.push([s.x1 + (s.x2 - s.x1) * i / n, s.y1 + (s.y2 - s.y1) * i / n]);
    });
    return pts;
  }
  function distSeg(px, py, s) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - s.x1) * dx + (py - s.y1) * dy) / L2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
  }
  function missing(pts, segs, tol) {
    let miss = 0;
    pts.forEach(p => { if (!segs.some(s => distSeg(p[0], p[1], s) <= tol)) miss++; });
    return miss;
  }

  class ArtWorld {
    constructor(canvas, level) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.level = level;
      this.start = level.start || { x: 0, y: 0, h: 0 };
      this.target = level.free ? [] : trace(BIP.blocks.build(level.sol), this.start);
      this.speed = 1;
      this.variantCount = 1;
      this.alive = true;
      this.reset();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }
    destroy() {
      this.alive = false;
      if (this.anim) { const a = this.anim; this.anim = null; a.resolve(); }
    }
    setSpeed(f) { this.speed = f; }
    dur(ms) { return ms * this.speed; }
    loadVariant() { this.reset(); }
    reset() {
      this.t = { x: this.start.x, y: this.start.y, h: this.start.h, pen: true, color: PEN_HEX.red, width: 5, rainbow: false };
      this.disp = { x: this.t.x, y: this.t.y, h: this.t.h };
      this.segs = [];
      this.cur = null;
      this.anim = null;
      this.ci = 0;
      this.state = 'idle';
      this.light = '#FF5A5F';
    }
    atGoal() { return false; }
    sense() { return false; }

    tween(to, ms, seg) {
      return new Promise(resolve => {
        this.cur = seg || null;
        const a = this.anim = { from: { x: this.disp.x, y: this.disp.y, h: this.disp.h }, to: to, t0: performance.now(), dur: Math.max(16, ms), resolve: resolve };
        setTimeout(() => { if (this.anim === a) { this.disp.x = to.x; this.disp.y = to.y; this.disp.h = to.h; this.anim = null; resolve(); } }, a.dur + 120);
      });
    }
    async exec(b) {
      this.state = 'run';
      const a = b.args || {};
      switch (b.type) {
        case 'artMove': return this.move(num(a.n));
        case 'artRight': return this.turn(num(a.d));
        case 'artLeft': return this.turn(-num(a.d));
        case 'penColor':
          if (a.c === 'rainbow') this.t.rainbow = true;
          else { this.t.rainbow = false; this.t.color = PEN_HEX[a.c] || PEN_HEX.red; }
          Sound.play('click');
          return sleep(this.dur(120));
        case 'penSize': this.t.width = clamp(num(a.n), 1, 30); return sleep(this.dur(80));
        case 'penUp': this.t.pen = false; Sound.play('click'); return sleep(this.dur(100));
        case 'penDown': this.t.pen = true; Sound.play('click'); return sleep(this.dur(100));
        default: return undefined;
      }
    }
    async move(d) {
      const x2 = this.t.x + Math.sin(rad(this.t.h)) * d, y2 = this.t.y + Math.cos(rad(this.t.h)) * d;
      let seg = null;
      if (this.t.pen) {
        const color = this.t.rainbow ? RAINBOW[this.ci++ % RAINBOW.length] : this.t.color;
        seg = { x1: this.t.x, y1: this.t.y, x2: x2, y2: y2, color: color, w: this.t.width };
      }
      Sound.play('draw');
      const ms = clamp(Math.abs(d) * 4.2, 160, 1100);
      await this.tween({ x: x2, y: y2, h: this.t.h }, this.dur(ms), seg);
      this.t.x = x2; this.t.y = y2;
      if (seg) this.segs.push(seg);
      this.cur = null;
      if (Math.abs(x2) > 600 || Math.abs(y2) > 600) throw { fail: 'offPaper' };
    }
    async turn(deg) {
      Sound.play('turn');
      const ms = clamp(Math.abs(deg) * 2.6, 120, 650);
      await this.tween({ x: this.t.x, y: this.t.y, h: this.t.h + deg }, this.dur(ms));
      this.t.h += deg;
    }
    finalCheck() {
      if (this.level.free) {
        return this.segs.length >= (this.level.minSegs || 4) ? { ok: true } : { fail: 'free' };
      }
      if (!this.segs.length) return { fail: 'missing' };
      const tp = samplePts(this.target, 4), dp = samplePts(this.segs, 4);
      const missT = missing(tp, this.segs, 6);
      const extra = missing(dp, this.target, 6);
      if (missT <= Math.max(1, tp.length * 0.01) && extra <= Math.max(1, dp.length * 0.01)) return { ok: true };
      // poate e desenul în oglindă? (s-a întors pe partea cealaltă)
      const mirror = this.target.map(s => {
        const m = p => { // oglindire față de dreapta care trece prin start, pe direcția inițială
          const hx = Math.sin(rad(this.start.h)), hy = Math.cos(rad(this.start.h));
          const vx = p[0] - this.start.x, vy = p[1] - this.start.y;
          const along = vx * hx + vy * hy;
          return [this.start.x + 2 * along * hx - vx, this.start.y + 2 * along * hy - vy];
        };
        const a = m([s.x1, s.y1]), b = m([s.x2, s.y2]);
        return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
      });
      const mm = missing(samplePts(mirror, 4), this.segs, 6);
      if (mm <= Math.max(1, tp.length * 0.01) && missing(dp, mirror, 6) <= Math.max(1, dp.length * 0.01)) return { fail: 'mirror' };
      return { fail: missT > extra ? 'missing' : 'extra' };
    }
    async celebrate() {
      this.light = '#3DDC84';
      this.state = 'win';
      await this.tween({ x: this.t.x, y: this.t.y, h: this.t.h + 360 }, 700);
      this.t.h += 360;
    }
    toPNG(cb) {
      const c = document.createElement('canvas');
      c.width = 800; c.height = 800;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 800);
      ctx.setTransform(2, 0, 0, 2, 400, 400);
      this._drawSegs(ctx, this.segs, 1);
      c.toBlob(cb, 'image/png');
    }

    /* ---------- desenare ---------- */
    _loop(now) {
      if (!this.alive) return;
      const a = this.anim;
      if (a) {
        const p = clamp((now - a.t0) / a.dur, 0, 1), e = ease(p);
        this.disp.x = a.from.x + (a.to.x - a.from.x) * e;
        this.disp.y = a.from.y + (a.to.y - a.from.y) * e;
        this.disp.h = a.from.h + (a.to.h - a.from.h) * e;
        if (p >= 1) { this.anim = null; a.resolve(); }
      }
      this.draw(now);
      requestAnimationFrame(this._loop);
    }
    _drawSegs(ctx, segs, k) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      segs.forEach(s => {
        ctx.strokeStyle = s.color; ctx.lineWidth = s.w * k;
        ctx.beginPath(); ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x2, -s.y2); ctx.stroke();
      });
    }
    draw(now) {
      const dpr = window.devicePixelRatio || 1;
      const W = this.cv.clientWidth || 400, H = this.cv.clientHeight || 400;
      if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) {
        this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
      }
      const ctx = this.ctx;
      const k = Math.min(W, H) / SIZE;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * W / 2, dpr * H / 2);
      // hârtie cu pătrățele (25 de pași)
      for (let i = -8; i <= 8; i++) {
        ctx.strokeStyle = i % 4 === 0 ? '#D5E1F2' : '#EDF2FA';
        ctx.lineWidth = i === 0 ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(i * 25, -200); ctx.lineTo(i * 25, 200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-200, i * 25); ctx.lineTo(200, i * 25); ctx.stroke();
      }
      // modelul
      if (this.target.length) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(120, 145, 190, .28)'; ctx.lineWidth = 13;
        this.target.forEach(s => { ctx.beginPath(); ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x2, -s.y2); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(120, 145, 190, .55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]);
        this.target.forEach(s => { ctx.beginPath(); ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x2, -s.y2); ctx.stroke(); });
        ctx.setLineDash([]);
      }
      // ce a desenat Bip
      this._drawSegs(ctx, this.segs, 1);
      if (this.cur) {
        ctx.strokeStyle = this.cur.color; ctx.lineWidth = this.cur.w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(this.cur.x1, -this.cur.y1); ctx.lineTo(this.disp.x, -this.disp.y); ctx.stroke();
      }
      // punctul de start
      ctx.fillStyle = 'rgba(34,179,94,.25)';
      ctx.beginPath(); ctx.arc(this.start.x, -this.start.y, 9, 0, Math.PI * 2); ctx.fill();
      // Bip cu creionul
      drawBotTop(ctx, this.disp.x, -this.disp.y, 34, rad(this.disp.h), { light: this.light });
      ctx.fillStyle = this.t.pen ? (this.t.rainbow ? RAINBOW[this.ci % RAINBOW.length] : this.t.color) : '#B8C4D6';
      ctx.strokeStyle = '#2B3A55'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.disp.x, -this.disp.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  BIP.ArtWorld = ArtWorld;
  BIP.artTrace = trace;
})();
