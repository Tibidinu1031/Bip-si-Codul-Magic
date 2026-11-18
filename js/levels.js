/* =========================================================
   Bip și Codul Magic — lumile și nivelurile
   Hartă: '.' drum, 'R' Bip (start), 'B' baterie (țintă), 'G' diamant,
          ' ' teren fără drum, '~' apă, '#' obstacol
   Soluțiile folosesc notația scurtă din blocks.js (BIP.blocks.build)
   ========================================================= */
(function () {
  'use strict';
  const BIP = window.BIP;

  const WORLDS = [
    /* ---------------- LUMEA 1 ---------------- */
    {
      id: 'w1', num: 1, type: 'maze', theme: 'forest', icon: '👣',
      title: 'Primii pași', concept: 'Secvențe — pași făcuți în ordine',
      bg: 'linear-gradient(135deg, #DDF7CF 0%, #A6DF86 100%)', ink: '#1E4D22',
      badge: { icon: '👣', name: 'Pași mici' },
      intro: {
        title: 'Ce este un program? 🤔',
        text: 'Un <b>program</b> este o listă de pași pe care un calculator (sau un robot!) îi face <b>pe rând, de sus în jos</b>. E ca o rețetă: întâi spargi ouăle, apoi le amesteci. 🍳<br><br>Bip nu știe singur ce să facă — <b>tu</b> îi spui, cu blocuri! Lipește blocurile sub <b>«când apeși Pornește»</b>, apoi apasă butonul verde <b>▶ Pornește</b>.',
        example: [['start'], 'F', 'F', 'L', 'F'],
        caption: 'Bip merge de 2 ori înainte, se întoarce la stânga și mai merge o dată.'
      },
      levels: [
        {
          id: 'w1-1', title: 'Primul pas', dir: 'E',
          map: ['      ', '      ', ' R..B ', '      ', '      '],
          blocks: ['move'],
          text: 'Bip a rămas fără energie! 🔋 Ajută-l să ajungă la baterie. Trage blocul <b>«mergi înainte»</b> și lipește-l sub <b>«când apeși Pornește»</b>. De câte ori trebuie să meargă?',
          hints: ['Numără pătrățelele de drum dintre Bip și baterie. Sunt 3!', 'Pune 3 blocuri «mergi înainte», unul sub altul. Poți și să dai clic pe un bloc din stânga ca să-l adaugi.', 'La final apasă butonul verde ▶ Pornește.'],
          sol: ['F', 'F', 'F']
        },
        {
          id: 'w1-2', title: 'Colțul', dir: 'E',
          map: ['      ', '    B ', '    . ', ' R... ', '      '],
          blocks: ['move', 'turnLeft', 'turnRight'],
          text: 'Drumul face un colț! Când Bip ajunge la colț, trebuie să se <b>întoarcă</b>. Atenție: stânga și dreapta sunt ale lui Bip! Săgeata galbenă arată încotro se uită.',
          hints: ['Mergi înainte până la colț: sunt 3 pași.', 'La colț, Bip trebuie să se uite spre baterie. Imaginează-ți că ești Bip: bateria e în partea stângă a ta!', 'Soluția: 3 × «mergi înainte», «întoarce-te la stânga», 2 × «mergi înainte».'],
          sol: ['F', 'F', 'F', 'L', 'F', 'F']
        },
        {
          id: 'w1-3', title: 'Spre dreapta', dir: 'E',
          map: ['      ', ' R..  ', '   .  ', '   .  ', '   B  ', '      '],
          blocks: ['move', 'turnLeft', 'turnRight'],
          text: 'Acum drumul o ia în jos. Imaginează-ți că tu ești Bip: unde e mâna ta <b>dreaptă</b>? ✋',
          hints: ['Bip se uită spre dreapta ecranului. Dacă se întoarce la dreapta lui, se va uita în jos.', 'Fă 2 pași, întoarce-te la dreapta, apoi încă 3 pași.'],
          sol: ['F', 'F', 'R', 'F', 'F', 'F']
        },
        {
          id: 'w1-4', title: 'Scărița', dir: 'E',
          map: ['      ', ' R.   ', '  ..  ', '   .B ', '      '],
          blocks: ['move', 'turnLeft', 'turnRight'],
          text: 'Un drum în trepte! Bip trebuie să se întoarcă de mai multe ori: când la dreapta, când la stânga.',
          hints: ['Mergi pas cu pas: după fiecare pas uită-te încotro o ia drumul.', 'Începutul: «mergi», «dreapta», «mergi», «stânga»… apoi bucata asta se repetă!', 'Soluția are 9 blocuri: mergi, dreapta, mergi, stânga, mergi, dreapta, mergi, stânga, mergi.'],
          sol: ['F', 'R', 'F', 'L', 'F', 'R', 'F', 'L', 'F']
        },
        {
          id: 'w1-5', title: 'Diamantul', dir: 'E',
          map: ['      ', ' R.G. ', '    . ', '    B ', '      '],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect'],
          text: 'Pe drum e un diamant! 💎 Când Bip stă pe diamant, folosește blocul nou <b>«culege diamantul»</b>. Abia apoi poate merge la baterie.',
          hints: ['Bip ajunge pe diamant după 2 pași.', 'După ce culege, mai face un pas, se întoarce la dreapta și merge 2 pași.'],
          sol: ['F', 'F', 'C', 'F', 'R', 'F', 'F']
        },
        {
          id: 'w1-6', title: 'Plimbarea lungă', dir: 'E',
          map: ['       ', ' R..G. ', '     . ', ' BG... ', '       '],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect'],
          text: 'Un drum lung, cu două diamante. Ai nevoie de multe blocuri… Fii atent la ordine! (În lumea următoare vei învăța un truc magic ca să folosești mai puține.)',
          hints: ['Împarte drumul în bucăți: până la primul diamant, apoi până la colț…', 'Bip se întoarce de 2 ori și de fiecare dată la dreapta.', 'Soluția: 3 pași, culege, 1 pas, dreapta, 2 pași, dreapta, 3 pași, culege, 1 pas.'],
          sol: ['F', 'F', 'F', 'C', 'F', 'R', 'F', 'F', 'R', 'F', 'F', 'F', 'C', 'F']
        }
      ]
    },

    /* ---------------- LUMEA 2 ---------------- */
    {
      id: 'w2', num: 2, type: 'maze', theme: 'desert', icon: '🔁',
      title: 'Buclele magice', concept: 'Bucle — «repetă de N ori»',
      bg: 'linear-gradient(135deg, #FFF0C9 0%, #F6CF83 100%)', ink: '#5A3A00',
      badge: { icon: '🔁', name: 'Maestrul buclelor' },
      intro: {
        title: 'Bucla: repetă! 🔁',
        text: 'Când vrei ca Bip să facă <b>același lucru de mai multe ori</b>, nu trebuie să pui același bloc iar și iar. Folosește blocul <b>«repetă»</b>: pui blocurile <i>înăuntrul</i> lui și scrii de câte ori să se repete.<br><br>E ca atunci când te speli pe dinți: nu spui „freacă, freacă, freacă…”, spui „freacă de 20 de ori”. 😁',
        compare: [['F', 'F', 'F', 'F'], [['rep', 4, ['F']]]],
        caption: 'Amândouă programele fac același lucru. Cel din dreapta e mai scurt!'
      },
      levels: [
        {
          id: 'w2-1', title: 'Bucla magică', dir: 'E', maxBlocks: 2,
          map: ['        ', '        ', 'R.....B ', '        ', '        '],
          blocks: ['move', 'turnLeft', 'turnRight', 'repeat'],
          text: 'Ai voie să folosești doar <b>2 blocuri</b>! 😮 Pune blocul <b>«mergi înainte»</b> <i>înăuntrul</i> blocului <b>«repetă»</b> și scrie de câte ori.',
          hints: ['Trage «repetă» sub «când apeși Pornește». Apoi trage «mergi înainte» în „gura” lui (spațiul din interior).', 'Numără pașii: sunt 6. Dă clic pe numărul din «repetă» și scrie 6.'],
          sol: [['rep', 6, ['F']]]
        },
        {
          id: 'w2-2', title: 'Șirul de diamante', dir: 'E', maxBlocks: 4,
          map: ['        ', '        ', ' RGGGGB ', '        ', '        '],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect', 'repeat'],
          text: 'Patru diamante la rând! Ce se repetă? Un pas și o culegere… Ai doar <b>4 blocuri</b>.',
          hints: ['În buclă pune două blocuri: «mergi înainte» și «culege diamantul».', 'Bucla se repetă de 4 ori. După buclă mai trebuie un pas până la baterie.'],
          sol: [['rep', 4, ['F', 'C']], 'F']
        },
        {
          id: 'w2-3', title: 'Scara uriașă', dir: 'E', maxBlocks: 5,
          map: ['        ', '      B ', '     .. ', '    ..  ', '   ..   ', '  ..    ', ' R.     ', '        '],
          blocks: ['move', 'turnLeft', 'turnRight', 'repeat'],
          text: 'O scară până sus! Găsește bucata care se repetă: un pas înainte, o întoarcere, un pas în sus, o întoarcere…',
          hints: ['Bucata care se repetă are 4 blocuri: mergi, stânga, mergi, dreapta.', 'Pune cele 4 blocuri într-un «repetă» de 5 ori. Bip se oprește singur când ajunge la baterie.'],
          sol: [['rep', 5, ['F', 'L', 'F', 'R']]]
        },
        {
          id: 'w2-4', title: 'Ocolul oazei', dir: 'E', maxBlocks: 7,
          map: ['       ', ' R..G  ', '  ~~.  ', ' B~~.  ', ' G..G  ', '       '],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect', 'repeat'],
          text: 'Bip face turul oazei 🌴 și culege diamantele din colțuri. Bucata care se repetă e mai lungă — o găsești?',
          hints: ['Pe fiecare latură: 3 pași, culege, întoarce-te la dreapta.', 'Repetă bucata asta de 3 ori, apoi încă un pas până la baterie.'],
          sol: [['rep', 3, ['F', 'F', 'F', 'C', 'R']], 'F']
        },
        {
          id: 'w2-5', title: 'Zig-zag cu buclă', dir: 'E', maxBlocks: 5,
          map: ['        ', ' R.     ', '  ..    ', '   ..   ', '    ..  ', '     .B ', '        '],
          blocks: ['move', 'turnLeft', 'turnRight', 'repeat'],
          text: 'Îți amintești scărița din prima lume? Acum e mult mai lungă. Cu o buclă e floare la ureche! 🌸',
          hints: ['Bucata care se repetă: mergi, dreapta, mergi, stânga.', 'Încearcă «repetă 5 ori». Bip se oprește singur când ajunge la baterie.'],
          sol: [['rep', 5, ['F', 'R', 'F', 'L']]]
        },
        {
          id: 'w2-6', title: 'Bucla în buclă', dir: 'E', maxBlocks: 6,
          map: ['       ', ' RGGG  ', '  ~~G  ', ' B~~G  ', ' GGGG  ', '       '],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect', 'repeat'],
          text: 'Nouă diamante! 😲 Ai doar <b>6 blocuri</b>. Secretul: o buclă <b>în interiorul</b> altei bucle!',
          hints: ['Pe fiecare latură: 3 × (mergi, culege). Asta e o buclă mică: «repetă 3 ori: mergi, culege».', 'După bucla mică, Bip se întoarce la dreapta. Toată bucata asta se repetă de 3 ori — e bucla mare!', 'La final: un pas până la baterie.'],
          sol: [['rep', 3, [['rep', 3, ['F', 'C']], 'R']], 'F']
        }
      ]
    },

    /* ---------------- LUMEA 3 ---------------- */
    {
      id: 'w3', num: 3, type: 'art', theme: 'paper', icon: '🎨',
      title: 'Bip pictorul', concept: 'Desen cu numere, unghiuri și bucle',
      bg: 'linear-gradient(135deg, #FFE3F1 0%, #D9C8FF 100%)', ink: '#4A2470',
      badge: { icon: '🎨', name: 'Artistul codului' },
      intro: {
        title: 'Bip are un creion! ✏️',
        text: 'Când Bip merge, lasă o linie în urmă. Numărul din bloc spune <b>câți pași</b> face (un pătrățel de pe hârtie are 25 de pași).<br><br>Când se întoarce, numărul spune <b>cât de mult</b> se întoarce, în <b>grade</b>: colțul unui pătrat are <b>90°</b>, iar o învârtire completă are <b>360°</b>. 🔄<br><br>Desenează peste <b>modelul gri</b>!',
        example: [['start'], ['mv', 100], ['rt', 90], ['mv', 100]],
        caption: 'Bip desenează o linie, se întoarce un colț de pătrat (90°) și mai desenează o linie.'
      },
      levels: [
        {
          id: 'w3-1', title: 'Linia lungă', start: { x: 0, y: -75, h: 0 },
          blocks: ['artMove'],
          text: 'Desenează peste linia gri! Linia are <b>150</b> de pași. Dă clic pe numărul din bloc ca să-l schimbi.',
          hints: ['Un pătrățel are 25 de pași. Linia are 6 pătrățele: 6 × 25 = 150.', 'Pune un bloc «mergi înainte» și schimbă 100 în 150.'],
          sol: [['mv', 150]]
        },
        {
          id: 'w3-2', title: 'Colțul', start: { x: -50, y: -50, h: 0 },
          blocks: ['artMove', 'artRight', 'artLeft'],
          text: 'Un colț! Bip merge în sus, se întoarce la dreapta <b>90°</b> și merge iar.',
          hints: ['Fiecare linie are 100 de pași (4 pătrățele).', 'mergi 100, întoarce-te la dreapta 90°, mergi 100.'],
          sol: [['mv', 100], ['rt', 90], ['mv', 100]]
        },
        {
          id: 'w3-3', title: 'Pătratul', start: { x: -50, y: -50, h: 0 }, maxBlocks: 3,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat'],
          text: 'Un pătrat are 4 laturi la fel și 4 colțuri la fel. Ai doar <b>3 blocuri</b> — folosește o buclă!',
          hints: ['O latură și un colț: «mergi 100», «întoarce-te la dreapta 90°».', 'Pune-le într-un «repetă 4 ori».'],
          sol: [['rep', 4, [['mv', 100], ['rt', 90]]]]
        },
        {
          id: 'w3-4', title: 'Scara', start: { x: -100, y: -100, h: 0 }, maxBlocks: 5,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat'],
          text: 'O scară care urcă! Fiecare treaptă: o linie în sus și una la dreapta. Atenție la întoarceri!',
          hints: ['O treaptă: mergi 50, dreapta 90°, mergi 50, stânga 90°.', 'Sunt 4 trepte → repetă de 4 ori.'],
          sol: [['rep', 4, [['mv', 50], ['rt', 90], ['mv', 50], ['lt', 90]]]]
        },
        {
          id: 'w3-5', title: 'Triunghiul', start: { x: -75, y: -65, h: 90 }, maxBlocks: 3,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat'],
          text: 'Un triunghi are 3 colțuri. Ca să ajungă înapoi de unde a plecat, Bip se întoarce în total <b>360°</b>. Cât face fiecare întoarcere? 🤔',
          hints: ['360 împărțit la 3 = 120.', 'Fiecare latură are 150 de pași. Triunghiul e deasupra lui Bip, deci se întoarce la stânga.', 'Repetă de 3 ori: mergi 150, întoarce-te la stânga 120°.'],
          sol: [['rep', 3, [['mv', 150], ['lt', 120]]]]
        },
        {
          id: 'w3-6', title: 'Floarea magică', start: { x: 0, y: 0, h: 0 }, maxBlocks: 6,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat', 'penColor'],
          text: 'Un pătrat… întors de 8 ori = o floare! 🌸 Pune bucla pătratului <b>în interiorul</b> altei bucle. Poți alege și o culoare (încearcă <i>curcubeu</i>!).',
          hints: ['Bucla mică desenează un pătrat: repetă 4 ori: mergi 70, dreapta 90°.', 'După fiecare pătrat, întoarce-te la dreapta 45°. Toată bucata asta se repetă de 8 ori.'],
          sol: [['rep', 8, [['rep', 4, [['mv', 70], ['rt', 90]]], ['rt', 45]]]]
        },
        {
          id: 'w3-7', title: 'Steaua', start: { x: -100, y: 20, h: 90 }, maxBlocks: 4,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat', 'penColor'],
          text: 'O stea strălucitoare! ⭐ Bip merge <b>200</b> de pași și se întoarce <b>144°</b> — și face asta de 5 ori.',
          hints: ['Folosește «repetă 5 ori».', 'În buclă: mergi 200, întoarce-te la dreapta 144°.'],
          sol: [['rep', 5, [['mv', 200], ['rt', 144]]]]
        },
        {
          id: 'w3-8', title: 'Desen liber', start: { x: 0, y: 0, h: 0 }, free: true, minSegs: 4,
          blocks: ['artMove', 'artRight', 'artLeft', 'repeat', 'penColor', 'penSize', 'penUp', 'penDown'],
          text: 'Acum e rândul tău! 🎨 Desenează orice vrei: o casă, un robot, un model cu bucle… Cu <b>«ridică creionul»</b> Bip merge fără să deseneze. (Minimum 4 linii.)',
          hints: ['Încearcă: repetă 36 ori: mergi 10, dreapta 10°. Ce iese? 🙂', 'Încearcă o buclă în buclă cu culoarea curcubeu!'],
          sol: [['col', 'rainbow'], ['rep', 12, [['rep', 6, [['mv', 60], ['rt', 60]]], ['rt', 30]]]]
        }
      ]
    },

    /* ---------------- LUMEA 4 ---------------- */
    {
      id: 'w4', num: 4, type: 'maze', theme: 'city', icon: '🧠',
      title: 'Robotul isteț', concept: 'Condiții — «dacă» și «repetă până când»',
      bg: 'linear-gradient(135deg, #DCE6F5 0%, #AFC2E2 100%)', ink: '#1F2E52',
      badge: { icon: '🧠', name: 'Mintea isteață' },
      intro: {
        title: 'Bip ia decizii! 🧠',
        text: 'Uneori nu știm dinainte cât de lung e drumul. Dar Bip poate <b>verifica singur</b> ce e în jurul lui:<br>• <b>«repetă până ajungi la 🔋»</b> repetă blocurile până ajunge la baterie, oricât de lung ar fi drumul;<br>• <b>«dacă … atunci»</b> face ceva <i>doar dacă</i> e adevărat. Ca în viață: <i>dacă plouă, iau umbrela</i> ☔, <i>altfel</i> iau șapca 🧢.<br><br>În această lume, același program trebuie să meargă pe <b>mai multe drumuri</b>!',
        example: [['start'], ['until', [['ife', 'pathAhead', ['F'], ['R']]]]],
        caption: 'Până la baterie: dacă e drum înainte, Bip merge; altfel, se întoarce la dreapta.'
      },
      levels: [
        {
          id: 'w4-1', title: 'Oricât de lung', dirs: ['E', 'E', 'E'],
          maps: [
            ['        ', '        ', ' R..B   ', '        ', '        '],
            ['        ', '        ', ' R.....B', '        ', '        '],
            ['        ', '        ', ' R....B ', '        ', '        ']
          ],
          blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'untilGoal'],
          text: 'Drumul are altă lungime de fiecare dată! 😮 Programul tău trebuie să meargă pe <b>toate cele 3 drumuri</b>. Încearcă blocul nou <b>«repetă până ajungi la 🔋»</b>.',
          hints: ['Dacă pui «repetă 3 ori», programul merge doar pe primul drum.', 'Pune «mergi înainte» în interiorul blocului «repetă până ajungi la 🔋».'],
          sol: [['until', ['F']]]
        },
        {
          id: 'w4-2', title: 'Diamante ascunse', dirs: ['E', 'E', 'E'], conds: ['gemHere'],
          maps: [
            ['        ', '        ', ' RG.GG.B', '        ', '        '],
            ['        ', '        ', ' R.G..GB', '        ', '        '],
            ['        ', '        ', ' RGG.G.B', '        ', '        ']
          ],
          blocks: ['move', 'collect', 'untilGoal', 'if'],
          text: 'Diamantele sunt în alte locuri pe fiecare drum! Bip trebuie să verifice la fiecare pas: <b>dacă</b> e un diamant aici, îl culege.',
          hints: ['În bucla «repetă până ajungi la 🔋» pune: un pas, apoi «dacă e 💎 aici atunci culege diamantul».', 'Ordinea contează: întâi «mergi înainte», apoi «dacă e 💎 aici».'],
          sol: [['until', ['F', ['if', 'gemHere', ['C']]]]]
        },
        {
          id: 'w4-3', title: 'Cotituri', dirs: ['E', 'E', 'N'], conds: ['pathAhead', 'pathLeft', 'pathRight'],
          maps: [
            ['       ', ' R...  ', '    .  ', '  B .  ', '  ...  ', '       '],
            ['         ', ' R.....  ', '      .  ', '      .  ', ' B.....  ', '         '],
            ['      ', ' ...  ', ' . .  ', ' R B  ', '      ']
          ],
          blocks: ['move', 'turnLeft', 'turnRight', 'untilGoal', 'ifElse'],
          text: 'Drumul cotește mereu la <b>dreapta</b>, dar diferit de fiecare dată. Bip trebuie să decidă singur: <b>dacă</b> e drum înainte, merge; <b>altfel</b>, se întoarce la dreapta.',
          hints: ['Folosește «dacă … atunci / altfel» în interiorul lui «repetă până ajungi la 🔋».', 'Sus (atunci): «mergi înainte». Jos (altfel): «întoarce-te la dreapta».'],
          sol: [['until', [['ife', 'pathAhead', ['F'], ['R']]]]]
        },
        {
          id: 'w4-4', title: 'Șerpișorul', dirs: ['E', 'N'], conds: ['pathAhead', 'pathLeft', 'pathRight'],
          maps: [
            ['        ', ' R..    ', '   .    ', '   ...  ', '     .  ', '   B..  ', '        '],
            ['        ', '    B   ', '    .   ', '  ...   ', '  .     ', '  R     ', '        ']
          ],
          blocks: ['move', 'turnLeft', 'turnRight', 'untilGoal', 'if', 'ifElse'],
          text: 'Drumul șerpuiește când la stânga, când la dreapta! Bip trebuie să ia două decizii: e drum înainte? Dacă nu, e drum la stânga?',
          hints: ['Poți pune un «dacă / altfel» <b>în interiorul</b> altui «dacă / altfel».', 'Dacă e drum înainte → mergi. Altfel: dacă e drum la stânga → stânga, altfel → dreapta.'],
          sol: [['until', [['ife', 'pathAhead', ['F'], [['ife', 'pathLeft', ['L'], ['R']]]]]]]
        },
        {
          id: 'w4-5', title: 'Marele labirint', dirs: ['E', 'N'], conds: ['pathAhead', 'pathLeft', 'pathRight', 'gemHere'],
          maps: [
            ['        ', ' R.G.   ', '    .   ', '  G..   ', '  .     ', '  ..G.B ', '        '],
            ['       ', ' B..   ', '   G   ', '   ..G ', '     . ', '     R ', '       ']
          ],
          blocks: ['move', 'turnLeft', 'turnRight', 'collect', 'untilGoal', 'if', 'ifElse'],
          text: 'Marea provocare! 🏆 Drumuri lungi, cu diamante ascunse. Combină tot ce ai învățat: bucla «până ajungi», «dacă» pentru diamante și deciziile pentru drum.',
          hints: ['Pornește de la programul de la nivelul trecut (Șerpișorul).', 'Adaugă la începutul buclei: «dacă e 💎 aici atunci culege diamantul».', 'Programul: repetă până la 🔋 { dacă e 💎 aici → culege; dacă e drum înainte → mergi, altfel (dacă e drum la stânga → stânga, altfel → dreapta) }.'],
          sol: [['until', [['if', 'gemHere', ['C']], ['ife', 'pathAhead', ['F'], [['ife', 'pathLeft', ['L'], ['R']]]]]]]
        }
      ]
    }
  ];

  /* Calculează automat numărul ideal de blocuri din soluție */
  WORLDS.forEach(w => w.levels.forEach((l, i) => {
    l.world = w.id;
    l.type = w.type;
    l.theme = l.theme || w.theme;
    l.index = i;
    if (l.optimal === undefined && l.sol) l.optimal = BIP.blocks.countBlocks(BIP.blocks.build(l.sol));
  }));

  const FACTS = [
    '<b>Ada Lovelace</b> a scris primul program din lume, acum aproape 200 de ani (în 1843), pentru o mașină de calcul care nici nu fusese construită!',
    'O greșeală dintr-un program se numește <b>„bug”</b> (gândac). În 1947, într-un calculator a fost găsită chiar o molie adevărată care îl încurca! 🦋',
    'Roboții de pe <b>Marte</b> primesc comenzi de la oamenii de pe Pământ și le fac pas cu pas — exact ca Bip! 🚀',
    'Primul calculator din România, <b>CIFA-1</b>, a fost construit în 1957 de o echipă condusă de inginerul Victor Toma. 🇷🇴',
    'Un calculator obișnuit poate face <b>miliarde</b> de operații într-o singură secundă! ⚡',
    'Calculatoarele „vorbesc” doar cu două cifre: <b>0 și 1</b>. Tot ce vezi pe ecran e făcut din ele!',
    'Toate jocurile video au o <b>buclă „pentru totdeauna”</b>: verifică mereu ce butoane apeși și mută personajele.',
    'Blocurile pe care le folosești sunt <b>cod adevărat</b>! Programatorii scriu aceleași idei cu litere, în limbaje ca Python sau JavaScript.',
    'Când un program nu merge, programatorii nu se supără: caută greșeala — asta se numește <b>depanare</b> (debugging). 🔍',
    'Primul joc video, <b>„Tennis for Two”</b>, a fost făcut în 1958 pe un ecran mic și rotund. 🎾'
  ];

  BIP.WORLDS = WORLDS;
  BIP.FACTS = FACTS;
})();
