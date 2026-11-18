/* =========================================================
   Bip și Codul Magic — aplicația: ecrane, navigare, progres
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { h, esc, clone, uid, sleep, num, download, pickFile, bipSVG } = BIP.util;
  const { Store, Sound, Speech, Confetti, Modal } = BIP;
  const { build, countBlocks, ensureIds, sanitize, mk } = BIP.blocks;
  const WORLDS = BIP.WORLDS;
  const AVATARS = ['🦊', '🐼', '🐸', '🐯', '🐨', '🐵', '🦁', '🐰', '🐶', '🐱', '🐧', '🦄'];
  const MAZE_CTX = { condKinds: ['pathAhead', 'pathLeft', 'pathRight', 'gemHere'] };

  /* =========================================================
     Profiluri și progres
     ========================================================= */
  const P = {
    cur() { return Store.data.profiles[Store.data.current] || null; },
    create(name, avatar) {
      const id = uid('p');
      Store.data.profiles[id] = { id: id, name: name, avatar: avatar, created: Date.now(), levels: {}, seen: {}, codes: {}, game: null, free: null, unlockAll: false };
      Store.data.order.push(id);
      Store.data.current = id;
      Store.save();
      return id;
    },
    select(id) { Store.data.current = id; Store.save(); },
    remove(id) {
      delete Store.data.profiles[id];
      Store.data.order = Store.data.order.filter(x => x !== id);
      if (Store.data.current === id) Store.data.current = null;
      Store.save();
    },
    reset(p) { p.levels = {}; p.seen = {}; p.codes = {}; p.game = null; p.free = null; Store.save(); },
    lv(id, prof) { const p = prof || this.cur(); return p && p.levels ? p.levels[id] : null; },
    isDone(id, prof) { const s = this.lv(id, prof); return !!(s && s.done); },
    stars(id, prof) { const s = this.lv(id, prof); return s ? s.stars || 0 : 0; },
    setDone(id, stars) {
      const p = this.cur(); if (!p) return false;
      const s = p.levels[id] || (p.levels[id] = {});
      const first = !s.done;
      s.done = true;
      s.stars = Math.max(s.stars || 0, stars || 0);
      s.when = Date.now();
      Store.save();
      return first;
    },
    doneCount(w, prof) { return w.levels.filter(l => this.isDone(l.id, prof)).length; },
    worldDone(w, prof) { return this.doneCount(w, prof) === w.levels.length; },
    need(wi) { const prev = WORLDS[wi - 1]; return prev ? Math.ceil(prev.levels.length * 0.6) : 0; },
    worldUnlocked(wi, prof) {
      const p = prof || this.cur(); if (!p) return false;
      if (p.unlockAll || wi === 0) return true;
      return this.doneCount(WORLDS[wi - 1], p) >= this.need(wi);
    },
    levelUnlocked(wi, li, prof) {
      const p = prof || this.cur(); if (!p) return false;
      if (p.unlockAll) return true;
      if (!this.worldUnlocked(wi, p)) return false;
      return li === 0 || this.isDone(WORLDS[wi].levels[li - 1].id, p);
    },
    totalStars(prof) {
      const p = prof || this.cur(); if (!p) return 0;
      return Object.keys(p.levels || {}).reduce((n, k) => n + (p.levels[k].stars || 0), 0);
    },
    totalDone(prof) { return WORLDS.reduce((n, w) => n + this.doneCount(w, prof), 0); },
    badges(prof) { return WORLDS.filter(w => this.worldDone(w, prof)).map(w => w.badge); },
    freeUnlocked(prof) { const p = prof || this.cur(); return !!p && (p.unlockAll || this.isDone('w5-1', p)); },
    find(id) {
      for (let wi = 0; wi < WORLDS.length; wi++) {
        const li = WORLDS[wi].levels.findIndex(l => l.id === id);
        if (li >= 0) return { wi: wi, li: li, world: WORLDS[wi], level: WORLDS[wi].levels[li] };
      }
      return null;
    },
    next(id) {
      const f = this.find(id); if (!f) return null;
      if (f.li + 1 < f.world.levels.length) return { wi: f.wi, li: f.li + 1, level: f.world.levels[f.li + 1] };
      const nw = WORLDS[f.wi + 1];
      return nw ? { wi: f.wi + 1, li: 0, level: nw.levels[0] } : null;
    },
    currentId() {
      for (let wi = 0; wi < WORLDS.length; wi++) {
        for (let li = 0; li < WORLDS[wi].levels.length; li++) {
          const l = WORLDS[wi].levels[li];
          if (this.levelUnlocked(wi, li) && !this.isDone(l.id)) return l.id;
        }
      }
      return null;
    }
  };
  const levelHash = l => (l.type === 'studio' ? '#/atelier/' : '#/nivel/') + l.id;

  /* =========================================================
     Componente mici
     ========================================================= */
  function btn(label, onClick, cls, attrs) {
    const b = h('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button' }, attrs || {}), label);
    if (onClick) b.addEventListener('click', e => { Sound.play('click'); onClick(e, b); });
    return b;
  }
  function soundBtn() {
    const b = h('button', { class: 'btn btn-icon', type: 'button', title: 'Pornește / oprește sunetul', 'aria-label': 'Sunet' });
    const upd = () => { b.textContent = Store.data.settings.muted ? '🔇' : '🔊'; };
    upd();
    b.addEventListener('click', () => { Store.data.settings.muted = !Store.data.settings.muted; Store.save(); upd(); Sound.play('click'); });
    return b;
  }
  function makeBubble() {
    const face = h('div', { class: 'bip-face' });
    const txt = h('div', { class: 'txt', role: 'status', 'aria-live': 'polite' });
    const el = h('div', { class: 'bubble' }, face, txt);
    let last = '', lastMood = '';
    const faceMood = { bad: 'sad', think: 'think', wow: 'wow', good: 'happy', happy: 'happy' };
    return {
      el: el,
      set(html, mood) {
        mood = mood || 'happy';
        last = html;
        if (mood !== lastMood) { face.innerHTML = bipSVG({ mood: faceMood[mood] || 'happy', light: mood === 'good' ? '#3DDC84' : undefined }); lastMood = mood; }
        txt.className = 'txt' + (mood === 'good' ? ' good' : mood === 'bad' ? ' bad' : mood === 'think' ? ' think' : '');
        txt.innerHTML = html;
        if (Speech.available()) {
          const sb = h('button', { class: 'say-btn', type: 'button', title: 'Citește cu voce tare', 'aria-label': 'Citește cu voce tare' }, '🔊');
          sb.addEventListener('click', () => Speech.speak(last));
          txt.appendChild(sb);
        }
        txt.style.animation = 'none';
        void txt.offsetWidth;
        txt.style.animation = '';
      }
    };
  }
  let toastT = null;
  function toast(msg, ms) {
    let t = document.getElementById('bip-toast');
    if (!t) { t = h('div', { id: 'bip-toast', class: 'toast', role: 'status' }); document.body.appendChild(t); }
    t.innerHTML = msg;
    t.style.display = 'block';
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.style.display = 'none'; }, ms || 3200);
  }
  function confirmBox(title, html, yes, onYes, cls) {
    Modal.open({ title: title, body: h('p', { html: html }), buttons: [{ text: 'Nu' }, { text: yes, cls: cls || 'btn-stop', onClick: onYes }] });
  }
  function staticBox(compact, ctx) {
    return h('div', { class: 'static-box' }, BIP.renderStatic(build(compact), ctx || MAZE_CTX));
  }
  function conceptModal(w, onClose) {
    const it = w.intro; if (!it) return;
    const body = [h('div', { class: 'modal-bip', html: bipSVG({ mood: 'wow' }) }), h('div', { html: it.text })];
    if (it.compare) {
      body.push(h('div', { class: 'static-row' },
        staticBox([['start']].concat(it.compare[0])), h('div', { class: 'vs-arrow' }, '➜'), staticBox([['start']].concat(it.compare[1]))));
    } else if (it.example) {
      body.push(h('div', { class: 'static-row' }, staticBox(it.example)));
    }
    if (it.caption) body.push(h('p', { class: 'center muted' }, it.caption));
    Modal.open({ title: it.title, body: body, cls: 'wide', buttons: [{ text: 'Am înțeles, hai să începem! 🚀', cls: 'btn-go' }], onClose: onClose });
  }

  /* =========================================================
     Navigare
     ========================================================= */
  const App = {
    screen: null,
    init() {
      Store.load();
      Speech.init();
      window.addEventListener('hashchange', () => this.route());
      document.addEventListener('pointerdown', () => Sound.ac(), { once: true });
      this.route();
    },
    go(hash) { if (location.hash === hash) this.route(); else location.hash = hash; },
    route() {
      const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/');
      if (this.screen && this.screen.destroy) { try { this.screen.destroy(); } catch (e) { console.error(e); } }
      this.screen = null;
      Modal.closeAll();
      Speech.stop();
      const prof = P.cur();
      if (!prof && parts[0]) { location.replace('#/'); return; }
      let scr = null;
      const f = parts[1] ? P.find(parts[1]) : null;
      switch (parts[0]) {
        case 'harta': scr = new MapScreen(); break;
        case 'nivel':
          if (!f || f.world.type === 'studio' || !P.levelUnlocked(f.wi, f.li)) { location.replace('#/harta'); return; }
          scr = new LevelScreen(f); break;
        case 'atelier':
          if (!f || f.world.type !== 'studio' || !P.levelUnlocked(f.wi, f.li)) { location.replace('#/harta'); return; }
          scr = new StudioScreen({ mission: f }); break;
        case 'liber':
          if (!P.freeUnlocked()) { location.replace('#/harta'); return; }
          scr = new StudioScreen({ free: true }); break;
        case 'diploma': scr = new DiplomaScreen(); break;
        default: scr = new HomeScreen();
      }
      this.screen = scr;
      const app = document.getElementById('app');
      app.innerHTML = '';
      app.appendChild(scr.el);
      window.scrollTo(0, 0);
      if (scr.mounted) scr.mounted();
    }
  };

  /* =========================================================
     Ecranul de start: cine se joacă?
     ========================================================= */
  class HomeScreen {
    constructor() {
      const d = Store.data;
      const grid = h('div', { class: 'profiles' });
      d.order.forEach(id => {
        const p = d.profiles[id];
        const card = h('button', { class: 'pcard', type: 'button' },
          h('div', { class: 'av' }, p.avatar), h('div', { class: 'nm' }, p.name),
          h('div', { class: 'st' }, '⭐ ' + P.totalStars(p) + ' · ✅ ' + P.totalDone(p) + ' niveluri'));
        card.addEventListener('click', () => { Sound.play('click'); P.select(id); App.go('#/harta'); });
        grid.appendChild(card);
      });
      const add = h('button', { class: 'pcard add', type: 'button' }, h('div', { class: 'av' }, '➕'), h('div', { class: 'nm' }, 'Jucător nou'));
      add.addEventListener('click', () => { Sound.play('click'); newProfileModal(); });
      grid.appendChild(add);
      const bub = makeBubble();
      bub.set(d.order.length
        ? 'Salut din nou! 👋 Alege-ți numele ca să continuăm aventura.'
        : 'Salut! Eu sunt <b>Bip</b>, un robot care vrea să învețe să programeze. 🤖 Mă ajuți? Apasă pe <b>„Jucător nou”</b>!');
      bub.el.style.maxWidth = '560px';
      bub.el.style.width = '100%';
      this.el = h('div', { class: 'screen' },
        h('div', { class: 'home' },
          h('div', { class: 'home-hero' },
            h('div', { class: 'bip-big', html: bipSVG({ mood: 'happy', arms: 'up' }) }),
            h('div', null,
              h('h1', { class: 'logo-title', html: 'Bip și <span>Codul Magic</span>' }),
              h('p', { class: 'logo-sub' }, 'Învață să programezi cu blocuri și construiește-ți propriul joc! 🧩🎮'))),
          bub.el,
          h('div', { class: 'who' }, d.order.length ? 'Cine se joacă azi?' : 'Hai să începem!'),
          grid,
          h('div', { class: 'home-foot' }, btn('👩‍🏫 Pentru profesori', () => teacherGate()), soundBtn())));
    }
  }

  function newProfileModal() {
    let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const inp = h('input', { type: 'text', maxlength: 16, placeholder: 'Prenumele tău', autofocus: true, autocomplete: 'off', spellcheck: 'false' });
    const pick = h('div', { class: 'avatar-pick' });
    AVATARS.forEach(a => {
      const b = h('button', { type: 'button', class: a === avatar ? 'sel' : '', 'aria-label': 'Avatar ' + a }, a);
      b.addEventListener('click', () => { avatar = a; Array.prototype.forEach.call(pick.children, x => x.classList.toggle('sel', x === b)); Sound.play('click'); });
      pick.appendChild(b);
    });
    const err = h('p', { class: 'muted' });
    const m = Modal.open({
      title: 'Jucător nou 👋',
      body: [h('div', { class: 'field' }, h('label', null, 'Cum te cheamă?'), inp), h('div', { class: 'field' }, h('label', null, 'Alege-ți un animăluț:'), pick), err],
      buttons: [
        { text: 'Renunță' },
        {
          text: 'Gata! ✔', cls: 'btn-go', onClick: () => {
            const name = inp.value.trim().replace(/\s+/g, ' ');
            if (!name) { err.textContent = 'Scrie-ți prenumele, te rog. 🙂'; inp.focus(); return false; }
            P.create(name, avatar);
            setTimeout(() => App.go('#/harta'), 0);
            return true;
          }
        }
      ]
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = m.el.querySelector('.btn-go'); if (b) b.click(); } });
  }

  /* ---------- zona profesorului ---------- */
  function teacherGate() {
    const a = 12 + Math.floor(Math.random() * 8), b = 6 + Math.floor(Math.random() * 4);
    const inp = h('input', { type: 'number', inputmode: 'numeric', autofocus: true });
    const err = h('p', { class: 'muted' });
    const m = Modal.open({
      title: '👩‍🏫 Zona profesorului',
      body: [h('p', null, 'Întrebare pentru adulți: cât fac ' + a + ' × ' + b + '?'), h('div', { class: 'field' }, inp), err],
      buttons: [{ text: 'Renunță' }, {
        text: 'Intră', cls: 'btn-primary', onClick: () => {
          if (parseInt(inp.value, 10) === a * b) { setTimeout(teacherPanel, 0); return true; }
          err.textContent = 'Răspuns greșit. 🙂';
          return false;
        }
      }]
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const x = m.el.querySelector('.btn-primary'); if (x) x.click(); } });
  }

  const GUIDE = '<h3>Cum se folosește</h3><ul>' +
    '<li>Fiecare copil își face un profil (prenume + animăluț). Progresul se salvează automat <b>în acest browser, pe acest calculator</b>. Dacă se șterg datele browserului, se șterge și progresul — folosiți fila <b>Date</b> pentru o copie de siguranță.</li>' +
    '<li>Sunt <b>5 lumi</b> (25 de niveluri + 5 misiuni). O lume nouă se deschide când copilul termină cel puțin 60% din lumea de dinainte.</li>' +
    '<li>Sesiune recomandată: 45–60 de minute. O lume ≈ 1–2 sesiuni.</li>' +
    '<li>Butonul <b>💡 Indiciu</b> dă indicii pe rând și, la final, o soluție. Încurajați copiii să încerce întâi singuri!</li>' +
    '<li>Pe tabletă: blocurile se trag cu degetul; o atingere pe un bloc din stânga îl adaugă direct la program.</li></ul>' +
    '<h3>Plan pe lumi</h3><ul>' +
    '<li><b>👣 1. Primii pași</b> (7+ ani) — secvențe, orientare stânga/dreapta. <i>Fără calculator:</i> jocul „Robotul uman” — un copil dă comenzi („un pas înainte”, „întoarce-te la stânga”), altul le execută pe un traseu desenat cu cretă.</li>' +
    '<li><b>🔁 2. Buclele magice</b> — tipare care se repetă, bucle în bucle. <i>Discuție:</i> „Ce faceți în fiecare zi de mai multe ori?” Limita de blocuri îi obligă să folosească bucla.</li>' +
    '<li><b>🎨 3. Bip pictorul</b> — numere, unghiuri (90°, 120°, 144°), bucle. <i>Legătură cu matematica:</i> 360° împărțit la numărul de colțuri.</li>' +
    '<li><b>🧠 4. Robotul isteț</b> (9+ ani) — condiții, bucla „până când”, algoritmi care merg pe orice drum. <i>Discuție:</i> „dacă… atunci… altfel” din viața de zi cu zi.</li>' +
    '<li><b>🎮 5. Atelierul de jocuri</b> — evenimente, coordonate x/y, bucla „pentru totdeauna”, variabile. Fiecare copil construiește jocul „Prinde stelele”, pas cu pas, apoi poate tipări <b>diploma</b>. Modul <b>Creează liber</b> se deschide după prima misiune.</li></ul>' +
    '<h3>Sfaturi</h3><ul>' +
    '<li>Lucrul în perechi: „pilotul” ține mouse-ul, „navigatorul” gândește cu voce tare; schimbați rolurile la fiecare nivel.</li>' +
    '<li>Lăudați depanarea: o greșeală e un indiciu, nu un eșec. Bip explică mereu ce n-a mers.</li>' +
    '<li>Întrebați „Ce crezi că va face Bip?” înainte de a apăsa ▶.</li>' +
    '<li>Cine termină mai repede poate încerca 3 stele (mai puține blocuri) sau un proiect propriu în „Creează liber”.</li></ul>';

  function teacherPanel() {
    const content = h('div');
    const tabs = h('div', { class: 'tabs' });
    const tabBtns = {};
    const show = name => {
      Object.keys(tabBtns).forEach(k => tabBtns[k].setAttribute('aria-pressed', String(k === name)));
      content.innerHTML = '';
      if (name === 'prog') renderProg();
      else if (name === 'guide') content.innerHTML = GUIDE;
      else renderData();
    };
    [['prog', '📊 Progres'], ['guide', '📘 Ghid'], ['data', '💾 Date']].forEach(t => {
      tabBtns[t[0]] = btn(t[1], () => show(t[0]), 'btn-sm');
      tabs.appendChild(tabBtns[t[0]]);
    });
    function renderProg() {
      const d = Store.data;
      if (!d.order.length) { content.appendChild(h('p', null, 'Nu există încă niciun jucător.')); return; }
      const tb = h('table', { class: 'prog' });
      tb.appendChild(h('tr', null, h('th', null, 'Copil'), h('th', null, '⭐'), h('th', null, 'Lumi (terminate / total)'), h('th', null, 'Acțiuni')));
      d.order.forEach(id => {
        const p = d.profiles[id];
        const worlds = WORLDS.map(w => w.icon + ' ' + P.doneCount(w, p) + '/' + w.levels.length).join('  ');
        tb.appendChild(h('tr', null,
          h('td', null, p.avatar + ' ', h('b', null, p.name)),
          h('td', null, String(P.totalStars(p))),
          h('td', null, worlds),
          h('td', null,
            btn(p.unlockAll ? '🔒 Blochează' : '🔓 Deblochează tot', () => { p.unlockAll = !p.unlockAll; Store.save(); show('prog'); }, 'btn-sm'),
            btn('♻️ Resetează', () => confirmBox('Resetezi progresul?', 'Tot progresul lui <b>' + esc(p.name) + '</b> va fi șters. Nu se poate anula.', 'Da, resetează', () => { P.reset(p); show('prog'); }), 'btn-sm'),
            btn('🗑️ Șterge', () => confirmBox('Ștergi profilul?', 'Profilul <b>' + esc(p.name) + '</b> va fi șters definitiv.', 'Da, șterge', () => { P.remove(id); show('prog'); }), 'btn-sm'))));
      });
      content.appendChild(h('div', { style: { overflowX: 'auto' } }, tb));
      content.appendChild(h('p', { class: 'muted' }, '„Deblochează tot” e util pentru demonstrații sau pentru copiii care vin mai târziu în grupă.'));
    }
    function renderData() {
      content.appendChild(h('p', null, 'Progresul se păstrează doar pe acest calculator. Descărcați o copie de siguranță (de ex. la finalul fiecărei săptămâni) sau mutați datele pe alt calculator.'));
      content.appendChild(h('div', { class: 'step-actions' },
        btn('⬇️ Descarcă copia de siguranță', () => {
          const dt = new Date().toISOString().slice(0, 10);
          download('bip-cod-magic-copie-' + dt + '.json', JSON.stringify(Store.data));
        }, 'btn-primary'),
        btn('⬆️ Încarcă o copie', () => {
          pickFile().then(txt => {
            if (!txt) return;
            let dd = null;
            try { dd = JSON.parse(txt); } catch (e) { dd = null; }
            if (!dd || typeof dd !== 'object' || !dd.profiles) { toast('Fișierul nu e o copie validă. 😕'); return; }
            confirmBox('Înlocuiești datele?', 'Toate profilurile de pe acest calculator vor fi înlocuite cu cele din fișier.', 'Da, înlocuiește', () => {
              Store.data = dd; Store.save(); Store.load();
              Modal.closeAll(); App.go('#/');
              toast('Datele au fost încărcate. ✅');
            });
          });
        })));
    }
    Modal.open({ title: '👩‍🏫 Zona profesorului', cls: 'wide', body: [tabs, content], buttons: [{ text: 'Închide', cls: 'btn-primary' }], onClose: () => { if (!location.hash || location.hash === '#/') App.route(); } });
    show('prog');
  }

  /* =========================================================
     Harta lumilor
     ========================================================= */
  class MapScreen {
    constructor() {
      const p = P.cur();
      const badges = P.badges();
      const bar = h('div', { class: 'topbar' },
        h('div', { class: 't-title' }, h('span', { style: { fontSize: '30px' } }, p.avatar), p.name),
        h('div', { class: 'map-head-stats' },
          h('span', { class: 'chip', title: 'Stele' }, '⭐ ' + P.totalStars()),
          h('span', { class: 'chip', title: 'Insigne' }, '🏅 ' + (badges.length ? badges.map(b => b.icon).join(' ') : '0'))),
        h('div', { class: 'spacer' }),
        btn('👥 Schimbă jucătorul', () => App.go('#/')),
        soundBtn());
      const bub = makeBubble();
      const done = P.totalDone();
      const name = esc(p.name);
      if (!done) bub.set('Salut, <b>' + name + '</b>! Eu sunt Bip. 🤖 Vreau să-mi construiesc propriul joc, dar întâi trebuie să învăț să programez. Mă ajuți? Începe cu <b>nivelul 1</b>! 👇');
      else if (P.isDone('w5-5')) bub.set('Ai construit jocul „Prinde stelele”! 🏆 Ești un adevărat programator, <b>' + name + '</b>. Poți crea orice în <b>Creează liber</b>.', 'good');
      else bub.set('Bine ai revenit, <b>' + name + '</b>! 😄 Continuăm aventura? Nivelul următor clipește în verde.');
      const fact = h('div', { class: 'fact', html: '💡 <b>Știai că…</b> ' + BIP.FACTS[Math.floor(Math.random() * BIP.FACTS.length)] });
      const inner = h('div', { class: 'map-inner' }, h('div', { class: 'map-welcome' }, bub.el, fact));
      const curId = P.currentId();
      this.bub = bub;
      WORLDS.forEach((w, wi) => inner.appendChild(this.worldCard(w, wi, curId)));
      this.el = h('div', { class: 'screen' }, bar, h('div', { class: 'map' }, inner));
    }
    worldCard(w, wi, curId) {
      const unlocked = P.worldUnlocked(wi);
      const dn = P.doneCount(w);
      const left = h('div', null,
        h('div', { class: 'w-ico' }, w.icon),
        h('div', { class: 'w-num' }, 'Lumea ' + w.num + ' · ' + dn + '/' + w.levels.length),
        h('div', { class: 'w-title' }, w.title),
        h('div', { class: 'w-concept' }, w.concept));
      if (P.worldDone(w)) left.appendChild(h('div', { class: 'w-badge' }, w.badge.icon + ' Insigna „' + w.badge.name + '”'));
      else if (!unlocked) left.appendChild(h('div', { class: 'w-lock' }, '🔒 Termină ' + P.need(wi) + ' niveluri din lumea ' + (wi) + ' ca s-o deschizi.'));
      const tokens = h('div', { class: 'tokens' });
      w.levels.forEach((l, li) => {
        const un = P.levelUnlocked(wi, li), d = P.isDone(l.id);
        let t;
        if (w.type === 'studio') {
          t = h('button', { class: 'token mission' + (d ? ' done' : '') + (!un ? ' locked' : '') + (l.id === curId ? ' cur' : ''), type: 'button', title: l.title },
            d ? '✅' : un ? '🎯' : '🔒', h('span', null, (li + 1) + '. ' + l.title));
        } else {
          const st = P.stars(l.id);
          t = h('button', { class: 'token' + (d ? ' done' : '') + (!un ? ' locked' : '') + (l.id === curId ? ' cur' : ''), type: 'button', title: 'Nivelul ' + (li + 1) + ': ' + l.title, 'aria-label': 'Nivelul ' + (li + 1) + ': ' + l.title + (d ? ', ' + st + ' stele' : '') },
            un ? String(li + 1) : '🔒',
            d ? h('span', { class: 'stars' }, '⭐'.repeat(st)) : null);
        }
        t.addEventListener('click', () => {
          if (!un) {
            Sound.play('fail');
            t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
            this.bub.set('Acest nivel e încă încuiat. 🔒 Termină întâi nivelurile de dinainte!', 'think');
            return;
          }
          Sound.play('click');
          App.go(levelHash(l));
        });
        tokens.appendChild(t);
      });
      if (w.type === 'studio') {
        const fu = P.freeUnlocked();
        const free = h('button', { class: 'token mission free' + (fu ? '' : ' locked'), type: 'button' }, fu ? '🎨' : '🔒', h('span', null, 'Creează liber'));
        free.addEventListener('click', () => {
          if (!fu) { Sound.play('fail'); this.bub.set('„Creează liber” se deschide după prima misiune din Atelier. 🛠️', 'think'); return; }
          App.go('#/liber');
        });
        tokens.appendChild(free);
        if (P.isDone('w5-5')) {
          const dip = h('button', { class: 'token mission done', type: 'button' }, '🎓', h('span', null, 'Diploma mea'));
          dip.addEventListener('click', () => App.go('#/diploma'));
          tokens.appendChild(dip);
        }
      }
      return h('section', { class: 'world' + (unlocked ? '' : ' locked'), style: { background: w.bg, color: w.ink }, 'data-world': w.id }, left, tokens);
    }
    mounted() {
      const cur = this.el.querySelector('.token.cur');
      if (cur) {
        const sec = cur.closest('.world');
        if (sec && sec.offsetTop > 300) setTimeout(() => { try { sec.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* */ } }, 150);
      }
    }
  }

  /* =========================================================
     Ecranul unui nivel (labirint / desen)
     ========================================================= */
  const FAIL_MSG = {
    blocked: 'Au! 🌳 Acolo nu e drum. Uită-te încotro sunt întors (săgeata) înainte să merg.',
    edge: 'Ups! Acolo e marginea lumii. Nu pot merge mai departe!',
    noGem: 'Aici nu e niciun diamant. 🤔 Folosește «culege diamantul» doar când stau pe un 💎.',
    missedGems: 'Am ajuns la baterie, dar am uitat diamante! 💎 Trebuie să le culeg pe toate.',
    notReached: 'Programul s-a terminat, dar n-am ajuns la baterie. 🔋 Mai am nevoie de blocuri!',
    tooLong: 'Of, am obosit! 😵 Programul meu nu se mai termină. Verifică buclele.',
    stuck: 'Mă învârt pe loc! 🌀 În bucla mea nu se întâmplă nimic. Pune în ea blocuri de mers sau de întors.',
    missing: 'Desenul nu e gata încă. ✏️ Mai lipsesc linii din model — verifică numerele și întoarcerile.',
    extra: 'Am desenat linii care nu sunt în model. 🤔 Verifică numerele: câți pași? câte grade?',
    mirror: 'Aproape! 😮 Desenul meu e pe partea cealaltă. Încearcă să mă întorc invers (stânga ↔ dreapta).',
    offPaper: 'Am ieșit de pe foaie! 📄 Numerele sunt prea mari.',
    free: 'Mai desenează puțin — măcar 4 linii! 🖍️',
    error: 'Hopa, ceva n-a mers. Mai încearcă o dată!'
  };

  class LevelScreen {
    constructor(f) {
      this.f = f; this.w = f.world; this.L = f.level; this.prof = P.cur();
      this.fails = 0; this.running = false; this.busy = false; this.hintsShown = 0; this.alive = true;
      const L = this.L, w = this.w;
      this.ctx = { condKinds: L.conds || MAZE_CTX.condKinds };
      const dots = h('div', { class: 'lvl-dots', 'aria-hidden': 'true' });
      w.levels.forEach((l, i) => dots.appendChild(h('span', { class: i === f.li ? 'cur' : (P.isDone(l.id) ? 'done' : '') })));
      this.hintBtn = btn('💡 Indiciu', () => this.showHints(), 'btn-sun');
      const bar = h('div', { class: 'topbar' },
        btn('🗺️ Harta', () => App.go('#/harta')),
        h('div', null, h('div', { class: 't-sub' }, w.icon + ' Lumea ' + w.num + ' · ' + w.title), h('div', { class: 't-title' }, 'Nivelul ' + (f.li + 1) + ': ' + L.title)),
        dots, h('div', { class: 'spacer' }),
        btn('📘 Ce învăț?', () => conceptModal(w)), this.hintBtn, soundBtn());
      // paleta
      this.palEl = h('div', { class: 'palette', 'aria-label': 'Blocuri' });
      this.trash = h('div', { class: 'trash-zone' }, h('div', { class: 'ic' }, '🗑️'), 'Lasă aici ca să ștergi');
      this.countEl = h('div', { class: 'panel-foot' });
      this.palPanel = h('div', { class: 'panel pal-panel' }, h('div', { class: 'panel-head' }, '🧩 Blocuri'), this.palEl, this.countEl, this.trash);
      // spațiul de lucru
      this.wsEl = h('div', { class: 'ws' });
      this.tools = [
        btn('↶ Anulează', () => { if (!this.running) this.editor.undo(); }, 'btn-sm', { title: 'Anulează ultima schimbare (Ctrl+Z)' }),
        btn('🧹 Aranjează', () => { if (!this.running) this.editor.cleanUp(); }, 'btn-sm'),
        btn('🗑️ Golește', () => { if (!this.running) confirmBox('Ștergi tot programul?', 'Toate blocurile vor dispărea (poți apăsa apoi „Anulează” dacă te răzgândești).', 'Da, golește', () => this.editor.reset(this.initial())); }, 'btn-sm')
      ];
      this.wsPanel = h('div', { class: 'panel ws-panel' }, h('div', { class: 'panel-head' }, '🛠️ Programul tău', h('div', { class: 'spacer' }), this.tools), this.wsEl);
      // scena
      this.bubble = makeBubble();
      this.cv = h('canvas', { 'aria-label': 'Lumea lui Bip' });
      this.tag = h('div', { class: 'stage-tag' });
      const box = h('div', { class: 'stage-box' }, this.cv, this.tag);
      this.runBtn = btn('▶ Pornește', () => this.run(), 'btn-go btn-big run');
      const resetBtn = btn('↺', () => this.resetWorld(), 'btn-big', { title: 'Pune-l pe Bip înapoi la start', 'aria-label': 'De la capăt' });
      const speeds = [['🐢', 1.8, 'Încet'], ['🐇', 1, 'Normal'], ['🚀', 0.4, 'Repede']];
      const sp = h('div', { class: 'speed', role: 'group', 'aria-label': 'Viteza' });
      const cs = Store.data.settings.speed || 1;
      speeds.forEach(s => {
        const b = btn(s[0], () => {
          Store.data.settings.speed = s[1]; Store.save();
          if (this.world) this.world.setSpeed(s[1]);
          Array.prototype.forEach.call(sp.children, x => x.setAttribute('aria-pressed', String(x === b)));
        }, '', { title: 'Viteza: ' + s[2], 'aria-pressed': String(Math.abs(cs - s[1]) < 0.01) });
        sp.appendChild(b);
      });
      const controls = h('div', { class: 'controls' }, this.runBtn, resetBtn, sp);
      if (L.free) controls.appendChild(btn('📥 Salvează desenul', () => this.world.toPNG(b => { if (b) download('desenul-meu.png', b); }), 'btn-sm'));
      this.goalEl = h('div', { class: 'goal-line' });
      this.stagePanel = h('div', { class: 'panel stage-panel' }, this.bubble.el, box, controls, this.goalEl);
      this.el = h('div', { class: 'screen' }, bar, h('div', { class: 'lvl-main' }, this.palPanel, this.wsPanel, this.stagePanel));
    }
    initial() { return [{ id: uid('s'), x: 24, y: 24, blocks: [mk('start')] }]; }
    mainScript() { return this.editor.scripts.find(s => s.blocks[0] && s.blocks[0].type === 'start'); }
    mounted() {
      const L = this.L;
      this.world = L.type === 'art' ? new BIP.ArtWorld(this.cv, L) : new BIP.MazeWorld(this.cv, L);
      this.world.setSpeed(Store.data.settings.speed || 1);
      const pal = L.blocks.map(t => (t === 'if' || t === 'ifElse') ? { type: t, args: { cond: { k: this.ctx.condKinds[0] } } } : t);
      this.editor = new BIP.Editor({
        ctx: this.ctx, paletteEl: this.palEl, paletteZone: this.palPanel, workspaceEl: this.wsEl, trashEl: this.trash,
        maxBlocks: L.maxBlocks || 0, palette: pal,
        mainScript: scripts => scripts.find(s => s.blocks[0] && s.blocks[0].type === 'start'),
        emptyHint: '👈 Trage blocurile de aici din stânga și lipește-le sub «când apeși Pornește»',
        onChange: () => this.onEdit(),
        onCount: (n, max) => this.onCount(n, max),
        onFull: () => this.bubble.set('Ai folosit toate cele <b>' + L.maxBlocks + '</b> blocuri! Ca să pui altul, scoate unul (trage-l înapoi în stânga). Gândește-te la o buclă! 🔁', 'think'),
        onWarn: () => this.bubble.set('Blocul «când apeși Pornește» nu se poate șterge — de la el pornește programul! 🙂', 'think')
      });
      this.editor.load(this.loadCode());
      this.updateTag();
      this.bubble.set(L.text);
      const gems = (L.map || (L.maps && L.maps[0]) || []).join('').indexOf('G') >= 0;
      const g = [];
      if (L.type === 'maze') g.push('🎯 Țintă: bateria 🔋' + (gems ? ' + toate diamantele 💎' : ''));
      else if (!L.free) g.push('🎯 Desenează peste modelul gri');
      if (!L.free) g.push('⭐⭐⭐ cu ' + L.optimal + ' blocuri');
      if (L.maxBlocks) g.push('🧩 maximum ' + L.maxBlocks + ' blocuri');
      this.goalEl.textContent = g.join(' · ');
      if (!this.prof.seen) this.prof.seen = {};
      if (!this.prof.seen[this.w.id]) {
        this.prof.seen[this.w.id] = true; Store.save();
        setTimeout(() => { if (this.alive) conceptModal(this.w); }, 300);
      }
      this._keys = e => {
        if (Modal.top()) return;
        const t = e.target;
        if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
        if ((e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'z') { e.preventDefault(); if (!this.running) this.editor.undo(); }
      };
      window.addEventListener('keydown', this._keys);
    }
    destroy() {
      this.alive = false;
      if (this.runner) this.runner.stop();
      this.running = false;
      if (this.editor) { this.saveCode(); this.editor.destroy(); }
      if (this.world) this.world.destroy();
      window.removeEventListener('keydown', this._keys);
      Store.save();
    }
    loadCode() {
      const saved = this.prof.codes && this.prof.codes[this.L.id];
      let scripts = null;
      if (Array.isArray(saved)) {
        try {
          scripts = clone(saved).map(s => ({ id: s.id || uid('s'), x: num(s.x, 24), y: num(s.y, 24), blocks: ensureIds(sanitize(s.blocks || [])) }))
            .filter(s => s.blocks.length);
        } catch (e) { scripts = null; }
      }
      if (!scripts || !scripts.some(s => s.blocks[0].type === 'start')) scripts = (scripts || []).concat(this.initial());
      return scripts;
    }
    saveCode() {
      if (!this.editor) return;
      if (!this.prof.codes) this.prof.codes = {};
      this.prof.codes[this.L.id] = clone(this.editor.scripts);
      Store.saveSoon();
    }
    onEdit() {
      this.saveCode();
      if (!this.running && this.dirtyWorld) {
        this.dirtyWorld = false;
        this.world.loadVariant(0);
        this.updateTag();
        this.editor.clearMarks();
      }
    }
    onCount(n, max) {
      this.countEl.textContent = max ? '🧩 Blocuri: ' + n + ' din ' + max : '🧩 Blocuri folosite: ' + n;
      this.countEl.classList.toggle('full', !!max && n >= max);
    }
    updateTag() {
      if (this.L.type === 'art') { this.tag.textContent = this.L.free ? '🎨 Desen liber' : '1 pătrățel = 25 de pași'; return; }
      const n = this.world.variantCount;
      if (n > 1) { this.tag.textContent = '🛣️ Drumul ' + (this.world.variant + 1) + ' din ' + n; this.tag.style.display = ''; }
      else this.tag.style.display = 'none';
    }
    setRunUI(on) {
      this.runBtn.textContent = on ? '⏹ Oprește' : '▶ Pornește';
      this.runBtn.classList.toggle('btn-go', !on);
      this.runBtn.classList.toggle('btn-stop', on);
      this.tools.forEach(b => { b.disabled = on; });
    }
    resetWorld() {
      if (this.running) { this.stopRun(); return; }
      this.world.loadVariant(0);
      this.updateTag();
      this.editor.clearMarks();
      this.dirtyWorld = false;
      this.bubble.set(this.L.text);
    }
    stopRun() {
      if (this.runner) this.runner.stop();
      this.running = false;
    }
    shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

    async run() {
      if (this.busy) { if (this.running) this.stopRun(); return; }
      const L = this.L;
      const main = this.mainScript();
      const body = main ? main.blocks.slice(1) : [];
      if (!body.length) {
        this.bubble.set('Nu am niciun bloc de făcut! 🤷 Trage blocuri din stânga și lipește-le sub «când apeși Pornește».', 'bad');
        Sound.play('fail');
        this.shake(this.wsPanel);
        return;
      }
      const loose = this.editor.scripts.some(s => s !== main);
      Sound.ac();
      this.busy = true; this.running = true;
      this.setRunUI(true);
      this.editor.lock(true);
      this.editor.clearMarks();
      let result = null;
      const n = this.world.variantCount;
      for (let v = 0; v < n; v++) {
        this.world.loadVariant(v);
        this.updateTag();
        this.bubble.set(n > 1 ? 'Încerc drumul ' + (v + 1) + ' din ' + n + '… 🚶' : 'Fac pașii din program, unul câte unul… 👀', 'think');
        await sleep(v ? 450 : 250);
        if (!this.running) { result = { stop: true }; break; }
        const runner = this.runner = new BIP.Runner(this.world, this.editor);
        try {
          await runner.list(body);
          result = this.world.finalCheck();
        } catch (e) {
          if (e && e.win) result = { ok: true };
          else if (e && e.stop) result = { stop: true };
          else if (e && e.fail) result = e;
          else { console.error(e); result = { fail: 'error' }; }
        }
        this.runner = null;
        if (!this.alive) return;
        if (!result.ok) { result.variant = v; break; }
        if (v < n - 1) {
          Sound.play('star');
          this.bubble.set('Super, drumul ' + (v + 1) + ' e gata! ✅ Acum încerc același program pe alt drum…', 'good');
          await this.world.celebrate();
          await sleep(600);
          if (!this.running) { result = { stop: true }; break; }
        }
      }
      this.running = false;
      this.busy = false;
      if (!this.alive) return;
      this.editor.lock(false);
      this.setRunUI(false);
      this.dirtyWorld = true;
      if (result.stop) { this.resetWorld(); return; }
      if (result.ok) { this.success(body); return; }
      this.failed(result, loose, n);
    }

    async success(body) {
      const L = this.L, wi = this.f.wi;
      // blocurile de culoare/grosime sunt „decor” și nu scad stelele
      const decor = list => list.reduce((n, b) => n + ((b.type === 'penColor' || b.type === 'penSize') ? 1 : 0) + decor(b.body || []) + decor(b.body2 || []), 0);
      const count = countBlocks(body) - decor(body);
      const stars = L.free ? 3 : (count <= L.optimal ? 3 : (count <= L.optimal + 2 ? 2 : 1));
      const worldWasDone = P.worldDone(this.w);
      const nextW = WORLDS[wi + 1];
      const nextWasOpen = nextW ? P.worldUnlocked(wi + 1) : true;
      P.setDone(L.id, stars);
      this.saveCode();
      this.fails = 0;
      this.hintBtn.classList.remove('pulse');
      Sound.play('win');
      Confetti.burst();
      this.bubble.set('Am reușit! 🎉 Mulțumesc, <b>' + esc(this.prof.name) + '</b>!', 'good');
      await this.world.celebrate();
      if (!this.alive) return;
      this.completeModal({
        stars: stars, count: count,
        worldNowDone: !worldWasDone && P.worldDone(this.w),
        nextOpened: nextW && !nextWasOpen && P.worldUnlocked(wi + 1) ? nextW : null
      });
    }
    completeModal(r) {
      const L = this.L;
      const row = h('div', { class: 'star-row', 'aria-label': r.stars + ' stele' }, [1, 2, 3].map(() => h('span', null, '⭐')));
      [0, 1, 2].forEach(i => {
        if (i < r.stars) setTimeout(() => { if (row.children[i]) { row.children[i].classList.add('on'); Sound.play('star'); } }, 250 + i * 330);
      });
      let msg;
      if (L.free) msg = 'Ce desen frumos! Ești un adevărat artist. 🎨';
      else if (r.stars === 3 && r.count < L.optimal) msg = 'Uau! Ai folosit doar <b>' + r.count + '</b> blocuri — chiar mai puține decât mine! 🤯';
      else if (r.stars === 3) msg = 'Perfect! Ai folosit <b>' + r.count + '</b> blocuri — exact cât trebuie. 💯';
      else msg = 'Ai folosit <b>' + r.count + '</b> blocuri. Poți reuși cu <b>' + L.optimal + '</b>? Încearcă din nou pentru 3 stele! 💪' + (this.w.num === 2 || this.w.num === 4 ? ' (Gândește-te la o buclă!)' : '');
      const body = [h('div', { class: 'modal-bip', html: bipSVG({ mood: 'happy', arms: 'up', light: '#3DDC84' }) }), row, h('p', { class: 'center', html: msg })];
      if (r.worldNowDone) {
        body.push(h('div', { class: 'center' }, h('div', { class: 'badge-big' }, this.w.badge.icon),
          h('p', { html: 'Ai terminat lumea <b>' + this.w.title + '</b> și ai câștigat insigna <b>„' + this.w.badge.name + '”</b>! 🏅' })));
        setTimeout(() => Sound.play('badge'), 1300);
      } else if (r.nextOpened) {
        body.push(h('p', { class: 'center', html: '🔓 Ai deschis o lume nouă: <b>' + r.nextOpened.icon + ' ' + r.nextOpened.title + '</b>!' }));
      }
      const nx = P.next(L.id);
      const buttons = [
        { text: '↺ Mai încearcă', onClick: () => this.resetWorld() },
        { text: '🗺️ Harta', onClick: () => setTimeout(() => App.go('#/harta'), 0) }
      ];
      if (nx && P.levelUnlocked(nx.wi, nx.li)) buttons.push({ text: 'Mai departe ➜', cls: 'btn-go', onClick: () => setTimeout(() => App.go(levelHash(nx.level)), 0) });
      Modal.open({ title: 'Bravo, ' + this.prof.name + '! 🎉', body: body, buttons: buttons });
    }
    failed(r, loose, n) {
      this.fails++;
      Sound.play('fail');
      let msg = FAIL_MSG[r.fail] || FAIL_MSG.error;
      if (n > 1 && r.variant > 0) msg = 'Pe <b>drumul ' + (r.variant + 1) + '</b> programul n-a mers. 😕 ' + msg + ' Programul trebuie să meargă pe <b>toate</b> drumurile!';
      if (loose) msg += '<br><small>⚠️ Ai și blocuri care nu sunt lipite de «când apeși Pornește» — pe acelea nu le fac.</small>';
      if (this.fails >= 2) { msg += '<br>Vrei un indiciu? Apasă <b>💡 Indiciu</b>.'; this.hintBtn.classList.add('pulse'); }
      if (r.id) this.editor.markError(r.id);
      this.bubble.set(msg, 'bad');
    }
    showHints() {
      this.hintBtn.classList.remove('pulse');
      const L = this.L;
      const hints = L.hints || [];
      const list = h('ul', { class: 'hint-list' });
      const solBox = h('div');
      const more = btn('💡 Încă un indiciu', () => showNext(), 'btn-sun');
      const solBtn = btn(L.free ? '👀 Arată-mi o idee' : '👀 Arată-mi o soluție', () => {
        solBtn.style.display = 'none';
        solBox.appendChild(h('p', { html: L.free ? 'O idee de desen (încearcă-l!):' : 'Iată o soluție. <b>Construiește-o tu</b> în spațiul de lucru! 💪' }));
        solBox.appendChild(staticBox([['start']].concat(L.sol), this.ctx));
      });
      const add = i => list.appendChild(h('li', { html: '💡 ' + hints[i] }));
      const upd = () => {
        more.style.display = this.hintsShown < hints.length ? '' : 'none';
        solBtn.style.display = this.hintsShown >= hints.length ? '' : 'none';
      };
      const showNext = () => { if (this.hintsShown < hints.length) { add(this.hintsShown); this.hintsShown++; } upd(); };
      for (let i = 0; i < this.hintsShown; i++) add(i);
      if (!this.hintsShown) showNext(); else upd();
      Modal.open({ title: '💡 Indicii', body: [list, h('div', { class: 'step-actions' }, more, solBtn), solBox], buttons: [{ text: 'Mulțumesc!', cls: 'btn-primary' }] });
    }
  }

  /* =========================================================
     Atelierul (misiuni ghidate + creează liber)
     ========================================================= */
  const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'space', Spacebar: 'space' };
  const freshEv = () => ({ flag: 0, keyLeft: 0, keyRight: 0, maxScore: 0, won: 0 });
  function newFreeProject() {
    return { backdrop: 'sky', vars: { scor: 0, 'vieți': 3 }, sprites: [BIP.newSprite({ name: 'Bip', kind: 'bip' }, 'bip')] };
  }
  function normalizeProject(p) {
    p.backdrop = p.backdrop || 'sky';
    p.vars = Object.assign({ scor: 0, 'vieți': 3 }, p.vars || {});
    p.sprites = (Array.isArray(p.sprites) ? p.sprites : []).filter(s => s && s.id);
    p.sprites.forEach(s => {
      s.kind = s.kind === 'bip' ? 'bip' : 'emoji';
      if (s.kind === 'emoji' && (!Array.isArray(s.costumes) || !s.costumes.length)) s.costumes = ['❓'];
      s.costume = Math.max(0, Math.round(num(s.costume)));
      s.x = num(s.x); s.y = num(s.y);
      s.dir = s.dir === undefined ? 90 : num(s.dir, 90);
      s.size = num(s.size, 100) || 100;
      s.visible = s.visible !== false;
      s.say = null;
      s.name = String(s.name || 'Personaj').slice(0, 20);
      s.scripts = (Array.isArray(s.scripts) ? s.scripts : []).map(sc => ({ id: sc.id || uid('s'), x: num(sc.x, 20), y: num(sc.y, 20), blocks: ensureIds(sanitize(sc.blocks || [])) })).filter(sc => sc.blocks.length);
    });
    if (!p.sprites.length) p.sprites.push(BIP.newSprite({ name: 'Bip', kind: 'bip' }, 'bip'));
    return p;
  }

  class StudioScreen {
    constructor(o) {
      this.free = !!o.free;
      this.prof = P.cur();
      this.alive = true;
      this.ev = freshEv();
      this.rtDone = {};
      this.curStep = -2;
      this.celebrated = false;
      this.vkeyEnds = [];
      if (this.free) { this.mission = null; this.mNum = 99; }
      else {
        this.f = o.mission; this.mission = o.mission.level; this.mNum = this.mission.index + 1;
        if (P.isDone(this.mission.id)) {
          this.mission.steps.forEach((st, i) => { if (st.runtime) this.rtDone[i] = true; });
          this.celebrated = true;
        }
      }
      this.project = this.loadProject();
      const firstSprite = this.mission && this.mission.steps[0].sprite;
      this.sel = (firstSprite && this.project.sprites.some(s => s.id === firstSprite)) ? firstSprite : this.project.sprites[0].id;
      this.buildUI();
    }
    loadProject() {
      const prof = this.prof;
      let p = this.free ? prof.free : prof.game;
      this.prepared = false;
      if (!p || !Array.isArray(p.sprites) || !p.sprites.length) {
        if (this.free) p = newFreeProject();
        else if (this.mission.index === 0) p = BIP.mission.newGameProject();
        else { p = BIP.mission.projectAfter(this.mission.index); this.prepared = true; }
      }
      normalizeProject(p);
      if (!this.free && this.mission.index >= 2) BIP.mission.ensureStar(p);
      if (this.free) prof.free = p; else prof.game = p;
      Store.saveSoon();
      return p;
    }
    save() { Store.saveSoon(); }
    curSprite() { return this.project.sprites.find(s => s.id === this.sel) || this.project.sprites[0]; }
    spriteName(id) { const s = this.project.sprites.find(x => x.id === id); return s ? s.name : id; }

    paletteSections() {
      const k = this.mNum;
      return BIP.STUDIO_PALETTE.map(sec => ({ cat: sec.cat, title: sec.title, items: sec.items.filter(it => it.m <= k).map(it => ({ type: it.type, args: it.args })) }))
        .filter(sec => sec.items.length);
    }
    buildUI() {
      const m = this.mission;
      const title = h('div', null, h('div', { class: 't-sub' }, '🎮 Lumea 5 · Atelierul de jocuri'),
        h('div', { class: 't-title' }, this.free ? '🎨 Creează liber' : 'Misiunea ' + this.mNum + ': ' + m.title));
      let dots = null;
      if (!this.free) {
        dots = h('div', { class: 'lvl-dots', 'aria-hidden': 'true' });
        BIP.MISSIONS.forEach((x, i) => dots.appendChild(h('span', { class: i === m.index ? 'cur' : (P.isDone(x.id) ? 'done' : '') })));
      }
      this.helpBtn = btn('💡 Ajutor', () => this.showHelp(), 'btn-sun');
      const bar = h('div', { class: 'topbar' }, btn('🗺️ Harta', () => App.go('#/harta')), title, dots, h('div', { class: 'spacer' }),
        btn('📘 Ce învăț?', () => this.showIntro()), this.helpBtn, soundBtn());
      // paleta cu categorii
      this.palEl = h('div', { class: 'palette', 'aria-label': 'Blocuri' });
      this.trash = h('div', { class: 'trash-zone' }, h('div', { class: 'ic' }, '🗑️'), 'Lasă aici ca să ștergi');
      this.sections = this.paletteSections();
      const tabs = h('div', { class: 'cat-tabs' });
      this.sections.forEach(sec => {
        const b = h('button', { class: 'cat-tab cat-' + sec.cat, type: 'button' }, h('span', { class: 'dot' }), sec.title);
        b.addEventListener('click', () => { Sound.play('click'); this.editor.scrollPaletteTo(sec.cat); });
        tabs.appendChild(b);
      });
      this.palPanel = h('div', { class: 'panel pal-panel' }, tabs, this.palEl, this.trash);
      // spațiul de lucru
      this.wsEl = h('div', { class: 'ws' });
      this.whoEl = h('div', { class: 'who-edit' });
      this.stepBar = this.free ? null : h('div', { class: 'step-bar', role: 'status', 'aria-live': 'polite' });
      this.wsPanel = h('div', { class: 'panel ws-panel' }, h('div', { class: 'panel-head' }, this.whoEl, h('div', { class: 'spacer' }),
        btn('↶ Anulează', () => this.editor.undo(), 'btn-sm', { title: 'Anulează (Ctrl+Z)' }),
        btn('🧹 Aranjează', () => this.editor.cleanUp(), 'btn-sm')), this.stepBar, this.wsEl);
      // scena
      this.flagBtn = btn('▶ Pornește', () => { this.stage.greenFlag(); this.flagBtn.blur(); try { this.cv.focus({ preventScroll: true }); } catch (e) { /* */ } }, 'btn-go');
      this.stopBtn = btn('⏹ Oprește', () => { this.stage.stopAll(true); this.stopBtn.blur(); }, 'btn-stop');
      this.coordsEl = h('span', { class: 'coords' }, '');
      this.cv = h('canvas', { 'aria-label': 'Scena jocului', tabindex: '0' });
      const vk = h('div', { class: 'vkeys' }, this.vkey('⬅', 'left'), this.vkey('⬆', 'up'), this.vkey('⬇', 'down'), this.vkey('➡', 'right'), this.vkey('spațiu', 'space'));
      const stageCard = h('div', { class: 'panel stage-card' },
        h('div', { class: 'stage-top' }, this.flagBtn, this.stopBtn, this.coordsEl),
        h('div', { class: 'stage-box wide' }, this.cv), vk);
      // personaje
      this.spritesEl = h('div', { class: 'sprites' });
      const spritesCard = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '🎭 Personaje — alege pe cine programezi'), this.spritesEl);
      if (this.free) spritesCard.appendChild(this.freeTools());
      const right = h('div', { class: 'right-col' }, stageCard, spritesCard);
      if (!this.free) {
        this.missionEl = h('div', { class: 'panel mission-card' });
        right.appendChild(this.missionEl);
      }
      this.el = h('div', { class: 'screen' }, bar, h('div', { class: 'studio-main' }, this.palPanel, this.wsPanel, right));
    }
    vkey(label, k) {
      const b = h('button', { class: 'btn', type: 'button', 'aria-label': 'Tasta ' + label }, label);
      let iv = null, to = null, down = false;
      const end = () => {
        if (!down) return;
        down = false;
        clearTimeout(to); clearInterval(iv); to = iv = null;
        if (this.stage) this.stage.keyUp(k);
      };
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        down = true;
        this.stage.keyDown(k);
        to = setTimeout(() => { iv = setInterval(() => { if (down) this.stage.keyDown(k); }, 70); }, 320);
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => b.addEventListener(n, end));
      this.vkeyEnds.push(end);
      return b;
    }
    freeTools() {
      const bd = h('select', { 'aria-label': 'Decorul scenei', title: 'Decorul scenei' });
      BIP.OPT.BACKDROPS.forEach(o => bd.appendChild(h('option', { value: o[0] }, '🖼️ ' + o[1])));
      bd.value = this.project.backdrop;
      bd.addEventListener('change', () => { this.project.backdrop = bd.value; this.save(); });
      this.bdSel = bd;
      return h('div', { class: 'free-tools' }, bd,
        btn('✏️ Nume', () => this.renameSprite(), 'btn-sm'),
        btn('👁 Arată / ascunde', () => { const s = this.curSprite(); s.visible = !s.visible; this.save(); this.renderSprites(); }, 'btn-sm'),
        btn('🗑️ Șterge personajul', () => this.deleteSprite(), 'btn-sm'),
        btn('💾 Salvează în fișier', () => download('proiectul-meu.bip.json', JSON.stringify({ app: 'bip-cod-magic', v: 1, project: this.project })), 'btn-sm'),
        btn('📂 Deschide', () => this.openFile(), 'btn-sm'),
        btn('🆕 Proiect nou', () => confirmBox('Începi un proiect nou?', 'Proiectul de acum va fi șters (salvează-l întâi în fișier, dacă vrei să-l păstrezi).', 'Da, proiect nou', () => this.replaceProject(newFreeProject())), 'btn-sm'));
    }
    mounted() {
      this.ctx = {
        condKinds: BIP.STUDIO_CONDS.filter(c => c.m <= this.mNum).map(c => c.k),
        touchTargets: () => this.project.sprites.filter(s => s.id !== this.sel).map(s => ['#' + s.id, s.name])
      };
      this.staticCtx = { condKinds: BIP.STUDIO_CONDS.map(c => c.k), touchTargets: () => this.project.sprites.map(s => ['#' + s.id, s.name]) };
      this.stage = new BIP.Stage(this.cv, this.project, {
        onEvent: (n, d) => this.onStageEvent(n, d),
        onThread: (script, sprite, on) => { if (sprite.id === this.sel && this.editor) this.editor.setStackRunning(script.id, on); },
        onRunning: r => { this.flagBtn.textContent = r ? '↻ Repornește' : '▶ Pornește'; },
        onSelect: s => { if (s.id !== this.sel) this.selectSprite(s.id); },
        onMouse: (x, y) => { this.mouseXY = { x: x, y: y, t: performance.now() }; },
        onMoved: () => this.save()
      });
      this.editor = new BIP.Editor({
        ctx: this.ctx, paletteEl: this.palEl, paletteZone: this.palPanel, workspaceEl: this.wsEl, trashEl: this.trash,
        palette: this.sections,
        emptyHint: '👈 Trage aici blocuri din stânga. Începe cu un bloc galben «când…»',
        onChange: () => this.onEdit()
      });
      this.selectSprite(this.sel, true);
      this.coordT = setInterval(() => this.updateCoords(), 200);
      this._kd = e => this.onKey(e, true);
      this._ku = e => this.onKey(e, false);
      window.addEventListener('keydown', this._kd);
      window.addEventListener('keyup', this._ku);
      this.evalSteps();
      const seenKey = this.free ? 'free' : this.mission.id;
      if (!this.prof.seen) this.prof.seen = {};
      if (!this.prof.seen[seenKey] || this.prepared) {
        this.prof.seen[seenKey] = true; Store.save();
        setTimeout(() => { if (this.alive) this.showIntro(); }, 300);
      }
    }
    destroy() {
      this.alive = false;
      clearInterval(this.coordT);
      this.vkeyEnds.forEach(f => f());
      window.removeEventListener('keydown', this._kd);
      window.removeEventListener('keyup', this._ku);
      if (this.stage) this.stage.destroy();
      if (this.editor) this.editor.destroy();
      this.project.sprites.forEach(s => { s.say = null; });
      Store.save();
    }
    onKey(e, down) {
      if (Modal.top()) return;
      const t = e.target;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (down && (e.ctrlKey || e.metaKey) && (e.key || '').toLowerCase() === 'z') { e.preventDefault(); this.editor.undo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = KEYMAP[e.key] || ((e.key || '').length === 1 ? e.key.toLowerCase() : null);
      if (!k) return;
      if (['left', 'right', 'up', 'down', 'space'].indexOf(k) >= 0) e.preventDefault();
      if (down) this.stage.keyDown(k); else this.stage.keyUp(k);
    }
    updateCoords() {
      const m = this.mouseXY;
      if (m && performance.now() - m.t < 1500) { this.coordsEl.textContent = '🖱️ x: ' + m.x + '  y: ' + m.y; return; }
      const s = this.curSprite();
      if (s) this.coordsEl.textContent = s.name + ' → x: ' + Math.round(s.x) + '  y: ' + Math.round(s.y);
    }
    selectSprite(id, initial) {
      if (!this.project.sprites.some(s => s.id === id)) id = this.project.sprites[0].id;
      this.sel = id;
      this.stage.selectedId = id;
      const s = this.curSprite();
      this.editor.load(s.scripts);
      this.stage.threads.forEach(t => { if (t.sprite === s) this.editor.setStackRunning(t.script.id, true); });
      const ic = BIP.spriteIcon(s);
      this.whoEl.innerHTML = '';
      this.whoEl.appendChild(h('span', { class: 'em', html: ic.svg || null }, ic.svg ? null : ic.text));
      this.whoEl.appendChild(h('span', null, 'Programezi: ' + s.name));
      if (!initial) Sound.play('click');
      this.renderSprites();
      this.updateCoords();
      this.evalSteps();
    }
    renderSprites() {
      const el = this.spritesEl;
      el.innerHTML = '';
      this.project.sprites.forEach(s => {
        const ic = BIP.spriteIcon(s);
        const card = h('button', {
          class: 'scard' + (s.id === this.sel ? ' sel' : '') + (s.visible ? '' : ' hidden-sprite') + (this.attnSprite === s.id && s.id !== this.sel ? ' attn' : ''),
          type: 'button', title: s.name + (s.visible ? '' : ' (ascuns)'), 'aria-pressed': String(s.id === this.sel)
        }, h('div', { class: 'em', html: ic.svg || null }, ic.svg ? null : ic.text), h('div', { class: 'nm' }, s.name));
        card.addEventListener('click', () => this.selectSprite(s.id));
        el.appendChild(card);
      });
      if (this.free) {
        const add = h('button', { class: 'scard add', type: 'button', title: 'Adaugă un personaj' }, h('div', { class: 'em' }, '➕'), h('div', { class: 'nm' }, 'Adaugă'));
        add.addEventListener('click', () => { Sound.play('click'); this.addSpriteModal(); });
        el.appendChild(add);
      }
    }
    onEdit() {
      this.save();
      this.stage.refreshMonitors();
      this.evalSteps();
    }

    /* ---------- verificarea pașilor ---------- */
    evalSteps() {
      if (this.free || !this.mission) return;
      const m = this.mission, p = this.project, ui = { selected: this.sel };
      const states = m.steps.map((st, i) => {
        if (st.runtime) return !!this.rtDone[i];
        try { return !!st.check(p, ui); } catch (e) { return false; }
      });
      const cur = states.indexOf(false);
      if (cur !== this.curStep) {
        if (this.curStep >= 0 && (cur > this.curStep || cur === -1)) {
          Sound.play('star');
          toast('✅ Pasul ' + (this.curStep + 1) + ' e gata! ' + (cur >= 0 ? 'Urmează pasul ' + (cur + 1) + '.' : ''), 2200);
        }
        const st = m.steps[cur];
        if (st && st.runtime) this.ev = freshEv();
        this.curStep = cur;
      }
      this.stepStates = states;
      const cs = cur >= 0 ? m.steps[cur] : null;
      this.attnSprite = cs ? (cs.attn || (cs.sprite && cs.sprite !== this.sel ? cs.sprite : null)) : null;
      const sig = states.join(',') + '|' + cur + '|' + this.attnSprite + '|' + this.sel;
      if (sig !== this.sig) { this.sig = sig; this.renderMission(); this.renderSprites(); }
      if (cur < 0 && !this.celebrated) { this.celebrated = true; this.missionComplete(this.lastWasRuntime ? 2600 : 700); }
    }
    onStageEvent(name, d) {
      const ev = this.ev;
      if (name === 'flag') ev.flag++;
      else if (name === 'key') { if (d.key === 'left') ev.keyLeft++; if (d.key === 'right') ev.keyRight++; }
      else if (name === 'var') { if (d.v === 'scor') ev.maxScore = Math.max(ev.maxScore, num(d.val)); }
      else if (name === 'stopAll') { if (num(d.vars.scor) >= 3) ev.won++; }
      if (name === 'stopAll' && this.bdSel) this.bdSel.value = this.project.backdrop;
      if (this.free || !this.mission) return;
      const st = this.mission.steps[this.curStep];
      if (st && st.runtime && st.runtime(ev)) {
        this.rtDone[this.curStep] = true;
        this.lastWasRuntime = true;
        this.evalSteps();
        this.lastWasRuntime = false;
      }
    }
    renderMission() {
      const m = this.mission, card = this.missionEl;
      if (!card) return;
      card.innerHTML = '';
      card.appendChild(h('h3', null, '🎯 ' + m.title));
      card.appendChild(h('div', { class: 'm-concept' }, '📘 ' + m.concept));
      const ol = h('ol', { class: 'steps' });
      m.steps.forEach((st, i) => {
        const cls = this.stepStates[i] ? 'done' : (i === this.curStep ? 'cur' : 'later');
        let html = st.text;
        if (i === this.curStep && st.sprite && st.sprite !== this.sel) html += ' <i>(pentru ' + esc(this.spriteName(st.sprite)) + ' — alege-l de sub scenă)</i>';
        ol.appendChild(h('li', { class: cls, html: html }));
      });
      card.appendChild(ol);
      const cur = m.steps[this.curStep];
      if (this.stepBar) {
        const sb = this.stepBar;
        sb.innerHTML = '';
        sb.classList.toggle('done', !cur);
        if (cur) {
          let txt = '<b>🎯 Pasul ' + (this.curStep + 1) + ' din ' + m.steps.length + ':</b> ' + cur.text;
          if (cur.sprite && cur.sprite !== this.sel) txt += ' <i>(alege întâi personajul ' + esc(this.spriteName(cur.sprite)) + ' de sub scenă)</i>';
          sb.appendChild(h('div', { class: 'st-txt', html: txt }));
          if (cur.snippet) {
            sb.appendChild(btn('💡', () => this.showHelp(), 'btn-sun btn-sm', { title: 'Arată-mi blocurile', 'aria-label': 'Arată-mi blocurile' }));
            sb.appendChild(btn('🧩', () => this.placeSnippet(cur), 'btn-sm', { title: 'Pune blocurile pe masă', 'aria-label': 'Pune blocurile pe masă' }));
          }
        } else {
          sb.appendChild(h('div', { class: 'st-txt', html: '<b>✅ Misiune îndeplinită!</b> Te poți juca în continuare sau poți trece mai departe.' }));
          const nx2 = BIP.MISSIONS[m.index + 1];
          sb.appendChild(nx2 ? btn('Misiunea următoare ➜', () => App.go('#/atelier/' + nx2.id), 'btn-go btn-sm') : btn('🎓 Diploma', () => App.go('#/diploma'), 'btn-go btn-sm'));
        }
      }
      if (cur) {
        if (cur.tip) card.appendChild(h('p', { class: 'muted', style: { fontSize: '13px', margin: '8px 0 0' }, html: '💬 ' + cur.tip }));
        if (cur.snippet) {
          card.appendChild(h('div', { class: 'step-actions' },
            btn('💡 Arată-mi blocurile', () => this.showHelp(), 'btn-sun btn-sm'),
            btn('🧩 Pune-le pe masă', () => this.placeSnippet(cur), 'btn-sm')));
        }
      } else {
        card.appendChild(h('p', { html: '✅ <b>Misiune îndeplinită!</b> Bravo!' }));
        const nx = BIP.MISSIONS[m.index + 1];
        const acts = h('div', { class: 'step-actions' });
        if (nx) acts.appendChild(btn('Misiunea următoare ➜', () => App.go('#/atelier/' + nx.id), 'btn-go btn-sm'));
        else {
          acts.appendChild(btn('🎓 Diploma mea', () => App.go('#/diploma'), 'btn-go btn-sm'));
          acts.appendChild(btn('🎨 Creează liber', () => App.go('#/liber'), 'btn-sm'));
        }
        card.appendChild(acts);
      }
      if (m.index > 0) {
        const rescue = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', style: { marginTop: '6px', color: 'var(--muted)' } }, '🧰 Te-ai încurcat? Încarcă proiectul de rezervă');
        rescue.addEventListener('click', () => confirmBox('Încarci proiectul de rezervă?', 'Proiectul tău va fi înlocuit cu o variantă gata făcută a misiunilor de până acum. Poți continua apoi cu misiunea aceasta.', 'Da, încarcă', () => {
          const p = BIP.mission.projectAfter(m.index);
          if (m.index >= 2) BIP.mission.ensureStar(p);
          this.replaceProject(p);
        }, 'btn-primary'));
        card.appendChild(rescue);
      }
    }
    missionComplete(delay) {
      const m = this.mission;
      const worldWasDone = P.worldDone(WORLDS[4]);
      P.setDone(m.id, 3);
      const last = m.index === BIP.MISSIONS.length - 1;
      setTimeout(() => {
        if (!this.alive) return;
        Sound.play('win');
        Confetti.burst();
        const nx = BIP.MISSIONS[m.index + 1];
        if (last) {
          const badge = WORLDS[4].badge;
          setTimeout(() => Sound.play('badge'), 1200);
          Modal.open({
            title: 'Ai construit primul tău joc! 🏆',
            body: [h('div', { class: 'modal-bip', html: bipSVG({ mood: 'happy', arms: 'up', light: '#3DDC84' }) }),
              h('p', { class: 'center', html: 'Felicitări, <b>' + esc(this.prof.name) + '</b>! Jocul <b>„Prinde stelele”</b> e gata și e făcut <b>de tine</b>: evenimente, bucle, condiții și variabile — ca un programator adevărat! 🎉' }),
              !worldWasDone && P.worldDone(WORLDS[4]) ? h('div', { class: 'center' }, h('div', { class: 'badge-big' }, badge.icon), h('p', { html: 'Ai câștigat insigna <b>„' + badge.name + '”</b>!' })) : null,
              h('p', { class: 'center muted' }, 'Acum poți să-ți inventezi propriile proiecte în „Creează liber”.')],
            buttons: [
              { text: '🎮 Mai joc puțin' },
              { text: '🎨 Creează liber', onClick: () => setTimeout(() => App.go('#/liber'), 0) },
              { text: '🎓 Vezi diploma', cls: 'btn-go', onClick: () => setTimeout(() => App.go('#/diploma'), 0) }
            ]
          });
        } else {
          Modal.open({
            title: 'Misiune îndeplinită! 🎉',
            body: [h('div', { class: 'modal-bip', html: bipSVG({ mood: 'happy', arms: 'up', light: '#3DDC84' }) }),
              h('p', { class: 'center', html: 'Bravo, <b>' + esc(this.prof.name) + '</b>! Ai terminat misiunea <b>„' + m.title + '”</b>.<br>Ai învățat: <b>' + m.concept + '</b>.' }),
              nx ? h('p', { class: 'center muted', html: 'Următoarea misiune: <b>' + nx.title + '</b> — ' + nx.goal }) : null],
            buttons: [{ text: 'Rămân aici' }, nx ? { text: 'Misiunea următoare ➜', cls: 'btn-go', onClick: () => setTimeout(() => App.go('#/atelier/' + nx.id), 0) } : null].filter(Boolean)
          });
        }
      }, delay || 700);
    }
    placeSnippet(st) {
      if (st.sprite && st.sprite !== this.sel) this.selectSprite(st.sprite);
      this.editor.addScript(build(st.place || st.snippet), 40);
      Sound.play('snap');
      toast('Am pus blocurile în zona de lucru. 👇 Acum trage-le la locul potrivit!', 3600);
    }
    showHelp() {
      const body = [];
      let st = null;
      if (!this.free) {
        st = this.mission.steps[this.curStep] || null;
        if (st) {
          body.push(h('p', { html: '<b>Pasul ' + (this.curStep + 1) + ':</b> ' + st.text }));
          if (st.sprite) body.push(h('p', { class: 'muted', html: 'Pentru personajul: <b>' + esc(this.spriteName(st.sprite)) + '</b>' }));
          if (st.tip) body.push(h('p', { class: 'muted', html: '💬 ' + st.tip }));
          if (st.snippet) {
            body.push(h('p', null, 'Blocurile de care ai nevoie arată cam așa:'));
            body.push(h('div', { class: 'static-box' }, BIP.renderStatic(build(st.snippet), this.staticCtx)));
          }
        } else body.push(h('p', { html: '✅ Ai terminat toți pașii misiunii!' }));
      }
      body.push(h('h3', null, 'Cum lucrez în Atelier?'));
      body.push(h('ul', { html: '<li>Alege un <b>personaj</b> de sub scenă — blocurile din mijloc sunt <b>ale lui</b>.</li>' +
        '<li><b>Trage</b> blocuri din stânga și lipește-le unele sub altele. Un bloc galben <b>«când…»</b> pornește scriptul.</li>' +
        '<li>Apasă <b>▶ Pornește</b> ca să rulezi jocul și <b>⏹ Oprește</b> ca să-l oprești.</li>' +
        '<li>Ca să ștergi un bloc, trage-l înapoi în stânga. Clic dreapta (sau ține degetul apăsat) pe un bloc pentru <b>Duplică / Șterge</b>.</li>' +
        '<li>Poți muta personajele trăgându-le direct pe scenă.</li>' }));
      const buttons = [{ text: 'Am înțeles', cls: 'btn-primary' }];
      if (st && st.snippet) buttons.unshift({ text: '🧩 Pune blocurile pe masă', onClick: () => this.placeSnippet(st) });
      Modal.open({ title: '💡 Ajutor', body: body, buttons: buttons, cls: 'wide' });
    }
    showIntro() {
      const body = [h('div', { class: 'modal-bip', html: bipSVG({ mood: 'wow' }) })];
      if (this.free) {
        body.push(h('div', { html: 'Aici poți crea <b>orice vrei</b>: o poveste animată, o felicitare, un joc nou! 🎨<br><br>• Adaugă personaje cu butonul <b>➕ Adaugă</b> de sub scenă.<br>• Schimbă decorul din lista de sub personaje.<br>• Toate blocurile sunt deblocate.<br>• Cu <b>💾 Salvează în fișier</b> îți poți lua proiectul acasă!' }));
      } else {
        body.push(h('p', { html: '<b>🎯 Scopul:</b> ' + this.mission.goal }));
        body.push(h('div', { html: this.mission.intro }));
        if (this.prepared) body.push(h('p', { class: 'muted', html: '🧰 Am pregătit pentru tine proiectul cu tot ce s-a construit în misiunile de dinainte.' }));
      }
      Modal.open({ title: this.free ? '🎨 Creează liber' : '🎮 Misiunea ' + this.mNum + ': ' + this.mission.title, body: body, cls: 'wide', buttons: [{ text: 'Să începem! 🚀', cls: 'btn-go' }] });
    }
    replaceProject(p) {
      normalizeProject(p);
      this.stage.stopAll(true);
      this.project = p;
      if (this.free) this.prof.free = p; else this.prof.game = p;
      this.stage.setProject(p);
      if (this.bdSel) this.bdSel.value = p.backdrop;
      this.rtDone = {};
      this.celebrated = P.isDone(this.mission ? this.mission.id : 'x');
      if (this.celebrated && this.mission) this.mission.steps.forEach((st, i) => { if (st.runtime) this.rtDone[i] = true; });
      this.sig = null;
      this.selectSprite(p.sprites[0].id);
      Store.save();
    }
    addSpriteModal() {
      const g = h('div', { class: 'gallery' });
      const m = Modal.open({ title: '➕ Alege un personaj', body: g, cls: 'wide', buttons: [{ text: 'Renunță' }] });
      BIP.SPRITE_LIB.forEach(lib => {
        const ic = BIP.spriteIcon(BIP.newSprite(lib));
        const b = h('button', { type: 'button' }, h('div', { class: 'em', html: ic.svg || null }, ic.svg ? null : ic.text), lib.name);
        b.addEventListener('click', () => { m.close(); this.addSprite(lib); });
        g.appendChild(b);
      });
    }
    addSprite(lib) {
      if (this.project.sprites.length >= 12) { toast('Ai deja 12 personaje — e destul! 🙂'); return; }
      const s = BIP.newSprite(lib);
      let name = lib.name, n = 2;
      while (this.project.sprites.some(x => x.name === name)) name = lib.name + ' ' + (n++);
      s.name = name;
      s.x = Math.round(Math.random() * 280 - 140);
      s.y = Math.round(Math.random() * 180 - 90);
      this.project.sprites.push(s);
      this.save();
      Sound.play('pop');
      this.selectSprite(s.id);
    }
    renameSprite() {
      const s = this.curSprite();
      const inp = h('input', { type: 'text', maxlength: 20, value: s.name, autofocus: true });
      const m = Modal.open({
        title: '✏️ Numele personajului', body: h('div', { class: 'field' }, inp),
        buttons: [{ text: 'Renunță' }, { text: 'Salvează', cls: 'btn-primary', onClick: () => { const v = inp.value.trim(); if (!v) return false; s.name = v.slice(0, 20); this.save(); this.selectSprite(s.id); return true; } }]
      });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = m.el.querySelector('.btn-primary'); if (b) b.click(); } });
    }
    deleteSprite() {
      const s = this.curSprite();
      if (this.project.sprites.length <= 1) { toast('Ai nevoie de cel puțin un personaj. 🙂'); return; }
      confirmBox('Ștergi personajul?', 'Personajul <b>' + esc(s.name) + '</b> și scripturile lui vor fi șterse.', 'Da, șterge', () => {
        this.stage.stopAll(true);
        this.project.sprites = this.project.sprites.filter(x => x !== s);
        this.save();
        this.selectSprite(this.project.sprites[0].id);
      });
    }
    openFile() {
      pickFile().then(txt => {
        if (!txt) return;
        let d = null;
        try { d = JSON.parse(txt); } catch (e) { d = null; }
        const p = d && d.project ? d.project : d;
        if (!p || !Array.isArray(p.sprites)) { toast('Fișierul nu poate fi deschis. 😕'); return; }
        this.replaceProject(p);
        toast('Proiect deschis! 📂');
      });
    }
  }

  /* =========================================================
     Diploma
     ========================================================= */
  class DiplomaScreen {
    constructor() {
      const p = P.cur();
      const finished = P.isDone('w5-5');
      const date = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
      const badges = P.badges().map(b => b.icon).join(' ');
      this.el = h('div', { class: 'screen' },
        h('div', { class: 'topbar no-print' }, btn('🗺️ Harta', () => App.go('#/harta')), h('div', { class: 't-title' }, '🎓 Diploma'), h('div', { class: 'spacer' }),
          btn('🖨️ Tipărește', () => window.print(), 'btn-primary')),
        h('div', { class: 'dip-screen' },
          h('div', { class: 'diploma' },
            h('div', { class: 'dip-border' },
              h('div', { class: 'dip-top' }, '🏆'),
              h('h1', null, 'DIPLOMĂ'),
              h('h2', null, 'de Tânăr Programator'),
              h('p', { class: 'dip-text' }, 'Această diplomă este acordată cu mândrie pentru'),
              h('div', { class: 'dip-name' }, p.name),
              h('p', { class: 'dip-text' }, finished
                ? 'pentru că a învățat să programeze cu blocuri — secvențe, bucle, desen, condiții, evenimente și variabile — și a construit propriul joc, „Prinde stelele”!'
                : 'pentru curajul și efortul de a învăța să programeze cu blocuri. Aventura continuă!'),
              h('div', { class: 'dip-badges' }, badges || '⭐'),
              h('p', { class: 'dip-text' }, '⭐ ' + P.totalStars() + ' stele câștigate · ✅ ' + P.totalDone() + ' niveluri și misiuni'),
              h('div', { class: 'dip-sign' }, h('div', null, 'Data: ' + date), h('div', null, 'Profesor'), h('div', null, 'Bip 🤖')))),
          h('div', { class: 'dip-actions no-print' }, btn('🖨️ Tipărește diploma', () => window.print(), 'btn-primary btn-big'))));
    }
    mounted() { if (P.isDone('w5-5')) setTimeout(() => Confetti.burst(90), 300); }
  }

  BIP.App = App;
  BIP.Progress = P;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.init());
  else App.init();
})();
