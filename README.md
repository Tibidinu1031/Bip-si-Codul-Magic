# 🤖 Bip și Codul Magic

Joc educativ de programare cu blocuri (în stilul Scratch) pentru copii de **7–11 ani**, în limba română.
Copiii îl ajută pe robotul Bip să treacă prin 5 lumi și, la final, **își construiesc propriul joc**: „Prinde stelele”.

Merge direct în browser, fără instalare, pe calculator sau tabletă. Nu folosește conturi și nu trimite date nicăieri.

## Ce conține

| Lume | Ce învață copiii | Activități |
|---|---|---|
| 👣 1. Primii pași | secvențe, orientare stânga/dreapta | 6 niveluri |
| 🔁 2. Buclele magice | bucla «repetă», bucle în bucle | 6 niveluri |
| 🎨 3. Bip pictorul | desen cu numere, unghiuri (90°, 120°, 144°) | 8 niveluri |
| 🧠 4. Robotul isteț | «dacă / altfel», «repetă până când», algoritmi generali | 5 niveluri |
| 🎮 5. Atelierul de jocuri | evenimente, coordonate x/y, variabile → construiesc jocul „Prinde stelele” | 5 misiuni + „Creează liber” |

Ajutoare pentru copii: indicii pe rând și soluție la final (💡), mesaje care explică greșelile, evidențierea blocului care rulează, stele pentru programe scurte, insigne și o **diplomă** care se poate tipări.

Pentru profesori: butonul **„👩‍🏫 Pentru profesori”** de pe ecranul de start deschide progresul fiecărui copil, ghidul pe lumi, deblocarea nivelurilor și copia de siguranță a datelor.

## Publicare pe GitHub Pages

1. Creează un repository nou pe GitHub (de exemplu `bip-cod-magic`).
2. Încarcă **tot conținutul acestui folder** în rădăcina repository-ului (`index.html` trebuie să fie în rădăcină, lângă folderele `css`, `js` și `assets`).
   - Din browser: **Add file → Upload files**, trage fișierele și folderele, apoi **Commit changes**.
3. Mergi la **Settings → Pages**.
4. La **Source** alege **Deploy from a branch**, apoi branch-ul **main** și folderul **/ (root)** → **Save**.
5. După 1–2 minute jocul va fi disponibil la `https://<numele-tău>.github.io/<nume-repository>/`.

Fișierul `.nojekyll` (deja inclus) spune GitHub Pages să publice fișierele exact așa cum sunt.

## Rulare locală

Dă dublu-clic pe `index.html`: jocul se deschide în browser și funcționează și fără internet (doar fontul se încarcă de pe Google Fonts, iar fără internet se folosește un font de rezervă).

## Unde se salvează progresul

Progresul se salvează în browser (`localStorage`), separat pe fiecare calculator și browser. Dacă se șterg datele browserului, se șterge și progresul. Din zona profesorului, fila **Date**, puteți descărca o copie de siguranță și o puteți încărca pe alt calculator.

## Structura proiectului

```
index.html        pagina principală
css/style.css     aspectul
js/util.js        utilitare: sunete sintetizate, salvare, mascota Bip, ferestre
js/blocks.js      definițiile blocurilor
js/editor.js      editorul de blocuri (drag & drop, lipire, anulare)
js/maze.js        lumea labirint și executorul de programe
js/art.js         lumea de desen
js/studio.js      scena Atelierului (personaje, evenimente, variabile)
js/levels.js      lumile 1–4 și nivelurile
js/missions.js    misiunile din Atelier (jocul „Prinde stelele”)
js/app.js         ecranele, harta, progresul, zona profesorului, diploma
assets/           pictograma
```

## Cum adaugi un nivel nou

Nivelurile sunt în `js/levels.js`. Un nivel de labirint arată așa:

```js
{
  id: 'w1-7', title: 'Nivelul meu', dir: 'E',
  map: ['      ', ' R..B ', '      '],   // R = Bip, B = bateria, . = drum, G = diamant, ~ = apă
  blocks: ['move', 'turnLeft', 'turnRight'],
  text: 'Ce trebuie să facă copilul…',
  hints: ['Primul indiciu', 'Al doilea indiciu'],
  sol: ['F', 'F', 'F']                      // soluția: F = mergi, L = stânga, R = dreapta, C = culege
}
```

Numărul ideal de blocuri (pentru 3 stele) se calculează automat din soluție.
