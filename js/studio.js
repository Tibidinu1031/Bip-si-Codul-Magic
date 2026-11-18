/* =========================================================
   Bip și Codul Magic — Atelierul (scena cu personaje, evenimente, fire de execuție)
   Coordonate ca în programarea cu blocuri clasică: x ∈ [-240, 240], y ∈ [-180, 180]
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { clamp, roundRect, emoji, num, uid, bipImage, mulberry } = BIP.util;
  const Sound = BIP.Sound;
  const NOTE_HZ = BIP.OPT.NOTE_HZ;
  const SW = 480, SH = 360;
  const STOP = { stop: true };
  const rad = d => d * Math.PI / 180;
  const wrapDir = d => { let r = ((d + 180) % 360 + 360) % 360 - 180; if (r === -180) r = 180; return r; };

  /* ---------- biblioteca de personaje ---------- */
  const SPRITE_LIB = [
    { name: 'Bip', kind: 'bip' },
    { name: 'Steaua', costumes: ['⭐', '🌟'] },
    { name: 'Pisica', costumes: ['🐱', '😺', '😸'] },
    { name: 'Cățelul', costumes: ['🐶'] },
    { name: 'Racheta', costumes: ['🚀'] },
    { name: 'Peștele', costumes: ['🐠', '🐟'] },
    { name: 'Mingea', costumes: ['⚽', '🏀'] },
    { name: 'Fantoma', costumes: ['👻'] },
    { name: 'Fluturele', costumes: ['🦋'] },
    { name: 'Mărul', costumes: ['🍎', '🍏'] },
    { name: 'Dragonul', costumes: ['🐉', '🐲'] },
    { name: 'Inima', costumes: ['❤️', '💖', '💗'] },
    { name: 'Unicornul', costumes: ['🦄'] },
    { name: 'Dinozaurul', costumes: ['🦖', '🦕'] },
    { name: 'Mașina', costumes: ['🚗', '🚙'] },
    { name: 'Floarea', costumes: ['🌷', '🌸', '🌼', '🌻'] },
    { name: 'Luna', costumes: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] },
    { name: 'Extraterestrul', costumes: ['👽', '👾'] },
    { name: 'Albina', costumes: ['🐝'] },
    { name: 'Pinguinul', costumes: ['🐧'] },
    { name: 'Broasca', costumes: ['🐸'] },
    { name: 'Fața', costumes: ['😀', '😎', '🤩', '😜', '😴'] },
    { name: 'Vremea', costumes: ['☀️', '⛅', '🌧️', '⛈️', '🌈'] },
    { name: 'Pizza', costumes: ['🍕'] }
  ];
  function newSprite(lib, id) {
    return {
      id: id || uid('sp'), name: lib.name, kind: lib.kind || 'emoji',
      costumes: lib.costumes ? lib.costumes.slice() : null, costume: 0,
      x: 0, y: 0, dir: 90, size: 100, visible: true, scripts: []
    };
  }
  function spriteIcon(s) {
    if (s.kind === 'bip') return { svg: BIP.util.bipSVG({ mood: 'happy' }) };
    return { text: (s.costumes && s.costumes[s.costume || 0]) || '❓' };
  }

  /* ---------- decoruri (desenate) ---------- */
  function drawBackdrop(ctx, name) {
    const R = mulberry(name.length * 97 + 13);
    const g = (c1, c2, y1, y2) => { const gr = ctx.createLinearGradient(0, y1 || 0, 0, y2 || SH); gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr; };
    const stars = (n, maxY) => {
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.35 + R() * 0.65; ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(R() * SW, R() * (maxY || SH), R() * 1.6 + 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const cloud = (x, y, s) => {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      [[0, 0, 1], [0.9, -0.35, 0.8], [1.7, 0, 0.9], [0.9, 0.2, 0.9]].forEach(c => { ctx.beginPath(); ctx.arc(x + c[0] * 22 * s, y + c[1] * 22 * s, 20 * s * c[2], 0, Math.PI * 2); ctx.fill(); });
    };
    const hills = (c1, c2) => {
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(0, 290); ctx.quadraticCurveTo(120, 240, 250, 285); ctx.quadraticCurveTo(380, 325, 480, 270); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(0, 318); ctx.quadraticCurveTo(160, 290, 300, 316); ctx.quadraticCurveTo(410, 336, 480, 310); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.closePath(); ctx.fill();
    };
    switch (name) {
      case 'night':
        ctx.fillStyle = g('#0B1640', '#33489E'); ctx.fillRect(0, 0, SW, SH);
        stars(70, 250);
        ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(400, 60, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,200,140,.55)';
        [[392, 52, 5], [408, 70, 4], [404, 52, 3]].forEach(c => { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
        hills('#245C46', '#2F7A55');
        break;
      case 'space':
        ctx.fillStyle = g('#050816', '#1E1650'); ctx.fillRect(0, 0, SW, SH);
        stars(130);
        ctx.fillStyle = '#FF8A5B'; ctx.beginPath(); ctx.arc(90, 270, 40, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,150,.8)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(90, 270, 66, 14, -0.3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#7FD1FF'; ctx.beginPath(); ctx.arc(410, 70, 16, 0, Math.PI * 2); ctx.fill();
        break;
      case 'forest':
        ctx.fillStyle = g('#9ED8FF', '#E3F6FF', 0, 240); ctx.fillRect(0, 0, SW, SH);
        cloud(60, 60, 0.9); cloud(320, 40, 1.1);
        ctx.fillStyle = '#7CC66A'; ctx.fillRect(0, 250, SW, 110);
        ctx.fillStyle = '#69B858'; ctx.fillRect(0, 300, SW, 60);
        for (let i = 0; i < 9; i++) emoji(ctx, i % 3 ? '🌳' : '🌲', 30 + i * 55, 238 + (i % 2) * 8, 58);
        break;
      case 'ocean':
        ctx.fillStyle = g('#3FB4E8', '#0B4F7F'); ctx.fillRect(0, 0, SW, SH);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(60 + i * 80, 0); ctx.lineTo(100 + i * 80, 0); ctx.lineTo(40 + i * 80, 300); ctx.lineTo(20 + i * 80, 300); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(R() * SW, R() * 300, R() * 6 + 2, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#F2D59A'; ctx.beginPath(); ctx.moveTo(0, 330); ctx.quadraticCurveTo(240, 300, 480, 330); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
        emoji(ctx, '🌿', 40, 312, 40); emoji(ctx, '🐚', 420, 330, 26); emoji(ctx, '🌿', 300, 316, 34);
        break;
      case 'white':
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, SW, SH);
        break;
      default: // sky
        ctx.fillStyle = g('#6FC3FF', '#DDF2FF', 0, 280); ctx.fillRect(0, 0, SW, SH);
        cloud(50, 70, 1); cloud(260, 45, 0.8); cloud(380, 100, 1.1);
        ctx.fillStyle = '#86D26A'; ctx.beginPath(); ctx.moveTo(0, 300); ctx.quadraticCurveTo(240, 270, 480, 300); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
        break;
    }
  }

  /* =========================================================
     Scena
     ========================================================= */
  class Stage {
    constructor(canvas, project, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.p = project;
      this.opts = opts || {};
      this.threads = [];
      this.waiters = [];
      this.keys = new Set();
      this.mouse = { x: 0, y: 0, down: false };
      this.lastTick = 0;
      this.alive = true;
      this.bdCache = {};
      this.bipImgs = [bipImage({ mood: 'happy' }), bipImage({ mood: 'happy', arms: 'up' })];
      this.monitorVars = [];
      this.refreshMonitors();
      this._loop = this._loop.bind(this);
      this._pd = this._pd.bind(this); this._pm = this._pm.bind(this); this._pu = this._pu.bind(this);
      canvas.addEventListener('pointerdown', this._pd);
      window.addEventListener('pointermove', this._pm);
      window.addEventListener('pointerup', this._pu);
      // logica rulează la 30 de pași pe secundă, separat de desenare
      this._tickT = setInterval(() => this._tick(performance.now()), 1000 / 30);
      requestAnimationFrame(this._loop);
    }
    destroy() {
      this.alive = false;
      clearInterval(this._tickT);
      this.stopAll(true);
      this.cv.removeEventListener('pointerdown', this._pd);
      window.removeEventListener('pointermove', this._pm);
      window.removeEventListener('pointerup', this._pu);
    }
    setProject(p) { this.stopAll(true); this.p = p; this.refreshMonitors(); }
    get running() { return this.threads.length > 0; }
    emit(name, data) { if (this.opts.onEvent) this.opts.onEvent(name, data); }
    sprite(id) { return this.p.sprites.find(s => s.id === id); }
    costumes(s) { return s.kind === 'bip' ? [0, 1] : (s.costumes && s.costumes.length ? s.costumes : ['❓']); }
    radius(s) { return (s.kind === 'bip' ? 34 : 26) * (s.size || 100) / 100; }

    refreshMonitors() {
      const used = new Set();
      const walk = list => (list || []).forEach(b => {
        if ((b.type === 'setVar' || b.type === 'changeVar') && b.args && b.args.v) used.add(b.args.v);
        if (b.args && b.args.cond && b.args.cond.k === 'varCmp') used.add(b.args.cond.v);
        walk(b.body); walk(b.body2);
      });
      this.p.sprites.forEach(s => s.scripts.forEach(sc => walk(sc.blocks)));
      this.monitorVars = Array.from(used);
    }

    /* ---------- evenimente ---------- */
    greenFlag() {
      this.stopAll(false);
      this.refreshMonitors();
      Sound.ac();
      this.emit('flag');
      this.p.sprites.forEach(s => s.scripts.forEach(sc => {
        if (sc.blocks[0] && sc.blocks[0].type === 'whenFlag') this.startThread(s, sc);
      }));
      this._runningChanged();
    }
    keyDown(k) {
      this.keys.add(k);
      this.p.sprites.forEach(s => s.scripts.forEach(sc => {
        const hb = sc.blocks[0];
        if (hb && hb.type === 'whenKey' && (hb.args.k === k || hb.args.k === 'any')) {
          if (!this.threads.some(t => t.script === sc)) { this.startThread(s, sc); this.emit('key', { key: k, sprite: s.id }); }
        }
      }));
    }
    keyUp(k) { this.keys.delete(k); }
    clickSprite(s) {
      s.scripts.forEach(sc => {
        const hb = sc.blocks[0];
        if (hb && hb.type === 'whenClick' && !this.threads.some(t => t.script === sc)) { this.startThread(s, sc); this.emit('click', { sprite: s.id }); }
      });
    }
    startThread(sprite, script) {
      const th = { id: uid('t'), sprite: sprite, script: script, alive: true };
      this.threads.push(th);
      if (this.opts.onThread) this.opts.onThread(script, sprite, true);
      this.runList(script.blocks.slice(1), th)
        .catch(e => { if (e !== STOP && !(e && e.stop)) console.error(e); })
        .then(() => {
          th.alive = false;
          const i = this.threads.indexOf(th);
          if (i >= 0) this.threads.splice(i, 1);
          if (this.opts.onThread) this.opts.onThread(script, sprite, this.threads.some(t => t.script === script));
          this._runningChanged();
        });
      this._runningChanged();
    }
    stopAll(clearBubbles) {
      const old = this.threads;
      this.threads = [];
      old.forEach(t => { t.alive = false; if (this.opts.onThread) this.opts.onThread(t.script, t.sprite, false); });
      const ws = this.waiters; this.waiters = [];
      ws.forEach(w => w.r());
      if (clearBubbles) this.p.sprites.forEach(s => { s.say = null; });
      this._runningChanged();
    }
    _runningChanged() {
      const r = this.threads.length > 0;
      if (r !== this._wasRunning) { this._wasRunning = r; if (this.opts.onRunning) this.opts.onRunning(r); }
    }

    /* ---------- timp ---------- */
    chk(th) { if (!th.alive) throw STOP; }
    tick() { return new Promise(r => this.waiters.push({ t: 0, r: r })); }
    sleep(sec) { return new Promise(r => this.waiters.push({ t: performance.now() + Math.max(0, sec) * 1000, r: r })); }
    async yieldTick(th) { await this.tick(); this.chk(th); }
    _tick(now) {
      const ws = this.waiters; this.waiters = [];
      ws.forEach(w => { if (w.t <= now) w.r(); else this.waiters.push(w); });
    }

    /* ---------- interpretorul ---------- */
    async runList(list, th) {
      for (const b of list) { this.chk(th); await this.runBlock(b, th); }
    }
    async runBlock(b, th) {
      const s = th.sprite, a = b.args || {};
      switch (b.type) {
        case 'moveSteps': { const n = num(a.n); s.x += Math.sin(rad(s.dir)) * n; s.y += Math.cos(rad(s.dir)) * n; this.fence(s); break; }
        case 'turnCW': s.dir = wrapDir(s.dir + num(a.d)); break;
        case 'turnCCW': s.dir = wrapDir(s.dir - num(a.d)); break;
        case 'pointDir': s.dir = wrapDir(num(a.d)); break;
        case 'gotoXY': s.x = num(a.x); s.y = num(a.y); this.fence(s); break;
        case 'goRandom': s.x = Math.round(Math.random() * 400 - 200); s.y = Math.round(Math.random() * 300 - 150); break;
        case 'glideXY': await this.glide(s, num(a.s), num(a.x), num(a.y), th); break;
        case 'changeX': s.x += num(a.n); this.fence(s); break;
        case 'setX': s.x = num(a.n); this.fence(s); break;
        case 'changeY': s.y += num(a.n); this.fence(s); break;
        case 'setY': s.y = num(a.n); this.fence(s); break;
        case 'bounce': this.bounce(s); break;
        case 'sayFor': {
          const token = {};
          s.say = { text: String(a.t === undefined ? '' : a.t), token: token };
          await this.sleep(num(a.s));
          this.chk(th);
          if (s.say && s.say.token === token) s.say = null;
          break;
        }
        case 'say': s.say = String(a.t || '').length ? { text: String(a.t) } : null; break;
        case 'nextCostume': s.costume = ((s.costume || 0) + 1) % this.costumes(s).length; break;
        case 'changeSize': s.size = clamp((s.size || 100) + num(a.n), 5, 500); break;
        case 'setSize': s.size = clamp(num(a.n, 100), 5, 500); break;
        case 'hide': s.visible = false; break;
        case 'show': s.visible = true; break;
        case 'setBackdrop': this.p.backdrop = a.b || 'sky'; break;
        case 'playSound': Sound.play(a.s || 'pop'); break;
        case 'playNote': { const d = clamp(num(a.s, 0.5), 0.05, 10); Sound.note(NOTE_HZ[a.n] || 261.63, d); await this.sleep(d); break; }
        case 'wait': await this.sleep(num(a.s)); break;
        case 'repeat': {
          const n = Math.max(0, Math.round(num(a.n)));
          for (let i = 0; i < n; i++) { await this.runList(b.body || [], th); await this.yieldTick(th); }
          break;
        }
        case 'forever': {
          for (;;) { await this.runList(b.body || [], th); await this.yieldTick(th); }
        }
        // eslint-disable-next-line no-fallthrough
        case 'if':
          if (this.cond(a.cond, s)) await this.runList(b.body || [], th);
          break;
        case 'ifElse':
          await this.runList(this.cond(a.cond, s) ? (b.body || []) : (b.body2 || []), th);
          break;
        case 'repeatUntil':
          while (!this.cond(a.cond, s)) { await this.runList(b.body || [], th); await this.yieldTick(th); }
          break;
        case 'stopAll':
          this.emit('stopAll', { vars: Object.assign({}, this.p.vars) });
          this.stopAll(false);
          throw STOP;
        case 'setVar': this.setVar(a.v, num(a.n)); break;
        case 'changeVar': this.setVar(a.v, (num(this.p.vars[a.v]) || 0) + num(a.n)); break;
        default: break;
      }
    }
    setVar(v, val) {
      if (!v) return;
      this.p.vars[v] = Math.round(val * 100) / 100;
      if (this.monitorVars.indexOf(v) < 0) this.monitorVars.push(v);
      this.emit('var', { v: v, val: this.p.vars[v] });
    }
    async glide(s, sec, x, y, th) {
      const x0 = s.x, y0 = s.y, t0 = performance.now(), T = Math.max(0, sec) * 1000;
      while (true) {
        const p = T ? clamp((performance.now() - t0) / T, 0, 1) : 1;
        s.x = x0 + (x - x0) * p; s.y = y0 + (y - y0) * p;
        if (p >= 1) break;
        await this.yieldTick(th);
      }
      this.fence(s);
    }
    fence(s) {
      s.x = clamp(s.x, -SW / 2 - 15, SW / 2 + 15);
      s.y = clamp(s.y, -SH / 2 - 15, SH / 2 + 15);
    }
    bounce(s) {
      const r = this.radius(s);
      let d = s.dir;
      if (s.x - r < -SW / 2) { s.x = -SW / 2 + r; d = -d; } else if (s.x + r > SW / 2) { s.x = SW / 2 - r; d = -d; }
      if (s.y - r < -SH / 2) { s.y = -SH / 2 + r; d = 180 - d; } else if (s.y + r > SH / 2) { s.y = SH / 2 - r; d = 180 - d; }
      s.dir = wrapDir(d);
    }
    cond(c, s) {
      if (!c) return false;
      switch (c.k) {
        case 'touch': return this.touching(s, c.t);
        case 'key': return c.key === 'any' ? this.keys.size > 0 : this.keys.has(c.key);
        case 'mouse': return this.mouse.down;
        case 'varCmp': {
          const v = num(this.p.vars[c.v]), n = num(c.n);
          switch (c.op) {
            case '=': return v === n;
            case '<=': return v <= n;
            case '>': return v > n;
            case '<': return v < n;
            default: return v >= n;
          }
        }
        case 'chance': return Math.random() < 1 / Math.max(1, num(c.n, 1));
        default: return false;
      }
    }
    touching(s, t) {
      if (!s.visible) return false;
      const r = this.radius(s) * 0.85;
      switch (t) {
        case 'edge': return s.x - r <= -SW / 2 || s.x + r >= SW / 2 || s.y - r <= -SH / 2 || s.y + r >= SH / 2;
        case 'edgeB': return s.y - r <= -SH / 2;
        case 'edgeT': return s.y + r >= SH / 2;
        case 'edgeL': return s.x - r <= -SW / 2;
        case 'edgeR': return s.x + r >= SW / 2;
        case 'mouse': return Math.hypot(this.mouse.x - s.x, this.mouse.y - s.y) <= this.radius(s);
        default: {
          if (!t || t[0] !== '#') return false;
          const o = this.sprite(t.slice(1));
          if (!o || o === s || !o.visible) return false;
          return Math.hypot(o.x - s.x, o.y - s.y) <= (this.radius(s) + this.radius(o)) * 0.8;
        }
      }
    }

    /* ---------- mouse / deget pe scenă ---------- */
    _stageXY(e) {
      const r = this.cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * SW - SW / 2, y: SH / 2 - (e.clientY - r.top) / r.height * SH, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
    }
    hit(x, y) {
      for (let i = this.p.sprites.length - 1; i >= 0; i--) {
        const s = this.p.sprites[i];
        if (s.visible && Math.hypot(s.x - x, s.y - y) <= this.radius(s) * 1.05) return s;
      }
      return null;
    }
    _pd(e) {
      const m = this._stageXY(e);
      this.mouse.x = m.x; this.mouse.y = m.y; this.mouse.down = true;
      const s = this.hit(m.x, m.y);
      if (s) {
        e.preventDefault();
        this.drag = { s: s, ox: s.x - m.x, oy: s.y - m.y, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId };
        if (this.opts.onSelect) this.opts.onSelect(s);
      }
    }
    _pm(e) {
      const m = this._stageXY(e);
      this.mouse.x = clamp(m.x, -SW / 2, SW / 2); this.mouse.y = clamp(m.y, -SH / 2, SH / 2);
      if (m.inside && this.opts.onMouse) this.opts.onMouse(Math.round(m.x), Math.round(m.y));
      const d = this.drag;
      if (d && d.pid === e.pointerId) {
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
        if (d.moved && this.opts.draggable !== false) {
          d.s.x = Math.round(clamp(m.x + d.ox, -SW / 2, SW / 2));
          d.s.y = Math.round(clamp(m.y + d.oy, -SH / 2, SH / 2));
        }
      }
    }
    _pu(e) {
      this.mouse.down = false;
      const d = this.drag;
      if (d && d.pid === e.pointerId) {
        this.drag = null;
        if (!d.moved) this.clickSprite(d.s);
        else if (this.opts.onMoved) this.opts.onMoved(d.s);
      }
    }

    /* ---------- desenare ---------- */
    _loop(now) {
      if (!this.alive) return;
      this.draw();
      requestAnimationFrame(this._loop);
    }
    _backdrop(name, pw, ph) {
      const key = name + ':' + pw + 'x' + ph;
      if (!this.bdCache[key]) {
        const c = document.createElement('canvas');
        c.width = pw; c.height = ph;
        const cx = c.getContext('2d');
        cx.setTransform(pw / SW, 0, 0, ph / SH, 0, 0);
        drawBackdrop(cx, name);
        this.bdCache = {}; // păstrăm doar ultimul (memorie)
        this.bdCache[key] = c;
      }
      return this.bdCache[key];
    }
    draw() {
      const dpr = window.devicePixelRatio || 1;
      const W = this.cv.clientWidth || SW, H = this.cv.clientHeight || SH;
      const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (this.cv.width !== pw || this.cv.height !== ph) { this.cv.width = pw; this.cv.height = ph; }
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this._backdrop(this.p.backdrop || 'sky', pw, ph), 0, 0);
      const k = W / SW;
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      this.p.sprites.forEach(s => { if (s.visible) this.drawSprite(ctx, s); });
      this.p.sprites.forEach(s => { if (s.visible && s.say && s.say.text) this.drawBubble(ctx, s); });
      // monitoare pentru variabile
      let y = 8;
      this.monitorVars.forEach(v => {
        const txt = v + ': ' + (this.p.vars[v] === undefined ? 0 : this.p.vars[v]);
        ctx.font = '900 15px Nunito, sans-serif';
        const w = ctx.measureText(txt).width + 22;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(ctx, 8, y, w, 28, 10); ctx.fill();
        ctx.strokeStyle = '#F2603F'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#B23A1E'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, 19, y + 14.5);
        y += 34;
      });
      if (this.selectedId) {
        const s = this.sprite(this.selectedId);
        if (s && !this.running) {
          ctx.strokeStyle = 'rgba(74,108,247,.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(SW / 2 + s.x, SH / 2 - s.y, this.radius(s) + 6, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    drawSprite(ctx, s) {
      ctx.save();
      ctx.translate(SW / 2 + s.x, SH / 2 - s.y);
      ctx.rotate(rad((s.dir === undefined ? 90 : s.dir) - 90));
      const k = (s.size || 100) / 100;
      if (s.kind === 'bip') {
        const img = this.bipImgs[(s.costume || 0) % 2];
        const w = 64 * k, hh = 80 * k;
        if (img.complete && img.naturalWidth) ctx.drawImage(img, -w / 2, -hh / 2, w, hh);
        else { ctx.fillStyle = '#4C8DFF'; ctx.beginPath(); ctx.arc(0, 0, 26 * k, 0, Math.PI * 2); ctx.fill(); }
      } else {
        const cs = this.costumes(s);
        emoji(ctx, cs[(s.costume || 0) % cs.length], 0, 0, 52 * k);
      }
      ctx.restore();
    }
    drawBubble(ctx, s) {
      const text = String(s.say.text);
      ctx.font = '800 14px Nunito, sans-serif';
      const words = text.split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach(w => {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > 150 && line) { lines.push(line); line = w; } else line = t;
      });
      if (line) lines.push(line);
      const lh = 18;
      const w = Math.max(40, Math.min(170, Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 20));
      const hh = lines.length * lh + 14;
      const r = this.radius(s);
      let bx = SW / 2 + s.x + r * 0.5, by = SH / 2 - s.y - r - hh - 8;
      let flip = false;
      if (bx + w > SW - 4) { bx = SW / 2 + s.x - r * 0.5 - w; flip = true; }
      bx = clamp(bx, 4, SW - w - 4);
      by = clamp(by, 4, SH - hh - 4);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#B9C6DA'; ctx.lineWidth = 2;
      roundRect(ctx, bx, by, w, hh, 12); ctx.fill(); ctx.stroke();
      const tx = flip ? bx + w - 18 : bx + 18;
      ctx.beginPath(); ctx.moveTo(tx - 7, by + hh - 1); ctx.lineTo(tx + (flip ? 8 : -8), by + hh + 10); ctx.lineTo(tx + 7, by + hh - 1); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - 7, by + hh); ctx.lineTo(tx + (flip ? 8 : -8), by + hh + 10); ctx.lineTo(tx + 7, by + hh); ctx.stroke();
      ctx.fillStyle = '#1E2A4A'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 8 + i * lh));
    }
  }

  BIP.Stage = Stage;
  BIP.SPRITE_LIB = SPRITE_LIB;
  BIP.newSprite = newSprite;
  BIP.spriteIcon = spriteIcon;
})();
