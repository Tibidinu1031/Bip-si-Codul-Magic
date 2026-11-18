/* =========================================================
   Bip și Codul Magic — lumea labirint (grilă) + executorul de programe
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { roundRect, emoji, hash2, clamp, drawBotTop, sleep } = BIP.util;
  const Sound = BIP.Sound;

  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          // N, E, S, V
  const DIR_OF = { N: 0, E: 1, S: 2, W: 3, V: 3 };

  const THEMES = {
    forest: { ground: '#93D36E', ground2: '#8ACB65', path: '#F2DDA9', pathEdge: '#DDBF83', line: 'rgba(150,110,50,.22)', obstacles: ['🌳', '🌲', '🌳'], deco: ['🌼', '🌷', '🍄', '🌿'], decoRate: 0.22, water: '#5CC1F0' },
    desert: { ground: '#F3CF86', ground2: '#EDC676', path: '#FFF2D2', pathEdge: '#E6C98E', line: 'rgba(170,120,40,.22)', obstacles: ['🌵', '🌵', '🌴'], deco: ['🌾', '🦎', '🐚'], decoRate: 0.14, water: '#4FC3F7' },
    city: { ground: '#C9D3E2', ground2: '#C1CCDC', path: '#596377', pathEdge: '#474F61', line: 'rgba(255,255,255,.28)', obstacles: ['🏢', '🏬', '🏠', '🏫'], deco: ['🌳', '🚲', '🌷'], decoRate: 0.16, water: '#5CC1F0', dark: true }
  };

  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  class MazeWorld {
    constructor(canvas, level) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.level = level;
      this.theme = THEMES[level.theme] || THEMES.forest;
      this.speed = 1;
      this.maps = level.maps || [level.map];
      this.dirs = level.dirs || this.maps.map(() => level.dir || 'E');
      this.variantCount = this.maps.length;
      this.fx = [];
      this.alive = true;
      this.loadVariant(0);
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }
    destroy() {
      this.alive = false;
      if (this.anim) { const a = this.anim; this.anim = null; a.resolve(); }
    }
    setSpeed(f) { this.speed = f; }
    dur(ms) { return ms * this.speed; }

    loadVariant(i) {
      this.variant = i;
      const map = this.maps[i];
      this.rows = map.length;
      this.cols = Math.max.apply(null, map.map(r => r.length));
      this.tiles = [];
      this.gems = [];
      for (let y = 0; y < this.rows; y++) {
        const row = [];
        for (let x = 0; x < this.cols; x++) {
          let ch = map[y][x] || ' ';
          if (ch === 'R') { this.start = { x, y }; ch = '.'; }
          else if (ch === 'B') { this.goal = { x, y }; ch = '.'; }
          else if (ch === 'G') { this.gems.push(x + ',' + y); ch = '.'; }
          row.push(ch);
        }
        this.tiles.push(row);
      }
      this.startDir = DIR_OF[this.dirs[i]] || 0;
      this.bg = null;
      this.reset();
    }
    reset() {
      this.bot = { x: this.start.x, y: this.start.y, dir: this.startDir, ang: this.startDir * 90 };
      this.disp = { x: this.bot.x, y: this.bot.y, ang: this.bot.ang, hop: 0 };
      this.gemsLeft = new Set(this.gems);
      this.anim = null;
      this.fx = [];
      this.light = '#FF5A5F';
      this.state = 'idle';
      this.won = false;
      this.blocked = null;
    }

    /* ---------- interogări ---------- */
    isPath(x, y) { return y >= 0 && y < this.rows && x >= 0 && x < this.cols && this.tiles[y][x] === '.'; }
    inGrid(x, y) { return y >= 0 && y < this.rows && x >= 0 && x < this.cols; }
    ahead(off) { const d = (this.bot.dir + (off || 0) + 4) % 4; return { x: this.bot.x + DX[d], y: this.bot.y + DY[d] }; }
    atGoal() { return this.bot.x === this.goal.x && this.bot.y === this.goal.y; }
    sense(c) {
      const k = c && c.k;
      if (k === 'pathAhead') { const p = this.ahead(0); return this.isPath(p.x, p.y); }
      if (k === 'pathLeft') { const p = this.ahead(-1); return this.isPath(p.x, p.y); }
      if (k === 'pathRight') { const p = this.ahead(1); return this.isPath(p.x, p.y); }
      if (k === 'gemHere') return this.gemsLeft.has(this.bot.x + ',' + this.bot.y);
      return false;
    }
    finalCheck() {
      if (this.atGoal() && this.gemsLeft.size === 0) return { ok: true };
      if (this.atGoal()) return { fail: 'missedGems' };
      return { fail: 'notReached' };
    }

    /* ---------- acțiuni ---------- */
    tween(to, ms) {
      return new Promise(resolve => {
        const a = this.anim = { from: { x: this.disp.x, y: this.disp.y, ang: this.disp.ang }, to: to, t0: performance.now(), dur: Math.max(16, ms), resolve: resolve, hop: to.hop || 0 };
        // dacă fila e ascunsă (fără animații), terminăm oricum mișcarea la timp
        setTimeout(() => { if (this.anim === a) { this.disp.x = to.x; this.disp.y = to.y; this.disp.ang = to.ang; this.disp.hop = 0; this.anim = null; resolve(); } }, a.dur + 120);
      });
    }
    async exec(b) {
      this.state = 'run';
      switch (b.type) {
        case 'move': return this.move();
        case 'turnLeft': return this.turn(-1);
        case 'turnRight': return this.turn(1);
        case 'collect': return this.collect();
        default: return undefined;
      }
    }
    async move() {
      const n = this.ahead(0);
      if (!this.isPath(n.x, n.y)) {
        Sound.play('bump');
        this.blocked = n;
        const bx = this.bot.x + (n.x - this.bot.x) * 0.32, by = this.bot.y + (n.y - this.bot.y) * 0.32;
        await this.tween({ x: bx, y: by, ang: this.disp.ang }, this.dur(170));
        this.fx.push({ type: 'boom', x: (this.bot.x + n.x) / 2, y: (this.bot.y + n.y) / 2, t0: performance.now(), dur: 900 });
        await this.tween({ x: this.bot.x, y: this.bot.y, ang: this.disp.ang }, this.dur(200));
        throw { fail: this.inGrid(n.x, n.y) ? 'blocked' : 'edge' };
      }
      Sound.play('step');
      await this.tween({ x: n.x, y: n.y, ang: this.bot.ang, hop: 0.12 }, this.dur(360));
      this.bot.x = n.x; this.bot.y = n.y;
      if (this.atGoal() && this.gemsLeft.size === 0) { this.won = true; throw { win: true }; }
    }
    async turn(d) {
      Sound.play('turn');
      const target = this.bot.ang + d * 90;
      await this.tween({ x: this.bot.x, y: this.bot.y, ang: target }, this.dur(260));
      this.bot.ang = target;
      this.bot.dir = (this.bot.dir + d + 4) % 4;
    }
    async collect() {
      const k = this.bot.x + ',' + this.bot.y;
      if (!this.gemsLeft.has(k)) {
        Sound.play('bump');
        this.fx.push({ type: 'text', text: '?', x: this.bot.x, y: this.bot.y, t0: performance.now(), dur: 900, color: '#EF4E57' });
        const a = this.disp.ang;
        await this.tween({ x: this.bot.x, y: this.bot.y, ang: a - 12 }, this.dur(90));
        await this.tween({ x: this.bot.x, y: this.bot.y, ang: a + 12 }, this.dur(120));
        await this.tween({ x: this.bot.x, y: this.bot.y, ang: a }, this.dur(90));
        throw { fail: 'noGem' };
      }
      this.gemsLeft.delete(k);
      Sound.play('gem');
      for (let i = 0; i < 10; i++) this.fx.push({ type: 'spark', x: this.bot.x, y: this.bot.y, a: i / 10 * Math.PI * 2, t0: performance.now(), dur: 650 });
      this.fx.push({ type: 'text', text: '+1 💎', x: this.bot.x, y: this.bot.y, t0: performance.now(), dur: 900, color: '#0A8291' });
      await sleep(this.dur(260));
      if (this.atGoal() && this.gemsLeft.size === 0) { this.won = true; throw { win: true }; }
    }
    async celebrate() {
      this.light = '#3DDC84';
      this.state = 'win';
      for (let i = 0; i < 18; i++) this.fx.push({ type: 'spark', x: this.bot.x, y: this.bot.y, a: i / 18 * Math.PI * 2, t0: performance.now() + (i % 3) * 120, dur: 900, big: true });
      await this.tween({ x: this.bot.x, y: this.bot.y, ang: this.bot.ang + 360, hop: 0.35 }, 700);
      this.bot.ang += 360;
    }

    /* ---------- desenare ---------- */
    _loop(now) {
      if (!this.alive) return;
      this._update(now);
      this.draw(now);
      requestAnimationFrame(this._loop);
    }
    _update(now) {
      const a = this.anim;
      if (!a) return;
      const p = clamp((now - a.t0) / a.dur, 0, 1);
      const e = ease(p);
      this.disp.x = a.from.x + (a.to.x - a.from.x) * e;
      this.disp.y = a.from.y + (a.to.y - a.from.y) * e;
      this.disp.ang = a.from.ang + (a.to.ang - a.from.ang) * e;
      this.disp.hop = Math.sin(p * Math.PI) * (a.hop || 0);
      if (p >= 1) { this.anim = null; this.disp.hop = 0; a.resolve(); }
    }
    _size() {
      const dpr = window.devicePixelRatio || 1;
      const W = this.cv.clientWidth || 400, H = this.cv.clientHeight || 400;
      if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) {
        this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
        this.bg = null;
      }
      this.W = W; this.H = H; this.dpr = dpr;
      this.ts = Math.floor(Math.min(W / this.cols, H / this.rows));
      this.ox = Math.floor((W - this.ts * this.cols) / 2);
      this.oy = Math.floor((H - this.ts * this.rows) / 2);
    }
    _drawStatic() {
      const c = document.createElement('canvas');
      c.width = this.cv.width; c.height = this.cv.height;
      const ctx = c.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const T = this.theme, ts = this.ts, ox = this.ox, oy = this.oy;
      ctx.fillStyle = T.ground; ctx.fillRect(0, 0, this.W, this.H);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if ((x + y) % 2) { ctx.fillStyle = T.ground2; ctx.fillRect(ox + x * ts, oy + y * ts, ts, ts); }
      }
      // apa
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (this.tiles[y][x] !== '~') continue;
        ctx.fillStyle = T.water;
        roundRect(ctx, ox + x * ts + 1, oy + y * ts + 1, ts - 2, ts - 2, ts * 0.2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = Math.max(1.5, ts * 0.04);
        for (let k = 0; k < 2; k++) {
          const yy = oy + y * ts + ts * (0.38 + k * 0.28);
          ctx.beginPath();
          ctx.moveTo(ox + x * ts + ts * 0.2, yy);
          ctx.quadraticCurveTo(ox + x * ts + ts * 0.35, yy - ts * 0.08, ox + x * ts + ts * 0.5, yy);
          ctx.quadraticCurveTo(ox + x * ts + ts * 0.65, yy + ts * 0.08, ox + x * ts + ts * 0.8, yy);
          ctx.stroke();
        }
      }
      // drumul
      const pad = ts * 0.08;
      ctx.fillStyle = T.pathEdge;
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (!this.isPath(x, y)) continue;
        roundRect(ctx, ox + x * ts + pad - 2, oy + y * ts + pad - 2, ts - 2 * pad + 4, ts - 2 * pad + 4, ts * 0.24); ctx.fill();
        if (this.isPath(x + 1, y)) ctx.fillRect(ox + x * ts + ts / 2, oy + y * ts + pad - 2, ts, ts - 2 * pad + 4);
        if (this.isPath(x, y + 1)) ctx.fillRect(ox + x * ts + pad - 2, oy + y * ts + ts / 2, ts - 2 * pad + 4, ts);
      }
      ctx.fillStyle = T.path;
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (!this.isPath(x, y)) continue;
        roundRect(ctx, ox + x * ts + pad, oy + y * ts + pad, ts - 2 * pad, ts - 2 * pad, ts * 0.2); ctx.fill();
        if (this.isPath(x + 1, y)) ctx.fillRect(ox + x * ts + ts / 2, oy + y * ts + pad, ts, ts - 2 * pad);
        if (this.isPath(x, y + 1)) ctx.fillRect(ox + x * ts + pad, oy + y * ts + ts / 2, ts - 2 * pad, ts);
      }
      // marcaje pentru numărarea pașilor
      ctx.strokeStyle = T.line; ctx.lineWidth = Math.max(1, ts * 0.025);
      ctx.setLineDash([ts * 0.08, ts * 0.08]);
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (!this.isPath(x, y)) continue;
        if (this.isPath(x + 1, y)) { ctx.beginPath(); ctx.moveTo(ox + (x + 1) * ts, oy + y * ts + pad + 3); ctx.lineTo(ox + (x + 1) * ts, oy + (y + 1) * ts - pad - 3); ctx.stroke(); }
        if (this.isPath(x, y + 1)) { ctx.beginPath(); ctx.moveTo(ox + x * ts + pad + 3, oy + (y + 1) * ts); ctx.lineTo(ox + (x + 1) * ts - pad - 3, oy + (y + 1) * ts); ctx.stroke(); }
      }
      ctx.setLineDash([]);
      // decor și obstacole
      const seed = (this.level.id || 'x').length * 7 + this.variant;
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        const ch = this.tiles[y][x];
        if (ch === '.' || ch === '~') continue;
        const r = hash2(x, y, seed);
        const cx = ox + x * ts + ts / 2, cy = oy + y * ts + ts / 2;
        if (ch === '#') emoji(ctx, T.obstacles[Math.floor(r * T.obstacles.length)], cx, cy, ts * 0.78);
        else if (r < T.decoRate) {
          const r2 = hash2(y, x, seed + 3);
          emoji(ctx, T.deco[Math.floor(r2 * T.deco.length)], cx + (r2 - 0.5) * ts * 0.4, cy + (r - 0.1) * ts * 0.5, ts * 0.34);
        } else if (r > 0.86 && ch === ' ') {
          emoji(ctx, T.obstacles[Math.floor(r * 10) % T.obstacles.length], cx, cy, ts * 0.62);
        }
      }
      this.bg = c;
    }
    draw(now) {
      this._size();
      if (!this.bg) this._drawStatic();
      const ctx = this.ctx, ts = this.ts, ox = this.ox, oy = this.oy;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.bg, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const t = now / 1000;
      // ținta (bateria)
      const gx = ox + this.goal.x * ts + ts / 2, gy = oy + this.goal.y * ts + ts / 2;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      ctx.fillStyle = 'rgba(255, 214, 64,' + (0.35 + pulse * 0.3) + ')';
      ctx.beginPath(); ctx.arc(gx, gy, ts * (0.34 + pulse * 0.06), 0, Math.PI * 2); ctx.fill();
      emoji(ctx, '🔋', gx, gy, ts * 0.58);
      // diamante
      this.gemsLeft.forEach(k => {
        const p = k.split(',');
        const x = +p[0], y = +p[1];
        const bobY = Math.sin(t * 3 + x + y) * ts * 0.05;
        ctx.fillStyle = 'rgba(14,165,183,.28)';
        ctx.beginPath(); ctx.arc(ox + x * ts + ts / 2, oy + y * ts + ts / 2, ts * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.beginPath(); ctx.ellipse(ox + x * ts + ts / 2, oy + y * ts + ts * 0.74, ts * 0.18, ts * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        emoji(ctx, '💎', ox + x * ts + ts / 2, oy + y * ts + ts / 2 + bobY, ts * 0.5);
      });
      // săgeata „înainte” (ajută la orientare)
      if (this.state === 'idle' && !this.anim) {
        const n = this.ahead(0);
        if (this.inGrid(n.x, n.y)) {
          ctx.save();
          ctx.translate(ox + n.x * ts + ts / 2, oy + n.y * ts + ts / 2);
          ctx.rotate(this.bot.dir * Math.PI / 2);
          ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4);
          ctx.fillStyle = this.theme.dark ? '#FFFFFF' : '#1E2A4A';
          ctx.beginPath();
          ctx.moveTo(0, -ts * 0.22); ctx.lineTo(ts * 0.18, ts * 0.02); ctx.lineTo(ts * 0.07, ts * 0.02);
          ctx.lineTo(ts * 0.07, ts * 0.2); ctx.lineTo(-ts * 0.07, ts * 0.2); ctx.lineTo(-ts * 0.07, ts * 0.02); ctx.lineTo(-ts * 0.18, ts * 0.02);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      // obstacol lovit
      if (this.blocked && this.state !== 'idle') {
        const bx = ox + this.blocked.x * ts + ts / 2, by = oy + this.blocked.y * ts + ts / 2;
        ctx.strokeStyle = '#EF4E57'; ctx.lineWidth = Math.max(3, ts * 0.08); ctx.lineCap = 'round';
        const s = ts * 0.2;
        ctx.beginPath(); ctx.moveTo(bx - s, by - s); ctx.lineTo(bx + s, by + s); ctx.moveTo(bx + s, by - s); ctx.lineTo(bx - s, by + s); ctx.stroke();
      }
      // Bip
      const bx = ox + this.disp.x * ts + ts / 2, by = oy + this.disp.y * ts + ts / 2 - this.disp.hop * ts;
      drawBotTop(ctx, bx, by, ts * 0.74 * (1 + this.disp.hop * 0.5), this.disp.ang * Math.PI / 180, { light: this.light });
      // efecte
      this.fx = this.fx.filter(f => now - f.t0 < f.dur);
      this.fx.forEach(f => {
        const p = (now - f.t0) / f.dur;
        if (p < 0) return;
        const fx = ox + f.x * ts + ts / 2, fy = oy + f.y * ts + ts / 2;
        if (f.type === 'spark') {
          const d = ts * (0.2 + p * (f.big ? 1.1 : 0.6));
          ctx.globalAlpha = 1 - p;
          emoji(ctx, '✨', fx + Math.cos(f.a) * d, fy + Math.sin(f.a) * d, ts * (f.big ? 0.32 : 0.24));
          ctx.globalAlpha = 1;
        } else if (f.type === 'text') {
          ctx.globalAlpha = 1 - p;
          ctx.font = '900 ' + Math.round(ts * 0.3) + 'px Nunito, sans-serif';
          ctx.fillStyle = f.color || '#1E2A4A';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, fx, fy - ts * 0.5 - p * ts * 0.5);
          ctx.globalAlpha = 1;
        } else if (f.type === 'boom') {
          ctx.globalAlpha = 1 - p;
          emoji(ctx, '💥', fx, fy, ts * (0.4 + p * 0.3));
          ctx.globalAlpha = 1;
        }
      });
    }
  }

  /* =========================================================
     Executorul (pentru labirint și desen)
     ========================================================= */
  class Runner {
    constructor(world, editor) {
      this.world = world;
      this.ed = editor;
      this.stopped = false;
      this.steps = 0;
      this.maxSteps = 600;
    }
    stop() { this.stopped = true; }
    check() { if (this.stopped) throw { stop: true }; }
    wait(ms) { return sleep(ms); }
    async list(L) { for (const b of L) await this.block(b); }
    async block(b) {
      this.check();
      const ed = this.ed, w = this.world;
      switch (b.type) {
        case 'start': return;
        case 'repeat': {
          const n = Math.max(0, Math.round(+b.args.n || 0));
          ed.highlight(b.id, true);
          await this.wait(w.dur(140));
          ed.highlight(b.id, false);
          for (let i = 0; i < n; i++) {
            this.check();
            ed.setBadge(b.id, (i + 1) + ' / ' + n);
            const before = this.steps;
            await this.list(b.body || []);
            if (this.steps === before) await this.wait(w.dur(60));
          }
          ed.setBadge(b.id, null);
          return;
        }
        case 'untilGoal': {
          let i = 0;
          ed.highlight(b.id, true);
          await this.wait(w.dur(140));
          ed.highlight(b.id, false);
          while (!w.atGoal()) {
            this.check();
            if (++i > 300) throw { fail: 'tooLong', id: b.id };
            ed.setBadge(b.id, 'tura ' + i);
            const before = this.steps;
            await this.list(b.body || []);
            if (this.steps === before) throw { fail: 'stuck', id: b.id };
          }
          ed.setBadge(b.id, null);
          return;
        }
        case 'if':
        case 'ifElse': {
          ed.highlight(b.id, true);
          const c = w.sense(b.args.cond);
          ed.setBadge(b.id, c ? '✓ da' : '✗ nu', c ? 'yes' : 'no');
          await this.wait(w.dur(300));
          ed.highlight(b.id, false);
          ed.setBadge(b.id, null);
          if (c) await this.list(b.body || []);
          else if (b.type === 'ifElse') await this.list(b.body2 || []);
          return;
        }
        default: {
          ed.highlight(b.id, true);
          try {
            await w.exec(b);
          } catch (e) {
            if (e && e.fail && !e.id) e.id = b.id;
            throw e;
          } finally {
            ed.highlight(b.id, false);
          }
          this.steps++;
          if (this.steps > this.maxSteps) throw { fail: 'tooLong', id: b.id };
          await this.wait(w.dur(40));
          this.check();
        }
      }
    }
  }

  BIP.MazeWorld = MazeWorld;
  BIP.Runner = Runner;
  BIP.MAZE_THEMES = THEMES;
})();
