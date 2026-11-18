/* =========================================================
   Bip și Codul Magic — Atelierul: misiunile ghidate
   Copiii construiesc, pas cu pas, propriul joc: „Prinde stelele”.
   Fiecare pas se verifică automat pe măsură ce lucrează.
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { num } = BIP.util;
  const { build } = BIP.blocks;

  /* ---------- ajutoare pentru verificări ---------- */
  const Q = {
    sprite: (p, id) => p.sprites.find(s => s.id === id),
    scripts: (s, hat, pred) => s ? s.scripts.filter(sc => sc.blocks[0] && sc.blocks[0].type === hat && (!pred || pred(sc.blocks[0]))) : [],
    find(list, pred) {
      for (const b of list || []) {
        if (pred(b)) return b;
        const r = Q.find(b.body, pred) || Q.find(b.body2, pred);
        if (r) return r;
      }
      return null;
    },
    findIn(scripts, pred) {
      for (const sc of scripts) { const r = Q.find(sc.blocks, pred); if (r) return r; }
      return null;
    },
    allScripts: p => p.sprites.reduce((a, s) => a.concat(s.scripts), [])
  };
  const isIf = b => b.type === 'if' || b.type === 'ifElse';
  const condIs = (b, k, t) => b.args && b.args.cond && b.args.cond.k === k && (t === undefined || b.args.cond.t === t);
  const isTopReset = b => (b.type === 'setY' && num(b.args.n) >= 100) || (b.type === 'gotoXY' && num(b.args.y) >= 100);

  const bipFlag = p => Q.scripts(Q.sprite(p, 'bip'), 'whenFlag');
  const starFlag = p => Q.scripts(Q.sprite(p, 'star'), 'whenFlag');
  const starForever = p => Q.findIn(starFlag(p), b => b.type === 'forever');
  const catchIf = p => { const f = starForever(p); return f ? Q.find(f.body, b => isIf(b) && condIs(b, 'touch', '#bip')) : null; };
  const winIf = p => Q.findIn(Q.allScripts(p), b => isIf(b) && b.args.cond && b.args.cond.k === 'varCmp' && b.args.cond.v === 'scor' && ['>=', '=', '>'].indexOf(b.args.cond.op) >= 0);

  /* ---------- proiectul de pornire ---------- */
  function newGameProject() {
    const bip = BIP.newSprite({ name: 'Bip', kind: 'bip' }, 'bip');
    return { backdrop: 'night', vars: { scor: 0, 'vieți': 3 }, sprites: [bip] };
  }
  function ensureStar(p) {
    if (!Q.sprite(p, 'star')) {
      const s = BIP.newSprite({ name: 'Steaua', costumes: ['⭐', '🌟'] }, 'star');
      s.x = 60; s.y = 150;
      p.sprites.push(s);
    }
  }
  const S = (blocks, x, y) => ({ x: x || 24, y: y || 24, blocks: build(blocks) });

  /* Soluțiile de referință (cumulate) — folosite ca „proiect gata pregătit” */
  const SOL = {
    bip1: () => [{ type: 'whenFlag' }, { type: 'gotoXY', args: { x: 0, y: -120 } }, { type: 'sayFor', args: { t: 'Hai să prindem stele!', s: 2 } }],
    keys: () => [S([{ type: 'whenKey', args: { k: 'left' } }, { type: 'changeX', args: { n: -20 } }], 24, 400), S([{ type: 'whenKey', args: { k: 'right' } }, { type: 'changeX', args: { n: 20 } }], 320, 400)],
    star3: () => [{ type: 'whenFlag' }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }, { type: 'forever', body: [{ type: 'changeY', args: { n: -5 } }, { type: 'if', args: { cond: { k: 'touch', t: 'edgeB' } }, body: [{ type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] }] }],
    star4: speed => [{ type: 'whenFlag' }, { type: 'setVar', args: { v: 'scor', n: 0 } }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }, {
      type: 'forever', body: [{ type: 'changeY', args: { n: speed || -5 } },
        { type: 'if', args: { cond: { k: 'touch', t: 'edgeB' } }, body: [{ type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] },
        { type: 'if', args: { cond: { k: 'touch', t: '#bip' } }, body: [{ type: 'changeVar', args: { v: 'scor', n: 1 } }, { type: 'playSound', args: { s: 'coin' } }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] }]
    }],
    win: () => ({ type: 'forever', body: [{ type: 'if', args: { cond: { k: 'varCmp', v: 'scor', op: '>=', n: 10 } }, body: [{ type: 'say', args: { t: 'Am câștigat! 🏆' } }, { type: 'playSound', args: { s: 'victory' } }, { type: 'stopAll' }] }] })
  };
  function projectAfter(k) {
    const p = newGameProject();
    const bip = p.sprites[0];
    if (k >= 1) bip.scripts.push(S(SOL.bip1()));
    if (k >= 2) SOL.keys().forEach(s => bip.scripts.push(s));
    if (k >= 3) { ensureStar(p); Q.sprite(p, 'star').scripts.push(S(k >= 4 ? SOL.star4(k >= 5 ? -8 : -5) : SOL.star3())); }
    if (k >= 5) { bip.scripts[0] = S(SOL.bip1().concat([SOL.win()])); }
    return p;
  }

  /* ---------- misiunile ---------- */
  const MISSIONS = [
    {
      id: 'w5-1', title: 'Salut, scenă!', concept: 'Evenimente: «când apeși Pornește»', upTo: 1,
      goal: 'Bip se prezintă atunci când pornește jocul.',
      intro: 'Bun venit în <b>Atelier</b>! 🛠️ Aici vei construi <b>propria ta aplicație</b>: jocul <b>„Prinde stelele”</b> ⭐.<br><br>• <b>Scena</b> (în dreapta) e locul unde se joacă personajele.<br>• Fiecare <b>personaj</b> are scripturile lui — îl alegi de sub scenă.<br>• Blocurile galbene <b>«când…»</b> sunt <b>evenimente</b>: ele pornesc scripturile.<br><br>Prima misiune: Bip trebuie să se prezinte când apeși ▶ Pornește!',
      steps: [
        { sprite: 'bip', text: 'Trage blocul galben <b>«când apeși Pornește»</b> (la Evenimente) în zona de lucru.', check: p => bipFlag(p).length > 0, snippet: [{ type: 'whenFlag' }] },
        { sprite: 'bip', text: 'Lipește sub el blocul mov <b>«spune … timp de 2 secunde»</b>. Scrie ce vrei să spună Bip!', check: p => !!Q.findIn(bipFlag(p), b => (b.type === 'sayFor' || b.type === 'say') && String(b.args.t || '').trim().length > 0), snippet: [{ type: 'whenFlag' }, { type: 'sayFor', args: { t: 'Hai să prindem stele!', s: 2 } }], place: [{ type: 'sayFor', args: { t: 'Hai să prindem stele!', s: 2 } }] },
        { sprite: 'bip', text: 'Pune-l pe Bip jos, pe deal: adaugă blocul albastru <b>«mergi la x: 0 y: -120»</b> (la Mișcare) și schimbă <b>y</b> în <b>-120</b>.', tip: 'x spune cât de la stânga sau la dreapta e personajul, iar y cât de sus sau de jos. 0 e la mijloc; numerele cu minus (-) sunt mai jos. ⬇', check: p => !!Q.findIn(bipFlag(p), b => b.type === 'gotoXY' && num(b.args.y) <= -60), snippet: [{ type: 'whenFlag' }, { type: 'gotoXY', args: { x: 0, y: -120 } }, { type: 'sayFor', args: { t: 'Hai să prindem stele!', s: 2 } }], place: [{ type: 'gotoXY', args: { x: 0, y: -120 } }] },
        { text: 'Apasă butonul verde <b>▶ Pornește</b> de deasupra scenei și privește ce face Bip!', runtime: ev => ev.flag > 0 }
      ]
    },
    {
      id: 'w5-2', title: 'Telecomanda', concept: 'Evenimente de la tastatură', upTo: 2,
      goal: 'Bip se mișcă la stânga și la dreapta cu săgețile.',
      intro: 'Acum îl facem pe Bip să asculte de tine! 🎮<br><br>Blocul <b>«când apeși …»</b> (cu o tastă) pornește un script de fiecare dată când apeși acea tastă. Blocul <b>«schimbă x cu …»</b> îl mută pe Bip la stânga (numere cu minus) sau la dreapta (numere fără minus).',
      steps: [
        { sprite: 'bip', text: 'Adaugă <b>«când apeși ⬅ stânga»</b> (săgeata stânga de pe tastatură) și sub el <b>«schimbă x cu -20»</b>. Minus înseamnă spre stânga! ⬅', check: p => !!Q.findIn(Q.scripts(Q.sprite(p, 'bip'), 'whenKey', h => h.args.k === 'left'), b => b.type === 'changeX' && num(b.args.n) < 0), snippet: [{ type: 'whenKey', args: { k: 'left' } }, { type: 'changeX', args: { n: -20 } }] },
        { sprite: 'bip', text: 'Fă la fel pentru <b>➡ dreapta</b>, cu <b>«schimbă x cu 20»</b>. ➡', check: p => !!Q.findIn(Q.scripts(Q.sprite(p, 'bip'), 'whenKey', h => h.args.k === 'right'), b => b.type === 'changeX' && num(b.args.n) > 0), snippet: [{ type: 'whenKey', args: { k: 'right' } }, { type: 'changeX', args: { n: 20 } }] },
        { text: 'Încearcă! Apasă săgețile de pe tastatură (sau butoanele ⬅ ➡ de sub scenă). Bip se mișcă?', tip: 'Bonus: adaugă «costumul următor» în scripturile săgeților, ca Bip să facă din mâini când merge! 👋', runtime: ev => ev.keyLeft > 0 && ev.keyRight > 0 }
      ]
    },
    {
      id: 'w5-3', title: 'Steaua căzătoare', concept: 'Bucla «pentru totdeauna» și «dacă»', upTo: 3,
      goal: 'O stea cade din cer, iar și iar.',
      setup: ensureStar,
      intro: 'A apărut un personaj nou: <b>Steaua</b> ⭐!<br><br>Ca să cadă mereu, folosim bucla <b>«pentru totdeauna»</b> — toate jocurile au o astfel de buclă care nu se oprește niciodată.<br>Iar cu <b>«dacă atinge marginea de jos»</b>, steaua știe când să urce înapoi sus.',
      steps: [
        { text: 'Dă clic pe <b>Steaua</b> ⭐ (sub scenă) ca să-i construiești scripturile.', check: (p, ui) => ui.selected === 'star', attn: 'star' },
        { sprite: 'star', text: 'Pentru Stea: <b>«când apeși Pornește»</b>, apoi <b>«mergi la o poziție aleatoare»</b> și <b>«setează y la 150»</b> (sus, într-un loc întâmplător).', check: p => !!Q.findIn(starFlag(p), b => b.type === 'goRandom' || b.type === 'gotoXY') && !!Q.findIn(starFlag(p), isTopReset), snippet: [{ type: 'whenFlag' }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] },
        { sprite: 'star', text: 'Fă steaua să cadă: adaugă la final <b>«pentru totdeauna»</b> și în el <b>«schimbă y cu -5»</b>.', check: p => { const f = starForever(p); return !!(f && Q.find(f.body, b => b.type === 'changeY' && num(b.args.n) < 0)); }, snippet: [{ type: 'whenFlag' }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }, { type: 'forever', body: [{ type: 'changeY', args: { n: -5 } }] }], place: [{ type: 'forever', body: [{ type: 'changeY', args: { n: -5 } }] }] },
        { sprite: 'star', text: 'Când ajunge jos, steaua trebuie să urce iar: în bucla «pentru totdeauna» pune <b>«dacă atinge marginea de jos atunci»</b> cu <b>«mergi la o poziție aleatoare»</b> și <b>«setează y la 150»</b> înăuntru.', tip: 'Alege „atinge” și apoi „marginea de jos” din listele blocului «dacă».', check: p => { const f = starForever(p); return !!(f && Q.find(f.body, b => isIf(b) && (condIs(b, 'touch', 'edgeB') || condIs(b, 'touch', 'edge')) && Q.find(b.body, isTopReset))); }, snippet: [{ type: 'if', args: { cond: { k: 'touch', t: 'edgeB' } }, body: [{ type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] }] },
        { text: 'Apasă <b>▶ Pornește</b> și privește ploaia de stele! 🌠', runtime: ev => ev.flag > 0 }
      ]
    },
    {
      id: 'w5-4', title: 'Prinde steaua!', concept: 'Variabile — scorul', upTo: 4,
      goal: 'Când Bip prinde steaua, câștigi un punct.',
      intro: 'O <b>variabilă</b> e ca o cutiuță cu o etichetă, în care calculatorul ține minte un număr. 📦<br><br>Cutiuța noastră se numește <b>scor</b>. De fiecare dată când Bip prinde steaua, punem încă un punct în ea: <b>«schimbă scor cu 1»</b>.',
      steps: [
        { sprite: 'star', text: 'La <b>Stea</b>: în bucla «pentru totdeauna», adaugă un nou <b>«dacă atinge Bip atunci»</b>.', check: p => !!catchIf(p), snippet: [{ type: 'if', args: { cond: { k: 'touch', t: '#bip' } } }] },
        { sprite: 'star', text: 'În interiorul lui, pune <b>«schimbă scor cu 1»</b> (la Variabile).', check: p => { const c = catchIf(p); return !!(c && Q.find(c.body, b => b.type === 'changeVar' && b.args.v === 'scor' && num(b.args.n) > 0)); }, snippet: [{ type: 'if', args: { cond: { k: 'touch', t: '#bip' } }, body: [{ type: 'changeVar', args: { v: 'scor', n: 1 } }] }], place: [{ type: 'changeVar', args: { v: 'scor', n: 1 } }] },
        { sprite: 'star', text: 'Tot acolo: <b>«cântă sunetul monedă»</b> 🪙, apoi trimite steaua sus cu <b>«mergi la o poziție aleatoare»</b> și <b>«setează y la 150»</b>.', check: p => { const c = catchIf(p); return !!(c && Q.find(c.body, b => b.type === 'playSound') && Q.find(c.body, isTopReset)); }, snippet: [{ type: 'if', args: { cond: { k: 'touch', t: '#bip' } }, body: [{ type: 'changeVar', args: { v: 'scor', n: 1 } }, { type: 'playSound', args: { s: 'coin' } }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] }], place: [{ type: 'playSound', args: { s: 'coin' } }, { type: 'goRandom' }, { type: 'setY', args: { n: 150 } }] },
        { sprite: 'star', text: 'La început, scorul trebuie să fie 0: pune <b>«setează scor la 0»</b> sub <b>«când apeși Pornește»</b> al stelei.', check: p => !!Q.findIn(Q.allScripts(p).filter(sc => sc.blocks[0].type === 'whenFlag'), b => b.type === 'setVar' && b.args.v === 'scor' && num(b.args.n) === 0), snippet: [{ type: 'whenFlag' }, { type: 'setVar', args: { v: 'scor', n: 0 } }], place: [{ type: 'setVar', args: { v: 'scor', n: 0 } }] },
        { text: 'Joacă-te! Apasă <b>▶ Pornește</b> și prinde <b>3 stele</b> cu Bip. 🎮', runtime: ev => ev.maxScore >= 3 }
      ]
    },
    {
      id: 'w5-5', title: 'Câștigă jocul!', concept: 'Condiții cu variabile', upTo: 5,
      goal: 'Jocul se termină cu victorie la 10 puncte.',
      intro: 'Ultima misiune! 🏆 Un joc adevărat are un <b>final</b>. Bip va verifica <b>pentru totdeauna</b>: <i>dacă scorul a ajuns la 10</i>, anunță victoria și oprește jocul.<br><br>Apoi îl faci mai provocator — ca un adevărat creator de jocuri!',
      steps: [
        { sprite: 'bip', text: 'La <b>Bip</b>: în scriptul «când apeși Pornește», adaugă la final <b>«pentru totdeauna»</b> cu un <b>«dacă»</b> în el. Alege condiția <b>variabila scor ≥ 10</b>.', check: p => !!winIf(p), snippet: [{ type: 'forever', body: [{ type: 'if', args: { cond: { k: 'varCmp', v: 'scor', op: '>=', n: 10 } } }] }] },
        { sprite: 'bip', text: 'În interior: <b>«spune Am câștigat!»</b>, <b>«cântă sunetul victorie»</b> și <b>«oprește tot»</b>. 🏆', check: p => { const w = winIf(p); return !!(w && Q.find(w.body, b => b.type === 'say' || b.type === 'sayFor') && Q.find(w.body, b => b.type === 'stopAll')); }, snippet: [SOL.win()], place: [{ type: 'say', args: { t: 'Am câștigat! 🏆' } }, { type: 'playSound', args: { s: 'victory' } }, { type: 'stopAll' }] },
        { sprite: 'star', text: 'Fă jocul mai provocator: la <b>Stea</b>, schimbă <b>«schimbă y cu -5»</b> în <b>-8</b>. Steaua va cădea mai repede! ⚡', check: p => { const f = starForever(p); return !!(f && Q.find(f.body, b => b.type === 'changeY' && num(b.args.n) <= -7)); }, snippet: [{ type: 'changeY', args: { n: -8 } }] },
        { text: 'Joacă jocul până la capăt și câștigă: prinde <b>10 stele</b>! 🌟', runtime: ev => ev.won > 0 }
      ]
    }
  ];

  const ATELIER = {
    id: 'w5', num: 5, type: 'studio', icon: '🎮',
    title: 'Atelierul de jocuri', concept: 'Evenimente, coordonate, variabile — construiești aplicația ta!',
    bg: 'linear-gradient(135deg, #FFE7C2 0%, #FFB8D2 55%, #C9B6FF 100%)', ink: '#4A1F3A',
    badge: { icon: '🎮', name: 'Creator de jocuri' },
    levels: MISSIONS
  };
  MISSIONS.forEach((m, i) => { m.world = 'w5'; m.type = 'studio'; m.index = i; });

  /* Blocurile din paleta Atelierului; m = misiunea de la care apar */
  const STUDIO_PALETTE = [
    { cat: 'events', title: 'Evenimente', items: [{ type: 'whenFlag', m: 1 }, { type: 'whenKey', args: { k: 'left' }, m: 2 }, { type: 'whenKey', args: { k: 'right' }, m: 2 }, { type: 'whenClick', m: 2 }] },
    { cat: 'motion', title: 'Mișcare', items: [{ type: 'gotoXY', m: 1 }, { type: 'moveSteps', m: 1 }, { type: 'turnCW', m: 1 }, { type: 'turnCCW', m: 1 }, { type: 'changeX', m: 2 }, { type: 'setX', m: 2 }, { type: 'changeY', m: 2 }, { type: 'setY', m: 2 }, { type: 'goRandom', m: 3 }, { type: 'glideXY', m: 3 }, { type: 'pointDir', m: 3 }, { type: 'bounce', m: 3 }] },
    { cat: 'looks', title: 'Aspect', items: [{ type: 'sayFor', m: 1 }, { type: 'say', m: 1 }, { type: 'nextCostume', m: 2 }, { type: 'changeSize', m: 1 }, { type: 'setSize', m: 1 }, { type: 'hide', m: 3 }, { type: 'show', m: 3 }, { type: 'setBackdrop', m: 3 }] },
    { cat: 'sound', title: 'Sunet', items: [{ type: 'playSound', m: 1 }, { type: 'playNote', m: 2 }] },
    { cat: 'control', title: 'Control', items: [{ type: 'wait', m: 1 }, { type: 'repeat', args: { n: 10 }, m: 2 }, { type: 'forever', m: 3 }, { type: 'if', args: { cond: { k: 'touch', t: 'edgeB' } }, m: 3 }, { type: 'ifElse', args: { cond: { k: 'touch', t: 'edge' } }, m: 4 }, { type: 'repeatUntil', args: { cond: { k: 'touch', t: 'edge' } }, m: 5 }, { type: 'stopAll', m: 5 }] },
    { cat: 'vars', title: 'Variabile', items: [{ type: 'setVar', m: 4 }, { type: 'changeVar', m: 4 }] }
  ];
  const STUDIO_CONDS = [{ k: 'touch', m: 3 }, { k: 'key', m: 3 }, { k: 'mouse', m: 3 }, { k: 'chance', m: 4 }, { k: 'varCmp', m: 5 }];

  BIP.MISSIONS = MISSIONS;
  BIP.WORLDS.push(ATELIER);
  BIP.STUDIO_PALETTE = STUDIO_PALETTE;
  BIP.STUDIO_CONDS = STUDIO_CONDS;
  BIP.mission = { Q, newGameProject, projectAfter, ensureStar };
})();
