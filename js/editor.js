/* =========================================================
   Bip și Codul Magic — editorul de blocuri (paletă + spațiu de lucru)
   Drag & drop cu mouse sau degetul, lipire automată, coș de gunoi,
   adăugare cu un simplu clic, anulare, meniu contextual.
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { h, uid } = BIP.util;
  const { isC, isHat, isCap, mk, countBlocks, assignIds, ensureIds } = BIP.blocks;
  const DEFS = BIP.DEFS, CONDS = BIP.CONDS;
  const Sound = BIP.Sound;

  const SNAP = 58;          // distanța maximă de lipire (px)
  const ARM = 18;           // grosimea brațului blocurilor C

  /* listele derulante iau lățimea opțiunii alese (nu a celei mai lungi) */
  let measureCtx = null;
  function fitSelect(sel) {
    const o = sel.options[sel.selectedIndex];
    const t = o ? o.text : '';
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = '800 14px Nunito, "Segoe UI", sans-serif';
    sel.style.width = Math.ceil(measureCtx.measureText(t).width + 38) + 'px';
  }

  function optionsOf(spec, ctx) {
    const o = typeof spec.options === 'function' ? spec.options(ctx) : spec.options;
    return o || [];
  }

  /* ---------- câmpuri din blocuri ---------- */
  function renderInput(target, name, spec, o, owner) {
    const v = target[name];
    if (spec.type === 'num' || spec.type === 'text') {
      const isNum = spec.type === 'num';
      const inp = h('input', {
        class: 'bi' + (isNum ? ' num' : ' txt'), type: 'text',
        inputmode: isNum ? 'decimal' : 'text', value: v === undefined ? '' : String(v),
        maxlength: isNum ? 7 : 60, 'aria-label': name, spellcheck: 'false', autocomplete: 'off'
      });
      const size = () => { inp.style.width = 'calc(' + Math.max(isNum ? 1.4 : 2, inp.value.length + 0.7) + 'ch + ' + (isNum ? 16 : 22) + 'px)'; };
      size();
      if (!o.interactive) { inp.disabled = true; inp.tabIndex = -1; return inp; }
      const parse = finalize => {
        if (!isNum) {
          target[name] = inp.value;
        } else {
          let n = parseFloat(inp.value.replace(',', '.'));
          if (isNaN(n)) { if (!finalize) return; n = spec.def; }
          if (spec.int) n = Math.round(n);
          if (spec.min !== undefined) n = Math.max(spec.min, n);
          if (spec.max !== undefined) n = Math.min(spec.max, n);
          n = Math.round(n * 100) / 100;
          target[name] = n;
          if (finalize) inp.value = String(n);
        }
        size();
        if (o.onArg) o.onArg(owner, finalize);
      };
      inp.addEventListener('input', () => parse(false));
      inp.addEventListener('change', () => parse(true));
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
      inp.addEventListener('focus', () => { setTimeout(() => { try { inp.select(); } catch (e) { /* */ } }, 0); });
      return inp;
    }
    if (spec.type === 'drop') {
      const opts = optionsOf(spec, o.ctx).slice();
      const sel = h('select', { class: 'bs', 'aria-label': name });
      if (!opts.some(p => String(p[0]) === String(v))) opts.unshift([v, String(v === undefined ? '?' : v) + ' (lipsă)']);
      opts.forEach(p => sel.appendChild(h('option', { value: p[0] }, p[1])));
      sel.value = String(v);
      fitSelect(sel);
      if (!o.interactive) { sel.disabled = true; sel.tabIndex = -1; return sel; }
      sel.addEventListener('change', () => { target[name] = sel.value; fitSelect(sel); if (o.onArg) o.onArg(owner, true); });
      sel.addEventListener('keydown', e => e.stopPropagation());
      return sel;
    }
    if (spec.type === 'cond') return renderCond(target, name, o, owner);
    return h('span', null, '?');
  }

  function renderCond(target, name, o, owner) {
    const wrap = h('span', { class: 'cond' });
    const build = () => {
      wrap.innerHTML = '';
      const kinds = (o.ctx && o.ctx.condKinds) || Object.keys(CONDS);
      let val = target[name];
      if (!val || !CONDS[val.k]) { val = target[name] = BIP.blocks.defaultCond(kinds[0]); }
      const list = kinds.indexOf(val.k) >= 0 ? kinds : [val.k].concat(kinds);
      if (list.length > 1) {
        const sel = h('select', { class: 'bs', 'aria-label': 'condiție' });
        list.forEach(k => sel.appendChild(h('option', { value: k }, CONDS[k].label)));
        sel.value = val.k;
        fitSelect(sel);
        if (!o.interactive) { sel.disabled = true; sel.tabIndex = -1; }
        else {
          sel.addEventListener('change', () => {
            target[name] = BIP.blocks.defaultCond(sel.value);
            build();
            if (o.onArg) o.onArg(owner, true);
          });
          sel.addEventListener('keydown', e => e.stopPropagation());
        }
        wrap.appendChild(sel);
      } else {
        wrap.appendChild(h('span', { class: 'cond-txt' }, CONDS[val.k].label));
      }
      const cdef = CONDS[val.k];
      if (cdef.args) Object.keys(cdef.args).forEach(an => wrap.appendChild(renderInput(val, an, cdef.args[an], o, owner)));
      if (cdef.after) wrap.appendChild(h('span', { class: 'cond-txt' }, cdef.after));
    };
    build();
    return wrap;
  }

  function fillLabel(container, label, block, def, o) {
    label.split(/(\{\w+\})/).forEach(part => {
      if (!part) return;
      const m = part.match(/^\{(\w+)\}$/);
      if (m) {
        const spec = def.args && def.args[m[1]];
        if (spec) container.appendChild(renderInput(block.args, m[1], spec, o, block));
      } else {
        container.appendChild(h('span', { class: 'blk-txt' }, part.trim()));
      }
    });
  }

  /* Desenează un bloc (cu tot ce are înăuntru) */
  function renderBlockEl(b, o) {
    const def = DEFS[b.type];
    if (!def) return h('div');
    const shape = def.shape || 'stack';
    const el = h('div', { class: 'blk shape-' + shape + ' cat-' + def.cat, 'data-bid': b.id });
    const body = h('div', { class: 'blk-body' });
    if (def.icon) body.appendChild(h('span', { class: 'blk-ico' }, def.icon));
    fillLabel(body, def.label, b, def, o);
    el.appendChild(body);
    if (isC(def)) {
      const mouth = h('div', { class: 'blk-mouth', 'data-slot': 'body' });
      (b.body || []).forEach(c => mouth.appendChild(renderBlockEl(c, o)));
      el.appendChild(mouth);
      if (shape === 'c2') {
        const mid = h('div', { class: 'blk-mid' }, h('span', { class: 'blk-txt' }, def.label2 || 'altfel'));
        el.appendChild(mid);
        const mouth2 = h('div', { class: 'blk-mouth', 'data-slot': 'body2' });
        (b.body2 || []).forEach(c => mouth2.appendChild(renderBlockEl(c, o)));
        el.appendChild(mouth2);
      }
      el.appendChild(h('div', { class: 'blk-foot' }));
    }
    return el;
  }

  /* Blocuri statice (pentru indicii, exemple, soluții) */
  function renderStatic(blocks, ctx) {
    const list = ensureIds(JSON.parse(JSON.stringify(blocks)));
    const st = h('div', { class: 'static-stack' });
    list.forEach(b => st.appendChild(renderBlockEl(b, { interactive: false, ctx: ctx || {} })));
    return st;
  }

  /* =========================================================
     Editorul
     ========================================================= */
  class Editor {
    constructor(o) {
      this.o = o;
      this.ctx = o.ctx || {};
      this.paletteEl = o.paletteEl;
      this.paletteZone = o.paletteZone || o.paletteEl;
      this.wsEl = o.workspaceEl;
      this.trashEl = o.trashEl || null;
      this.maxBlocks = o.maxBlocks || 0;
      this.scripts = [];
      this.undoStack = [];
      this.locked = false;
      this.elById = new Map();
      this.lastScriptId = null;
      this.canvas = h('div', { class: 'ws-canvas' });
      this.wsEl.appendChild(this.canvas);
      this.marker = h('div', { class: 'drop-marker' });
      this.dragLayer = document.getElementById('drag-layer');
      this._onDown = this._onDown.bind(this);
      this._onCtx = this._onCtx.bind(this);
      this.paletteEl.addEventListener('pointerdown', this._onDown);
      this.wsEl.addEventListener('pointerdown', this._onDown);
      this.wsEl.addEventListener('contextmenu', this._onCtx);
      this.paletteEl.addEventListener('contextmenu', e => e.preventDefault());
      this.renderPalette(o.palette || []);
    }

    destroy() {
      this._release();
      this._closeMenu();
      if (this.dragEl) this.dragEl.remove();
      this.paletteEl.removeEventListener('pointerdown', this._onDown);
      this.wsEl.removeEventListener('pointerdown', this._onDown);
      this.wsEl.removeEventListener('contextmenu', this._onCtx);
    }

    /* ---------- paleta ---------- */
    renderPalette(spec) {
      this.palSpec = spec;
      this.palItems = [];
      this.paletteEl.innerHTML = '';
      spec.forEach(sec => {
        const items = sec.items || [sec];
        if (sec.title) {
          this.paletteEl.appendChild(h('div', { class: 'pal-head cat-' + (sec.cat || 'control'), 'data-cat': sec.cat || '' },
            h('span', { class: 'dot' }), sec.title));
        }
        items.forEach(item => {
          const it = typeof item === 'string' ? { type: item } : item;
          if (!DEFS[it.type]) return;
          const idx = this.palItems.length;
          this.palItems.push(it);
          const el = renderBlockEl(this.makeBlock(it), { interactive: false, ctx: this.ctx });
          el.dataset.pal = String(idx);
          el.removeAttribute('data-bid');
          el.title = 'Trage blocul în dreapta (sau dă clic pe el ca să-l adaugi)';
          this.paletteEl.appendChild(h('div', { class: 'pal-item' }, el));
        });
      });
      this.updateCount();
    }
    scrollPaletteTo(cat) {
      const head = this.paletteEl.querySelector('.pal-head[data-cat="' + cat + '"]');
      if (head) this.paletteEl.scrollTo({ top: head.offsetTop - 8, behavior: 'smooth' });
    }
    makeBlock(it) {
      const b = mk(it.type, it.args);
      if (it.body) b.body = assignIds(BIP.blocks.build(it.body));
      return b;
    }

    /* ---------- model ---------- */
    load(scripts) {
      this.scripts = scripts;
      this.scripts.forEach(s => { if (!s.id) s.id = uid('s'); ensureIds(s.blocks); });
      this.undoStack = [];
      this.lastScriptId = null;
      this.render();
    }
    _replace(arr) {
      this.scripts.length = 0;
      arr.forEach(s => this.scripts.push(s));
    }
    snapshot() { return JSON.stringify(this.scripts); }
    pushUndo(snap) {
      this.undoStack.push(snap);
      if (this.undoStack.length > 60) this.undoStack.shift();
    }
    undo() {
      if (this.locked || !this.undoStack.length) { Sound.play('fail'); return false; }
      this._replace(JSON.parse(this.undoStack.pop()));
      this.render();
      this._changed();
      Sound.play('snap');
      return true;
    }
    locate(id) {
      let res = null;
      const walk = (list, script) => {
        for (let i = 0; i < list.length && !res; i++) {
          const b = list[i];
          if (b.id === id) { res = { script, list, index: i, block: b }; return; }
          if (b.body) walk(b.body, script);
          if (b.body2 && !res) walk(b.body2, script);
        }
      };
      for (const s of this.scripts) { walk(s.blocks, s); if (res) break; }
      return res;
    }
    count() {
      let n = 0;
      this.scripts.forEach(s => { n += countBlocks(s.blocks); });
      return n;
    }
    isFull() { return this.maxBlocks > 0 && this.count() >= this.maxBlocks; }

    /* ---------- desenare ---------- */
    render() {
      this.canvas.innerHTML = '';
      this.elById.clear();
      const o = { interactive: true, ctx: this.ctx, onArg: (blk, fin) => this._argChanged(blk, fin) };
      this.scripts.forEach(s => {
        const st = h('div', { class: 'stack', 'data-sid': s.id });
        st.style.left = s.x + 'px';
        st.style.top = s.y + 'px';
        s.blocks.forEach(b => st.appendChild(renderBlockEl(b, o)));
        this.canvas.appendChild(st);
      });
      if (this.o.emptyHint && this.count() === 0) this.canvas.appendChild(h('div', { class: 'ws-hint' }, this.o.emptyHint));
      this.canvas.appendChild(this.marker);
      this.marker.style.display = 'none';
      this.canvas.querySelectorAll('.blk[data-bid]').forEach(e => this.elById.set(e.dataset.bid, e));
      this.updateSize();
      this.updateCount();
    }
    updateSize() {
      let mr = 0, mb = 0;
      Array.prototype.forEach.call(this.canvas.children, st => {
        if (!st.classList.contains('stack')) return;
        mr = Math.max(mr, st.offsetLeft + st.offsetWidth);
        mb = Math.max(mb, st.offsetTop + st.offsetHeight);
      });
      this.canvas.style.width = (mr + 260) + 'px';
      this.canvas.style.height = (mb + 260) + 'px';
    }
    updateCount() {
      const n = this.count();
      const full = this.maxBlocks > 0 && n >= this.maxBlocks;
      this.paletteEl.classList.toggle('full', full);
      if (this.o.onCount) this.o.onCount(n, this.maxBlocks);
    }
    _argChanged(blk, finalize) {
      if (this.o.onChange) this.o.onChange({ structural: false, block: blk, finalize: finalize });
      if (finalize) this.updateSize();
    }
    _changed() {
      this.updateCount();
      if (this.o.onChange) this.o.onChange({ structural: true });
    }

    /* ---------- evidențieri în timpul rulării ---------- */
    highlight(id, on) { const el = this.elById.get(id); if (el) el.classList.toggle('running', !!on); }
    markError(id) {
      const el = this.elById.get(id);
      if (el) { el.classList.add('err'); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* */ } }
    }
    clearMarks() {
      this.canvas.querySelectorAll('.running, .err').forEach(e => e.classList.remove('running', 'err'));
      this.canvas.querySelectorAll('.loop-badge').forEach(e => e.remove());
    }
    setBadge(id, text, cls) {
      const el = this.elById.get(id); if (!el) return;
      const body = el.firstElementChild; if (!body) return;
      let bd = null;
      Array.prototype.forEach.call(body.children, c => { if (c.classList.contains('loop-badge')) bd = c; });
      if (text === null || text === undefined) { if (bd) bd.remove(); return; }
      if (!bd) { bd = h('span', { class: 'loop-badge' }); body.appendChild(bd); }
      bd.className = 'loop-badge' + (cls ? ' ' + cls : '');
      bd.textContent = text;
    }
    setStackRunning(sid, on) {
      const st = this.canvas.querySelector('.stack[data-sid="' + sid + '"]');
      if (st) st.classList.toggle('running', !!on);
    }
    lock(on) {
      this.locked = !!on;
      this.wsEl.classList.toggle('locked', this.locked);
      this.paletteEl.classList.toggle('locked', this.locked);
    }
    flashBlock(id) {
      const el = this.elById.get(id); if (!el) return;
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 800);
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (e) { /* */ }
    }

    /* ---------- unelte ---------- */
    cleanUp() {
      if (this.locked) return;
      const snap = this.snapshot();
      let y = 20;
      const sorted = this.scripts.slice().sort((a, b) => {
        const ha = isHat(DEFS[a.blocks[0].type]) ? 0 : 1, hb = isHat(DEFS[b.blocks[0].type]) ? 0 : 1;
        return ha - hb || a.y - b.y;
      });
      sorted.forEach(s => {
        const st = this.canvas.querySelector('.stack[data-sid="' + s.id + '"]');
        s.x = 20; s.y = y;
        y += (st ? st.offsetHeight : 60) + 30;
      });
      this._replace(sorted);
      this.render();
      if (snap !== this.snapshot()) { this.pushUndo(snap); this._changed(); }
      Sound.play('snap');
    }
    reset(initial) {
      const snap = this.snapshot();
      this._replace(JSON.parse(JSON.stringify(initial)));
      this.scripts.forEach(s => { if (!s.id) s.id = uid('s'); ensureIds(s.blocks); });
      this.render();
      if (snap !== this.snapshot()) { this.pushUndo(snap); this._changed(); }
    }
    addScript(blocks, x, y) {
      const snap = this.snapshot();
      const s = { id: uid('s'), x: x === undefined ? 30 : x, y: y === undefined ? this._bottomY() + 24 : y, blocks: assignIds(JSON.parse(JSON.stringify(blocks))) };
      this.scripts.push(s);
      this.render();
      this.pushUndo(snap);
      this._changed();
      if (s.blocks[0]) this.flashBlock(s.blocks[0].id);
      return s;
    }
    _bottomY() {
      let mb = 0;
      Array.prototype.forEach.call(this.canvas.children, st => {
        if (st.classList.contains('stack')) mb = Math.max(mb, st.offsetTop + st.offsetHeight);
      });
      return mb;
    }

    /* ---------- intrări de la mouse / deget ---------- */
    _onDown(e) {
      this._closeMenu();
      if (this.locked) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('input, select, button, textarea')) return;
      const bel = e.target.closest('.blk');
      if (!bel) return;
      const fromPal = this.paletteEl.contains(bel);
      let topEl = bel;
      if (fromPal) { while (topEl && !topEl.dataset.pal) topEl = topEl.parentElement && topEl.parentElement.closest('.blk'); if (!topEl) return; }
      if (e.pointerType === 'mouse') e.preventDefault();
      this.press = {
        src: fromPal ? 'pal' : 'ws', el: topEl, id: topEl.dataset.bid, palIdx: topEl.dataset.pal,
        x: e.clientX, y: e.clientY, pid: e.pointerId, ptype: e.pointerType, dragging: false
      };
      this._mv = ev => this._onMove(ev);
      this._up = ev => this._onUp(ev);
      this._cancel = ev => this._onCancel(ev);
      window.addEventListener('pointermove', this._mv);
      window.addEventListener('pointerup', this._up);
      window.addEventListener('pointercancel', this._cancel);
      if (!fromPal && e.pointerType !== 'mouse') {
        this.press.lp = setTimeout(() => {
          const p = this.press;
          if (p && !p.dragging) { this._release(); this.menu(p.id, p.x, p.y); }
        }, 650);
      }
    }
    _onMove(e) {
      const p = this.press;
      if (!p || e.pointerId !== p.pid) return;
      if (!p.dragging) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 7) return;
        clearTimeout(p.lp);
        if (p.src === 'pal' && this.isFull()) {
          this._release();
          if (this.o.onFull) this.o.onFull();
          Sound.play('fail');
          return;
        }
        if (!this._startDrag(e)) { this._release(); return; }
      }
      e.preventDefault();
      this._dragMove(e);
    }
    _onUp(e) {
      const p = this.press;
      if (!p || e.pointerId !== p.pid) return;
      clearTimeout(p.lp);
      if (p.dragging) this._drop(e);
      else if (p.src === 'pal') this._tapAdd(p.palIdx);
      this._release();
    }
    _onCancel() {
      const p = this.press;
      if (!p) return;
      clearTimeout(p.lp);
      if (p.dragging) this._abortDrag();
      this._release();
    }
    _release() {
      if (this._mv) window.removeEventListener('pointermove', this._mv);
      if (this._up) window.removeEventListener('pointerup', this._up);
      if (this._cancel) window.removeEventListener('pointercancel', this._cancel);
      this._mv = this._up = this._cancel = null;
      this.press = null;
      clearInterval(this._scrollT);
    }

    _startDrag() {
      const p = this.press;
      const rect = p.el.getBoundingClientRect();
      p.offX = p.x - rect.left;
      p.offY = p.y - rect.top;
      p.snapshot = this.snapshot();
      if (p.src === 'pal') {
        p.blocks = [this.makeBlock(this.palItems[+p.palIdx])];
        p.origin = null;
      } else {
        const loc = this.locate(p.id);
        if (!loc) return false;
        p.blocks = loc.list.splice(loc.index);
        p.origin = { x: loc.script.x, y: loc.script.y, wasTop: loc.list === loc.script.blocks && loc.index === 0 };
        if (loc.script.blocks.length === 0) this.scripts.splice(this.scripts.indexOf(loc.script), 1);
        this.render();
      }
      p.dragging = true;
      this.dragEl = h('div', { class: 'stack' });
      p.blocks.forEach(b => this.dragEl.appendChild(renderBlockEl(b, { interactive: false, ctx: this.ctx })));
      this.dragLayer.appendChild(this.dragEl);
      p.dragH = this.dragEl.getBoundingClientRect().height;
      this._computeTargets();
      Sound.play('pick');
      return true;
    }

    _computeTargets() {
      const p = this.press;
      const first = DEFS[p.blocks[0].type];
      const last = DEFS[p.blocks[p.blocks.length - 1].type];
      const draggingHat = isHat(first);
      const endsCap = isCap(last);
      const cr = this.canvas.getBoundingClientRect();
      const T = [];
      if (!draggingHat) {
        const walk = list => {
          list.forEach((b, i) => {
            const el = this.elById.get(b.id); if (!el) return;
            const def = DEFS[b.type];
            const r = el.getBoundingClientRect();
            if (!isCap(def) && (!endsCap || i === list.length - 1)) {
              T.push({ kind: 'after', list: list, index: i + 1, x: r.left - cr.left, y: r.bottom - cr.top });
            }
            if (isC(def)) {
              const mouths = Array.prototype.filter.call(el.children, c => c.classList.contains('blk-mouth'));
              const lists = [b.body, b.body2];
              mouths.forEach((m, mi) => {
                const L = lists[mi]; if (!L) return;
                const mr = m.getBoundingClientRect();
                if (!endsCap || L.length === 0) T.push({ kind: 'inside', list: L, index: 0, x: mr.left - cr.left + ARM, y: mr.top - cr.top });
                walk(L);
              });
            }
          });
        };
        this.scripts.forEach(s => walk(s.blocks));
      }
      if (!endsCap) {
        this.scripts.forEach(s => {
          const fb = s.blocks[0];
          if (!fb || isHat(DEFS[fb.type])) return;
          T.push({ kind: 'before', script: s, x: s.x, y: s.y - p.dragH, my: s.y });
        });
      }
      p.targets = T;
    }

    _overRect(el, x, y) {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    _dragMove(e) {
      const p = this.press;
      const left = e.clientX - p.offX, top = e.clientY - p.offY;
      this.dragEl.style.left = left + 'px';
      this.dragEl.style.top = top + 'px';
      const overPal = this._overRect(this.paletteZone, e.clientX, e.clientY);
      if (this.trashEl) this.trashEl.classList.toggle('on', overPal && p.src === 'ws');
      this._autoScroll(e);
      if (overPal || !this._overRect(this.wsEl, e.clientX, e.clientY)) {
        p.target = null; this.marker.style.display = 'none'; return;
      }
      const cr = this.canvas.getBoundingClientRect();
      const x = left - cr.left, y = top - cr.top;
      let best = null, bd = SNAP;
      p.targets.forEach(t => {
        const d = Math.hypot((t.x - x) * 0.8, t.y - y);
        if (d < bd) { bd = d; best = t; }
      });
      p.target = best;
      if (best) {
        this.marker.style.display = 'block';
        this.marker.style.left = (best.x - 4) + 'px';
        this.marker.style.top = ((best.kind === 'before' ? best.my : best.y) - 3) + 'px';
      } else this.marker.style.display = 'none';
    }

    _autoScroll(e) {
      const r = this.wsEl.getBoundingClientRect();
      clearInterval(this._scrollT);
      if (!this._overRect(this.wsEl, e.clientX, e.clientY)) return;
      let dx = 0, dy = 0;
      if (e.clientX > r.right - 34) dx = 12; else if (e.clientX < r.left + 20 && this.wsEl.scrollLeft > 0) dx = -12;
      if (e.clientY > r.bottom - 34) dy = 12; else if (e.clientY < r.top + 24 && this.wsEl.scrollTop > 0) dy = -12;
      if (dx || dy) {
        if (dx > 0) this.canvas.style.width = (this.canvas.offsetWidth + 20) + 'px';
        if (dy > 0) this.canvas.style.height = (this.canvas.offsetHeight + 20) + 'px';
        this.wsEl.scrollLeft += dx; this.wsEl.scrollTop += dy;
        this._scrollT = setInterval(() => {
          if (dx > 0) this.canvas.style.width = (this.canvas.offsetWidth + 10) + 'px';
          if (dy > 0) this.canvas.style.height = (this.canvas.offsetHeight + 10) + 'px';
          this.wsEl.scrollLeft += dx; this.wsEl.scrollTop += dy;
        }, 40);
      }
    }

    _drop(e) {
      const p = this.press;
      clearInterval(this._scrollT);
      const left = e.clientX - p.offX, top = e.clientY - p.offY;
      if (this.dragEl) { this.dragEl.remove(); this.dragEl = null; }
      this.marker.style.display = 'none';
      if (this.trashEl) this.trashEl.classList.remove('on');
      const blocks = p.blocks;
      const overPal = this._overRect(this.paletteZone, e.clientX, e.clientY);
      const fixed = blocks.some(b => DEFS[b.type].fixed);
      let landed = null;
      if (overPal) {
        if (fixed) {
          landed = { id: uid('s'), x: p.origin ? p.origin.x : 20, y: p.origin ? p.origin.y : 20, blocks: blocks };
          this.scripts.push(landed);
          if (this.o.onWarn) this.o.onWarn('fixed');
        } else if (p.src === 'ws') Sound.play('trash');
      } else if (p.target) {
        const t = p.target;
        if (t.kind === 'before') {
          blocks.slice().reverse().forEach(b => t.script.blocks.unshift(b));
          t.script.y = Math.max(4, t.script.y - p.dragH);
          landed = t.script;
        } else {
          Array.prototype.splice.apply(t.list, [t.index, 0].concat(blocks));
          landed = this.scripts.find(s => this._contains(s.blocks, blocks[0].id)) || null;
        }
      } else if (this._overRect(this.wsEl, e.clientX, e.clientY)) {
        const cr = this.canvas.getBoundingClientRect();
        landed = { id: uid('s'), x: Math.max(4, Math.round(left - cr.left)), y: Math.max(4, Math.round(top - cr.top)), blocks: blocks };
        this.scripts.push(landed);
      } else if (p.src === 'ws') {
        this._replace(JSON.parse(p.snapshot));
      }
      if (landed) this.lastScriptId = landed.id;
      this.render();
      if (this.snapshot() !== p.snapshot) {
        this.pushUndo(p.snapshot);
        this._changed();
        if (!overPal || fixed) Sound.play('snap');
      }
      if (landed && blocks[0]) this.flashBlock(blocks[0].id);
    }
    _abortDrag() {
      const p = this.press;
      if (this.dragEl) { this.dragEl.remove(); this.dragEl = null; }
      this.marker.style.display = 'none';
      if (this.trashEl) this.trashEl.classList.remove('on');
      if (p && p.src === 'ws' && p.snapshot) { this._replace(JSON.parse(p.snapshot)); this.render(); }
    }
    _contains(list, id) {
      return list.some(b => b.id === id || (b.body && this._contains(b.body, id)) || (b.body2 && this._contains(b.body2, id)));
    }

    /* Clic pe un bloc din paletă = îl adaugă la finalul programului */
    _tapAdd(idx) {
      if (this.isFull()) { if (this.o.onFull) this.o.onFull(); Sound.play('fail'); return; }
      const it = this.palItems[+idx]; if (!it) return;
      const b = this.makeBlock(it);
      const def = DEFS[b.type];
      const snap = this.snapshot();
      let target = null;
      if (!isHat(def)) {
        if (this.o.mainScript) target = this.o.mainScript(this.scripts);
        if (!target && this.lastScriptId) target = this.scripts.find(s => s.id === this.lastScriptId);
        if (!target) target = this.scripts.find(s => s.blocks[0] && isHat(DEFS[s.blocks[0].type]));
      }
      if (target) {
        const last = target.blocks[target.blocks.length - 1];
        if (last && isCap(DEFS[last.type])) target = null;
      }
      if (target) target.blocks.push(b);
      else {
        target = { id: uid('s'), x: 30, y: this._bottomY() + 24, blocks: [b] };
        this.scripts.push(target);
      }
      this.lastScriptId = target.id;
      this.render();
      this.pushUndo(snap);
      this._changed();
      Sound.play('snap');
      this.flashBlock(b.id);
    }

    /* ---------- meniu contextual ---------- */
    _onCtx(e) {
      const b = e.target.closest('.blk[data-bid]');
      if (!b || this.locked) return;
      if (e.target.closest('input, select')) return;
      e.preventDefault();
      this.menu(b.dataset.bid, e.clientX, e.clientY);
    }
    menu(id, x, y) {
      this._closeMenu();
      const loc = this.locate(id); if (!loc) return;
      const def = DEFS[loc.block.type];
      const m = h('div', { class: 'ctx-menu', role: 'menu' });
      const add = (label, fn, disabled) => {
        const bt = h('button', { type: 'button', role: 'menuitem' }, label);
        if (disabled) bt.disabled = true;
        bt.addEventListener('click', () => { this._closeMenu(); fn(); });
        m.appendChild(bt);
      };
      const dupCount = isHat(def) ? countBlocks(loc.script.blocks) : countBlocks([loc.block]);
      const canDup = !def.fixed && !(this.maxBlocks && this.count() + dupCount > this.maxBlocks);
      add('📄 Duplică', () => this.duplicate(id), !canDup);
      add('🗑️ Șterge blocul', () => this.deleteBlock(id), !!def.fixed);
      if (isHat(def) && !def.fixed) add('🧹 Șterge tot scriptul', () => this.deleteScript(loc.script.id));
      add('✖ Închide', () => {});
      document.body.appendChild(m);
      const r = m.getBoundingClientRect();
      m.style.left = Math.min(x, window.innerWidth - r.width - 8) + 'px';
      m.style.top = Math.min(y, window.innerHeight - r.height - 8) + 'px';
      this.menuEl = m;
      this._menuOff = ev => { if (!m.contains(ev.target)) this._closeMenu(); };
      setTimeout(() => window.addEventListener('pointerdown', this._menuOff, true), 0);
    }
    _closeMenu() {
      if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
      if (this._menuOff) { window.removeEventListener('pointerdown', this._menuOff, true); this._menuOff = null; }
    }
    duplicate(id) {
      const loc = this.locate(id); if (!loc) return;
      const def = DEFS[loc.block.type];
      const snap = this.snapshot();
      if (isHat(def)) {
        const copy = assignIds(JSON.parse(JSON.stringify(loc.script.blocks)));
        this.scripts.push({ id: uid('s'), x: loc.script.x + 40, y: loc.script.y + 40, blocks: copy });
      } else {
        const copy = assignIds(JSON.parse(JSON.stringify([loc.block])))[0];
        if (isCap(def)) this.scripts.push({ id: uid('s'), x: loc.script.x + 40, y: this._bottomY() + 24, blocks: [copy] });
        else loc.list.splice(loc.index + 1, 0, copy);
      }
      this.render(); this.pushUndo(snap); this._changed(); Sound.play('snap');
    }
    deleteBlock(id) {
      const loc = this.locate(id); if (!loc) return;
      if (DEFS[loc.block.type].fixed) return;
      const snap = this.snapshot();
      loc.list.splice(loc.index, 1);
      if (loc.script.blocks.length === 0) this.scripts.splice(this.scripts.indexOf(loc.script), 1);
      this.render(); this.pushUndo(snap); this._changed(); Sound.play('trash');
    }
    deleteScript(sid) {
      const i = this.scripts.findIndex(s => s.id === sid); if (i < 0) return;
      const snap = this.snapshot();
      this.scripts.splice(i, 1);
      this.render(); this.pushUndo(snap); this._changed(); Sound.play('trash');
    }
  }

  BIP.Editor = Editor;
  BIP.renderBlockEl = renderBlockEl;
  BIP.renderStatic = renderStatic;
})();
