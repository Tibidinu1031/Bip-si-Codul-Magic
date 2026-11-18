/* =========================================================
   Bip și Codul Magic — definițiile blocurilor
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;
  const { uid } = BIP.util;

  const CATS = {
    events: 'Evenimente',
    motion: 'Mișcare',
    looks: 'Aspect',
    sound: 'Sunet',
    control: 'Control',
    pen: 'Creion',
    action: 'Acțiuni',
    vars: 'Variabile'
  };

  /* ---------- liste de opțiuni ---------- */
  const PEN_COLORS = [
    ['red', 'roșu'], ['orange', 'portocaliu'], ['yellow', 'galben'], ['green', 'verde'],
    ['blue', 'albastru'], ['purple', 'mov'], ['pink', 'roz'], ['black', 'negru'], ['rainbow', 'curcubeu 🌈']
  ];
  const PEN_HEX = {
    red: '#E8414B', orange: '#FF8A1F', yellow: '#F5C400', green: '#20B25A',
    blue: '#3F7FF0', purple: '#8A5CF5', pink: '#F062B0', black: '#1E2A4A'
  };
  const RAINBOW = ['#E8414B', '#FF8A1F', '#F5C400', '#20B25A', '#3F7FF0', '#8A5CF5'];
  const KEYS = [
    ['left', '⬅ stânga'], ['right', '➡ dreapta'], ['up', '⬆ sus'], ['down', '⬇ jos'],
    ['space', 'spațiu'], ['a', 'a'], ['d', 'd'], ['w', 'w'], ['s', 's'], ['any', 'orice tastă']
  ];
  const SOUNDS = [
    ['pop', 'pop'], ['coin', 'monedă'], ['boing', 'boing'], ['laser', 'laser'],
    ['drum', 'tobă'], ['victory', 'victorie'], ['beep', 'bip']
  ];
  const NOTES = [['C4', 'Do'], ['D4', 'Re'], ['E4', 'Mi'], ['F4', 'Fa'], ['G4', 'Sol'], ['A4', 'La'], ['B4', 'Si'], ['C5', 'Do ↑']];
  const NOTE_HZ = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25 };
  const BACKDROPS = [['night', 'noapte'], ['sky', 'cer'], ['space', 'spațiu'], ['forest', 'pădure'], ['ocean', 'ocean'], ['white', 'alb']];
  const VARS = [['scor', 'scor'], ['vieți', 'vieți']];
  const DIRS = [['90', 'dreapta ➡'], ['-90', 'stânga ⬅'], ['0', 'sus ⬆'], ['180', 'jos ⬇']];
  const EDGES = [
    ['edge', 'marginea'], ['edgeB', 'marginea de jos'], ['edgeT', 'marginea de sus'],
    ['edgeL', 'marginea din stânga'], ['edgeR', 'marginea din dreapta'], ['mouse', 'cursorul mouse-ului']
  ];
  const OPS = [['>=', '≥'], ['=', '='], ['<=', '≤'], ['>', '>'], ['<', '<']];

  /* ---------- condiții (folosite în «dacă» și «repetă până când») ---------- */
  const CONDS = {
    // labirint
    pathAhead: { label: 'e drum înainte' },
    pathLeft: { label: 'e drum la stânga' },
    pathRight: { label: 'e drum la dreapta' },
    gemHere: { label: 'e 💎 aici' },
    // atelier
    touch: { label: 'atinge', args: { t: { type: 'drop', def: 'edge', options: ctx => (ctx && ctx.touchTargets ? ctx.touchTargets() : []).concat(EDGES) } } },
    key: { label: 'tasta', args: { key: { type: 'drop', def: 'space', options: KEYS } }, after: 'e apăsată' },
    mouse: { label: 'mouse-ul e apăsat' },
    varCmp: { label: 'variabila', args: { v: { type: 'drop', def: 'scor', options: VARS }, op: { type: 'drop', def: '>=', options: OPS }, n: { type: 'num', def: 10 } } },
    chance: { label: 'noroc: 1 din', args: { n: { type: 'num', def: 3, min: 1, max: 1000, int: true } } }
  };
  function defaultCond(k) {
    const c = CONDS[k] || CONDS.pathAhead;
    const v = { k: CONDS[k] ? k : 'pathAhead' };
    if (c.args) Object.keys(c.args).forEach(a => { v[a] = c.args[a].def; });
    return v;
  }

  /* ---------- blocurile ---------- */
  const DEFS = {
    /* --- labirint --- */
    start: { cat: 'events', shape: 'hat', icon: '▶', label: 'când apeși Pornește', fixed: true },
    move: { cat: 'motion', icon: '⬆', label: 'mergi înainte' },
    turnLeft: { cat: 'motion', icon: '↺', label: 'întoarce-te la stânga' },
    turnRight: { cat: 'motion', icon: '↻', label: 'întoarce-te la dreapta' },
    collect: { cat: 'action', icon: '💎', label: 'culege diamantul' },
    untilGoal: { cat: 'control', shape: 'c', icon: '🔁', label: 'repetă până ajungi la 🔋' },

    /* --- comune --- */
    repeat: { cat: 'control', shape: 'c', icon: '🔁', label: 'repetă {n} ori', args: { n: { type: 'num', def: 3, min: 0, max: 500, int: true } } },
    if: { cat: 'control', shape: 'c', label: 'dacă {cond} atunci', args: { cond: { type: 'cond', def: 'pathAhead' } } },
    ifElse: { cat: 'control', shape: 'c2', label: 'dacă {cond} atunci', label2: 'altfel', args: { cond: { type: 'cond', def: 'pathAhead' } } },

    /* --- desen --- */
    artMove: { cat: 'pen', icon: '✏️', label: 'mergi înainte {n} pași', args: { n: { type: 'num', def: 100, min: -500, max: 500 } } },
    artRight: { cat: 'pen', icon: '↻', label: 'întoarce-te la dreapta {d}°', args: { d: { type: 'num', def: 90, min: -720, max: 720 } } },
    artLeft: { cat: 'pen', icon: '↺', label: 'întoarce-te la stânga {d}°', args: { d: { type: 'num', def: 90, min: -720, max: 720 } } },
    penColor: { cat: 'pen', icon: '🎨', label: 'culoarea {c}', args: { c: { type: 'drop', def: 'red', options: PEN_COLORS } } },
    penSize: { cat: 'pen', icon: '🖌️', label: 'grosimea {n}', args: { n: { type: 'num', def: 5, min: 1, max: 30 } } },
    penUp: { cat: 'pen', icon: '⤴', label: 'ridică creionul' },
    penDown: { cat: 'pen', icon: '⤵', label: 'coboară creionul' },

    /* --- atelier: evenimente --- */
    whenFlag: { cat: 'events', shape: 'hat', icon: '▶', label: 'când apeși Pornește' },
    whenKey: { cat: 'events', shape: 'hat', icon: '⌨️', label: 'când apeși {k}', args: { k: { type: 'drop', def: 'right', options: KEYS } } },
    whenClick: { cat: 'events', shape: 'hat', icon: '👆', label: 'când dai clic pe mine' },
    /* --- atelier: mișcare --- */
    moveSteps: { cat: 'motion', label: 'mergi {n} pași', args: { n: { type: 'num', def: 10 } } },
    turnCW: { cat: 'motion', label: 'rotește-te ↻ {d} grade', args: { d: { type: 'num', def: 15 } } },
    turnCCW: { cat: 'motion', label: 'rotește-te ↺ {d} grade', args: { d: { type: 'num', def: 15 } } },
    pointDir: { cat: 'motion', label: 'îndreaptă-te spre {d}', args: { d: { type: 'drop', def: '90', options: DIRS } } },
    gotoXY: { cat: 'motion', label: 'mergi la x: {x} y: {y}', args: { x: { type: 'num', def: 0 }, y: { type: 'num', def: 0 } } },
    goRandom: { cat: 'motion', label: 'mergi la o poziție aleatoare' },
    glideXY: { cat: 'motion', label: 'alunecă {s} s la x: {x} y: {y}', args: { s: { type: 'num', def: 1, min: 0, max: 60 }, x: { type: 'num', def: 0 }, y: { type: 'num', def: 0 } } },
    changeX: { cat: 'motion', label: 'schimbă x cu {n}', args: { n: { type: 'num', def: 10 } } },
    setX: { cat: 'motion', label: 'setează x la {n}', args: { n: { type: 'num', def: 0 } } },
    changeY: { cat: 'motion', label: 'schimbă y cu {n}', args: { n: { type: 'num', def: 10 } } },
    setY: { cat: 'motion', label: 'setează y la {n}', args: { n: { type: 'num', def: 0 } } },
    bounce: { cat: 'motion', label: 'ricoșează de la margine' },
    /* --- atelier: aspect --- */
    sayFor: { cat: 'looks', label: 'spune {t} timp de {s} sec.', args: { t: { type: 'text', def: 'Salut!' }, s: { type: 'num', def: 2, min: 0, max: 60 } } },
    say: { cat: 'looks', label: 'spune {t}', args: { t: { type: 'text', def: 'Salut!' } } },
    nextCostume: { cat: 'looks', label: 'costumul următor' },
    changeSize: { cat: 'looks', label: 'schimbă mărimea cu {n}', args: { n: { type: 'num', def: 10 } } },
    setSize: { cat: 'looks', label: 'setează mărimea la {n} %', args: { n: { type: 'num', def: 100, min: 5, max: 500 } } },
    hide: { cat: 'looks', label: 'ascunde-te' },
    show: { cat: 'looks', label: 'arată-te' },
    setBackdrop: { cat: 'looks', label: 'schimbă decorul în {b}', args: { b: { type: 'drop', def: 'sky', options: BACKDROPS } } },
    /* --- atelier: sunet --- */
    playSound: { cat: 'sound', icon: '🔊', label: 'cântă sunetul {s}', args: { s: { type: 'drop', def: 'pop', options: SOUNDS } } },
    playNote: { cat: 'sound', icon: '🎵', label: 'cântă nota {n} {s} sec.', args: { n: { type: 'drop', def: 'C4', options: NOTES }, s: { type: 'num', def: 0.5, min: 0.05, max: 10 } } },
    /* --- atelier: control --- */
    wait: { cat: 'control', icon: '⏳', label: 'așteaptă {s} secunde', args: { s: { type: 'num', def: 1, min: 0, max: 60 } } },
    forever: { cat: 'control', shape: 'cf', icon: '♾️', label: 'pentru totdeauna' },
    repeatUntil: { cat: 'control', shape: 'c', icon: '🔁', label: 'repetă până când {cond}', args: { cond: { type: 'cond', def: 'touch' } } },
    stopAll: { cat: 'control', shape: 'cap', icon: '⏹', label: 'oprește tot' },
    /* --- atelier: variabile --- */
    setVar: { cat: 'vars', label: 'setează {v} la {n}', args: { v: { type: 'drop', def: 'scor', options: VARS }, n: { type: 'num', def: 0 } } },
    changeVar: { cat: 'vars', label: 'schimbă {v} cu {n}', args: { v: { type: 'drop', def: 'scor', options: VARS }, n: { type: 'num', def: 1 } } }
  };

  const isC = def => def.shape === 'c' || def.shape === 'c2' || def.shape === 'cf';
  const isHat = def => def.shape === 'hat';
  const isCap = def => def.shape === 'cap' || def.shape === 'cf';

  /* Creează un bloc nou cu valorile implicite (+ argumente date) */
  function mk(type, args, body, body2) {
    const def = DEFS[type];
    if (!def) throw new Error('Bloc necunoscut: ' + type);
    const b = { id: uid(), type: type, args: {} };
    if (def.args) {
      Object.keys(def.args).forEach(k => {
        const spec = def.args[k];
        b.args[k] = spec.type === 'cond' ? defaultCond(spec.def) : spec.def;
      });
    }
    if (args) {
      Object.keys(args).forEach(k => {
        const v = args[k];
        b.args[k] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
      });
    }
    if (isC(def)) b.body = body || [];
    if (def.shape === 'c2') b.body2 = body2 || [];
    return b;
  }

  /* Notație scurtă pentru soluții și exemple:
     'F' mergi, 'L' stânga, 'R' dreapta, 'C' culege,
     ['rep', n, [...]], ['until', [...]], ['if', cond, [...]], ['ife', cond, [...], [...]],
     ['mv', n], ['rt', d], ['lt', d], ['col', c], ['size', n], 'up', 'down', ['start'] */
  function build(list) {
    return (list || []).map(it => {
      if (typeof it === 'string') {
        switch (it) {
          case 'F': return mk('move');
          case 'L': return mk('turnLeft');
          case 'R': return mk('turnRight');
          case 'C': return mk('collect');
          case 'up': return mk('penUp');
          case 'down': return mk('penDown');
          default: return mk(it);
        }
      }
      if (it && it.type) return mk(it.type, it.args, it.body ? build(it.body) : undefined, it.body2 ? build(it.body2) : undefined);
      const t = it[0];
      switch (t) {
        case 'start': return mk('start');
        case 'rep': return mk('repeat', { n: it[1] }, build(it[2]));
        case 'until': return mk('untilGoal', null, build(it[1]));
        case 'if': return mk('if', { cond: typeof it[1] === 'string' ? { k: it[1] } : it[1] }, build(it[2]));
        case 'ife': return mk('ifElse', { cond: typeof it[1] === 'string' ? { k: it[1] } : it[1] }, build(it[2]), build(it[3]));
        case 'mv': return mk('artMove', { n: it[1] });
        case 'rt': return mk('artRight', { d: it[1] });
        case 'lt': return mk('artLeft', { d: it[1] });
        case 'col': return mk('penColor', { c: it[1] });
        case 'size': return mk('penSize', { n: it[1] });
        default: return mk(t, it[1], it[2] ? build(it[2]) : undefined, it[3] ? build(it[3]) : undefined);
      }
    });
  }

  /* Numără blocurile (fără căciulile de eveniment) */
  function countBlocks(list) {
    let n = 0;
    (list || []).forEach(b => {
      const def = DEFS[b.type];
      if (!def) return;
      if (!isHat(def)) n++;
      if (b.body) n += countBlocks(b.body);
      if (b.body2) n += countBlocks(b.body2);
    });
    return n;
  }
  function assignIds(list) {
    (list || []).forEach(b => {
      b.id = uid();
      if (!b.args) b.args = {};
      if (b.body) assignIds(b.body);
      if (b.body2) assignIds(b.body2);
    });
    return list;
  }
  function ensureIds(list) {
    (list || []).forEach(b => {
      if (!b.id) b.id = uid();
      if (!b.args) b.args = {};
      const def = DEFS[b.type];
      if (def && isC(def) && !b.body) b.body = [];
      if (def && def.shape === 'c2' && !b.body2) b.body2 = [];
      if (b.body) ensureIds(b.body);
      if (b.body2) ensureIds(b.body2);
    });
    return list;
  }
  /* Elimină blocurile necunoscute (de ex. din fișiere vechi) */
  function sanitize(list) {
    return (list || []).filter(b => b && DEFS[b.type]).map(b => {
      if (b.body) b.body = sanitize(b.body);
      if (b.body2) b.body2 = sanitize(b.body2);
      return b;
    });
  }

  BIP.CATS = CATS;
  BIP.DEFS = DEFS;
  BIP.CONDS = CONDS;
  BIP.OPT = { PEN_COLORS, PEN_HEX, RAINBOW, KEYS, SOUNDS, NOTES, NOTE_HZ, BACKDROPS, VARS, DIRS, EDGES, OPS };
  BIP.blocks = { isC, isHat, isCap, mk, build, countBlocks, assignIds, ensureIds, sanitize, defaultCond };
})();
