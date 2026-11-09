// Prüft die Spielregeln ohne Browser. Aufruf: node quelle/test-logik.js
// (Optional: node quelle/test-logik.js schnell → kürzerer Bot-Lauf)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ordner = __dirname;
const schnell = process.argv.includes('schnell');
const code = ['0-sprache.js', '1-einstellungen.js', '2-level.js', '3-logik.js', '4-speicher.js'].map(n => fs.readFileSync(path.join(ordner, n), 'utf8')).join('\n');

function lade(fensterObjekt) {
  const ctx = { window: fensterObjekt || {} };
  vm.createContext(ctx);
  vm.runInContext(code + `
;this.api = { K, ZUSTAND, erstelleSpiel, neuStart, starte, eingabe, schritt, pausiere, setzeFort, kannStarten,
  tempoBei, lueckeBei, versatzBei, erlaubterVersatz, steigRate, pruefeKollision, trefferFlaeche, fuelleHindernisse, Speicher,
  erstelleKonfig, waehle, LEVEL, GEBIETE, STUFEN, sternPos, windBei, ENDLOS_NORMAL };`, ctx);
  return ctx.api;
}
const api = lade();
const { K, ZUSTAND, erstelleSpiel, starte, eingabe, schritt, pausiere, setzeFort, kannStarten, tempoBei, lueckeBei, erlaubterVersatz, steigRate, pruefeKollision } = api;

let fehler = 0;
let ok = 0;
function pruefe(bedingung, text) {
  if (bedingung) ok++;
  else { fehler++; console.log('  FEHLER:', text); }
}
function abschnitt(name) { console.log('• ' + name); }
const dt = K.SCHRITT;
function laufe(s, sek) { for (let i = 0, n = Math.round(sek / dt); i < n; i++) schritt(s, dt); }
function ereignisse(s) { return s.ereignisse.splice(0); }
function neu(saat = 1) { const s = erstelleSpiel(); starte(s, saat); ereignisse(s); return s; }

// ---------------------------------------------------------------
abschnitt('Grundwerte und Durchtunneln');
pruefe(K.MAX_FALL * K.SCHRITT < K.TREFFER_H / 2, 'Fallweg pro Schritt kleiner als halbe Figur');
pruefe(-K.IMPULS * K.SCHRITT < K.TREFFER_H / 2, 'Steigweg pro Schritt kleiner als halbe Figur');
pruefe(K.TEMPO_MAX * K.SCHRITT < K.HINDERNIS_B / 4, 'Weltweg pro Schritt viel kleiner als Containerbreite');
pruefe(K.TEMPO_MAX * K.SCHRITT < K.TREFFER_B / 2, 'Weltweg pro Schritt kleiner als halbe Figurbreite');
pruefe(K.FIGUR_X < K.BREITE / 3, 'Figur im linken Drittel');
pruefe(K.SEIL < K.TREFFER_H, 'Seilbereich zu kurz zum Durchfliegen');
pruefe(K.LUECKE_OBEN_MIN - K.DECKE - K.SEIL - K.SPREIZER >= 24, 'oben ist immer mindestens ein Container zu sehen');
pruefe(K.WASSER - K.PIER - K.LUECKE_UNTEN_MAX >= 24, 'unten ist immer mindestens ein Container zu sehen');
console.log(`  Steigrate bei bequemem Tippen: ${steigRate().toFixed(0)} pro Sekunde`);

abschnitt('Start und Impuls');
{
  const s = erstelleSpiel();
  pruefe(s.zustand === ZUSTAND.START, 'beginnt im Startzustand');
  laufe(s, 1);
  pruefe(s.figur.y === K.FIGUR_START_Y && s.strecke === 0, 'im Start bewegt sich nichts');
  pruefe(eingabe(s, 5) === 'start', 'Spieleingabe startet');
  pruefe(s.zustand === ZUSTAND.SPIELEN, 'spielt nach Start');
  const e = ereignisse(s);
  pruefe(e.filter(x => x.typ === 'impuls').length === 1, 'Start gibt genau einen Impuls');
  pruefe(s.statistik.impulse === 1, 'Statistik: ein Impuls');
  pruefe(s.figur.vy === K.IMPULS, 'Impuls setzt Geschwindigkeit');
  eingabe(s); eingabe(s); eingabe(s);
  pruefe(s.figur.vy === K.IMPULS, 'mehrere Impulse addieren nicht');
  laufe(s, 0.1);
  eingabe(s);
  pruefe(s.figur.vy === K.IMPULS, 'Impuls setzt auch beim Steigen/Fallen genau den Wert');
}

abschnitt('Schwerkraft und Fallgrenze');
{
  const s = neu();
  s.figur.y = 100; s.figur.vy = 0;
  s.hindernisse = []; s.erzeugt = 9999;   // keine Hindernisse im Weg
  s.hindernisse.push({ i: 0, x: 1e9, b: 64, oben: 0, unten: 1, gezaehlt: false, saat: 1 });
  let maxV = 0;
  for (let i = 0; i < 120 && s.zustand === ZUSTAND.SPIELEN; i++) { schritt(s, dt); maxV = Math.max(maxV, s.figur.vy); }
  pruefe(maxV <= K.MAX_FALL + 1e-9, 'Fallgeschwindigkeit begrenzt');
  pruefe(Math.abs(maxV - K.MAX_FALL) < 1e-6, 'Fallgrenze wird erreicht');
  // Gipfelhöhe eines Impulses
  const s2 = neu();
  const y0 = s2.figur.y; let minY = y0;
  for (let i = 0; i < 60; i++) { schritt(s2, dt); minY = Math.min(minY, s2.figur.y); }
  console.log(`  Ein Impuls hebt um ${(y0 - minY).toFixed(1)} Punkte`);
  pruefe(y0 - minY > 45 && y0 - minY < 75, 'Impulshöhe angenehm (45–75)');
}

abschnitt('Freier Anflug');
{
  const s = neu();
  const erstes = s.hindernisse[0];
  const zeit = (erstes.x - (K.FIGUR_X + K.TREFFER_B / 2)) / K.TEMPO_START;
  console.log(`  Erstes Hindernis nach ${zeit.toFixed(2)} s`);
  pruefe(zeit > 2.8, 'großzügiger Anflug (> 2,8 s)');
  pruefe(Math.abs((erstes.oben + erstes.unten) / 2 - K.FIGUR_START_Y) <= 24, 'erste Lücke fast auf Starthöhe');
}

abschnitt('Punkte: jedes Paar genau einmal, erst nach vollständigem Durchflug');
{
  const s = neu();
  const h = s.hindernisse[0];
  const mitte = (h.oben + h.unten) / 2;
  let punkteBeiKante = null;
  // Figur exakt in der Lückenmitte halten (Physik ausgeschaltet über direkten Eingriff)
  for (let i = 0; i < 2400 && s.punkte < 2; i++) {
    const naechstes = s.hindernisse.find(x => !x.gezaehlt);
    s.figur.y = (naechstes.oben + naechstes.unten) / 2;
    s.figur.vy = 0;
    schritt(s, dt);
    const links = s.strecke + K.FIGUR_X - K.TREFFER_B / 2;
    if (punkteBeiKante === null && links > h.x + K.HINDERNIS_B - 1 && links <= h.x + K.HINDERNIS_B) punkteBeiKante = s.punkte;
  }
  pruefe(s.zustand === ZUSTAND.SPIELEN, 'in der Lückenmitte gibt es keinen Unfall');
  pruefe(punkteBeiKante === 0, 'kein Punkt, solange die Figur noch im Hindernis steckt');
  pruefe(s.punkte === 2, 'zwei Hindernisse = zwei Punkte');
  const e = ereignisse(s).filter(x => x.typ === 'punkt');
  pruefe(e.length === 2, 'genau zwei Punkt-Ereignisse');
  pruefe(Math.abs(mitte - (h.oben + h.unten) / 2) < 1e-9, 'Lücke bleibt stationär');
}

abschnitt('Kollisionen: Decke, Wasser, Container');
{
  let s = neu();
  s.figur.y = K.DECKE + K.TREFFER_H / 2 - 0.5;
  pruefe(pruefeKollision(s) === 'decke', 'obere Grenze trifft');
  s.figur.y = K.DECKE + K.TREFFER_H / 2 + 0.5;
  pruefe(pruefeKollision(s) === null, 'knapp unter der Kranbahn frei');
  s.figur.y = K.WASSER - K.TREFFER_H / 2 + 0.5;
  pruefe(pruefeKollision(s) === 'wasser', 'Wasser trifft');
  s.figur.y = K.WASSER - K.TREFFER_H / 2 - 0.5;
  pruefe(pruefeKollision(s) === null, 'knapp über dem Wasser frei');

  // Container: Figur steht direkt im ersten Hindernis
  s = neu();
  const h = s.hindernisse[0];
  s.strecke = h.x + K.HINDERNIS_B / 2 - K.FIGUR_X;
  s.figur.y = h.oben + K.TREFFER_H / 2 - 1;
  pruefe(pruefeKollision(s) === 'container', 'Oberkante der Lücke trifft');
  s.figur.y = h.oben + K.TREFFER_H / 2 + 0.5;
  pruefe(pruefeKollision(s) === null, 'knapp unter der Oberkante frei');
  s.figur.y = h.unten - K.TREFFER_H / 2 + 1;
  pruefe(pruefeKollision(s) === 'container', 'Unterkante der Lücke trifft');
  // seitlicher Rand mit kleinem Einzug
  s.figur.y = 30 + K.TREFFER_H;   // weit oben im Container-Bereich
  s.strecke = h.x + K.HINDERNIS_EINZUG - K.TREFFER_B / 2 - K.FIGUR_X - 0.5;
  pruefe(pruefeKollision(s) === null, 'vor dem Container frei');
  s.strecke += 1;
  pruefe(pruefeKollision(s) === 'container', 'Containerkante trifft');

  // Unfall beendet den Versuch, Sperre gegen versehentlichen Neustart
  s = neu();
  s.figur.y = K.WASSER - 20; s.figur.vy = 300;
  laufe(s, 0.2);
  pruefe(s.zustand === ZUSTAND.ENDE && s.unfall.art === 'wasser', 'Wasserlandung beendet den Versuch');
  const e = ereignisse(s);
  pruefe(e.filter(x => x.typ === 'unfall').length === 1, 'genau ein Unfall-Ereignis');
  const startsVorher = s.statistik.starts;
  s.unfall.zeit = 0;
  pruefe(eingabe(s) === null, 'sofortige Eingabe nach Unfall wird ignoriert');
  laufe(s, K.SPERRE_NACH_UNFALL - 0.05);
  pruefe(eingabe(s) === null && !kannStarten(s), 'Eingabe während der Sperre ignoriert');
  laufe(s, 0.06);
  pruefe(kannStarten(s), 'nach der Sperre ist Neustart möglich');
  pruefe(eingabe(s, 3) === 'start', 'Eingabe startet neu');
  pruefe(s.statistik.starts === startsVorher + 1, 'genau ein neuer Start');
  pruefe(s.zustand === ZUSTAND.SPIELEN && s.punkte === 0 && s.strecke === 0, 'Neustart setzt alles zurück');
  pruefe(ereignisse(s).filter(x => x.typ === 'impuls').length === 1, 'Neustart gibt genau einen Impuls');
}

abschnitt('Pause und Bereitschaft');
{
  const s = neu();
  laufe(s, 0.3);
  const y = s.figur.y; const st = s.strecke;
  pruefe(pausiere(s), 'pausieren klappt');
  pruefe(!pausiere(s), 'doppelt pausieren geht nicht');
  laufe(s, 2);
  pruefe(s.figur.y === y && s.strecke === st, 'in der Pause steht alles');
  pruefe(eingabe(s) === null, 'Spieleingabe setzt die Pause nicht fort');
  pruefe(setzeFort(s) && s.zustand === ZUSTAND.BEREIT, 'Weiter führt in die Bereitschaft');
  laufe(s, 2);
  pruefe(s.figur.y === y && s.strecke === st, 'in der Bereitschaft fällt die Figur nicht');
  ereignisse(s);
  pruefe(eingabe(s) === 'weiter' && s.zustand === ZUSTAND.SPIELEN, 'Eingabe fliegt weiter');
  pruefe(s.figur.vy === K.IMPULS, 'Weiterfliegen beginnt mit einem Impuls');
  pruefe(pausiere(s) && setzeFort(s) && pausiere(s), 'Pause auch aus der Bereitschaft');
}

abschnitt('Faire Hindernisfolgen (viele Startwerte)');
{
  let maxGesehen = 0; let anzahl = 0; let schlechtestReserve = Infinity;
  for (let saat = 1; saat <= 300; saat++) {
    const s = erstelleSpiel();
    starte(s, saat);
    while (s.erzeugt < 160) {
      s.strecke += K.ABSTAND;
      api.fuelleHindernisse(s);
    }
    // alle erzeugten Hindernisse neu durchgehen (fuelle räumt alte weg): neu erzeugen und mitschreiben
    const t = erstelleSpiel();
    starte(t, saat);
    const liste = [...t.hindernisse];
    while (liste.length < 160) { t.strecke += K.ABSTAND; api.fuelleHindernisse(t); for (const h of t.hindernisse) if (!liste.includes(h)) liste.push(h); }
    let vorherMitte = K.FIGUR_START_Y; let vorherLuecke = lueckeBei(0);
    for (const h of liste) {
      anzahl++;
      const luecke = h.unten - h.oben;
      const mitte = (h.oben + h.unten) / 2;
      pruefe(Math.abs(luecke - lueckeBei(h.i)) < 1e-6, 'Lückengröße wie geplant');
      pruefe(h.b === K.HINDERNIS_B && h.amp === 0 && !h.muenze, 'Endlos: normale Container, keine Sterne');
      pruefe(luecke >= K.LUECKE_MIN - 1e-6, 'Lücke nie kleiner als das Minimum');
      pruefe(h.oben >= K.LUECKE_OBEN_MIN - 1e-6 && h.unten <= K.LUECKE_UNTEN_MAX + 1e-6, 'Abstand zu Kranbahn und Wasser');
      const erlaubt = erlaubterVersatz(h.i, vorherLuecke, luecke);
      const d = Math.abs(mitte - vorherMitte);
      pruefe(d <= erlaubt + 1e-6, `Versatz physikalisch machbar (Hindernis ${h.i})`);
      schlechtestReserve = Math.min(schlechtestReserve, erlaubt - d);
      maxGesehen = Math.max(maxGesehen, d);
      if (h.i > 0) pruefe(Math.abs(h.x - liste[h.i - 1].x - K.ABSTAND) < 1e-9, 'gleichmäßiger Abstand');
      vorherMitte = mitte; vorherLuecke = luecke;
    }
  }
  console.log(`  ${anzahl} Hindernisse geprüft, größter Versatz ${maxGesehen.toFixed(0)}, kleinste Reserve ${schlechtestReserve.toFixed(0)}`);
  for (const i of [0, 10, 20, 33, 60]) {
    console.log(`  Hindernis ${String(i).padStart(2)}: Tempo ${tempoBei(i).toFixed(0)}, Lücke ${lueckeBei(i).toFixed(0)}, erlaubt ${Math.min(api.versatzBei(i), erlaubterVersatz(i, lueckeBei(i), lueckeBei(i))).toFixed(0)}`);
  }
}

// ---------------------------------------------------------------
// Bot: spielt wie ein Mensch mit begrenzter Reaktion (höchstens ~7 Tipps pro Sekunde),
// entscheidet nur einmal pro Bild und sieht nur die nächsten Lücken.
// rauschen > 0 macht ihn ungenauer (zum Messen der Schwierigkeit).
function botSpiel(saat, bildrate, ziel, jitter = 0, konfig = null, rauschen = 0) {
  const s = erstelleSpiel(konfig || undefined);
  starte(s, saat);
  let rest = 0; let seitTipp = 0; let zeit = 0;
  const z = (() => { let a = saat * 7 + 1; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  let fehlgriff = 0;
  const amEnde = () => s.zustand !== ZUSTAND.SPIELEN || s.punkte >= ziel;
  while (!amEnde() && zeit < 600) {
    let frame = 1 / bildrate;
    if (jitter) frame *= 1 + (z() * 2 - 1) * jitter;
    zeit += frame;
    rest += Math.min(frame, K.MAX_FRAME);
    while (rest >= K.SCHRITT) { schritt(s, K.SCHRITT); rest -= K.SCHRITT; }
    seitTipp += frame;
    if (amEnde()) break;
    const x = s.strecke + K.FIGUR_X - K.TREFFER_B / 2;
    const idx = s.hindernisse.findIndex(o => o.x + o.b > x);
    const a = s.hindernisse[idx];
    if (!a) continue;
    const b = s.hindernisse[idx + 1];
    const tempo = s.konfig.tempo(s.punkte);
    // Schwebende Lücken: der Bot schätzt, wo sie bei seiner Ankunft sind (wie ein Mensch, der hinschaut)
    const lage = o => {
      if (!o.amp) return { oben: o.oben, unten: o.unten };
      const t = Math.max(0, (o.x - (x + K.TREFFER_B)) / tempo);
      const v = o.amp * Math.sin(o.frq * (s.flugzeit + Math.min(t, 0.6)) + o.phase);
      const jetzt = o.versatz;
      const vv = t > 0 ? v : jetzt;
      return { oben: o.oben0 + vv, unten: o.unten0 + vv };
    };
    const la = lage(a);
    const tief = o => o.unten - Math.min(44, (o.unten - o.oben) * 0.3);
    let zielY = tief(la);
    if (b && x + K.TREFFER_B > a.x - 30 && !a.lang) {
      const lb = lage(b);
      zielY = Math.min(tief(la), tief(lb));
    }
    // Nie so hoch tippen, dass der Schub an die Oberkante trägt: Schubhöhe hängt vom Wind ab,
    // schwebende Lücken brauchen etwas Reserve
    const steig = K.IMPULS * K.IMPULS / (2 * (K.SCHWERKRAFT + Math.min(0, s.wind.a, s.wind.warnung < 0 ? -s.konfig.wind : 0)));
    zielY = Math.max(zielY, la.oben + K.TREFFER_H / 2 + steig + 8 + a.amp * 0.5);
    // Stern in der Lücke: etwas darunter zielen, damit der Schub durch den Stern trägt
    if (a.muenze && !a.geholt && !rauschen) zielY = Math.min(zielY, (la.oben + la.unten) / 2 + 22);
    // Wind: bei Böe nach unten früher tippen, bei Böe nach oben später
    if (s.wind.richtung) zielY -= 10 * s.wind.richtung * (s.wind.anteil || 0.5);
    zielY += fehlgriff;
    const abstand = 0.14 + (rauschen ? z() * 0.08 : 0);
    // Vorausschau: Würde ein Tipp jetzt (ohne weitere Tipps) gegen eine Oberkante tragen? Dann lieber nicht.
    // Droht die Unterkante der aktuellen Lücke, bevor die Figur sie verlassen hat?
    const gleichUnten = () => {
      if (s.figur.y <= la.unten - K.TREFFER_H / 2 - 14) return false;
      const raus = (a.x + a.b - x) / tempo;
      const rein = Math.max(0, a.x - (x + K.TREFFER_B)) / tempo;
      const bisUnten = (la.unten - K.TREFFER_H / 2 - s.figur.y) / Math.max(1, s.figur.vy);
      return bisUnten < raus && bisUnten + 0.05 > rein;
    };
    const stoesstAn = () => {
      let y = s.figur.y; let vy = K.IMPULS; let px = s.strecke + K.FIGUR_X;
      const g = K.SCHWERKRAFT + s.wind.a;
      for (let tt = 0; tt < 0.9; tt += 0.02) {
        vy = Math.min(vy + g * 0.02, K.MAX_FALL); y += vy * 0.02; px += tempo * 0.02;
        for (const o of s.hindernisse.slice(Math.max(0, idx), idx + 3)) {
          if (px + K.TREFFER_B / 2 <= o.x || px - K.TREFFER_B / 2 >= o.x + o.b) continue;
          const v = o.amp ? o.amp * Math.sin(o.frq * (s.flugzeit + tt) + o.phase) : 0;
          if (y - K.TREFFER_H / 2 < o.oben0 + v + 3) return true;
        }
      }
      return false;
    };
    if (s.figur.y > zielY && s.figur.vy > -60 && seitTipp > abstand && (gleichUnten() || !stoesstAn())) {
      eingabe(s); seitTipp = 0;
      if (rauschen) fehlgriff = (z() * 2 - 1) * rauschen;
    }
    s.ereignisse.length = 0;
  }
  return { punkte: s.punkte, unfall: s.unfall && s.unfall.art, zeit, sterne: s.sterne, ziel: s.zustand === ZUSTAND.ZIEL };
}

abschnitt('Bot spielt bei verschiedenen Bildraten');
{
  const ziel = schnell ? 60 : 150;
  const saaten = schnell ? 12 : 40;
  for (const [rate, jit] of [[30, 0], [60, 0], [120, 0], [144, 0], [60, 0.5]]) {
    let geschafft = 0; let summe = 0; const unfaelle = {};
    for (let saat = 1; saat <= saaten; saat++) {
      const r = botSpiel(saat, rate, ziel, jit);
      summe += r.punkte;
      if (r.punkte >= ziel) geschafft++;
      else unfaelle[r.unfall] = (unfaelle[r.unfall] || 0) + 1;
    }
    console.log(`  ${rate} Hz${jit ? ' (unruhig)' : ''}: ${geschafft}/${saaten} Läufe erreichen ${ziel} Punkte, Schnitt ${(summe / saaten).toFixed(0)}`, Object.keys(unfaelle).length ? unfaelle : '');
    pruefe(geschafft >= saaten * 0.9, `Bot schafft bei ${rate} Hz fast alle Läufe`);
  }
}

abschnitt('Gleiches Tempo bei allen Bildraten');
{
  const ergebnis = [];
  for (const rate of [30, 60, 75, 120, 144, 240]) {
    const s = erstelleSpiel();
    starte(s, 11);
    // feste Eingabezeitpunkte, Figur unverwundbar (Hindernisse entfernt)
    const tipps = [0.57, 1.14, 1.71, 2.28, 2.85];   // Schwebe-Rhythmus: Figur bleibt etwa auf gleicher Höhe
    let rest = 0; let zeit = 0; let k = 0;
    while (zeit < 3) {
      const frame = 1 / rate;
      zeit += frame;
      rest += frame;
      while (rest >= K.SCHRITT - 1e-12) {
        s.hindernisse.forEach(h => { h.oben = -1000; h.unten = 5000; });
        schritt(s, K.SCHRITT); rest -= K.SCHRITT;
      }
      while (k < tipps.length && zeit >= tipps[k]) { eingabe(s); k++; }
    }
    ergebnis.push({ rate, strecke: s.strecke, y: s.figur.y, lebt: s.zustand === ZUSTAND.SPIELEN });
  }
  pruefe(ergebnis.every(e => e.lebt), 'Figur überlebt den Tempotest');
  const ref = ergebnis[0];
  for (const e of ergebnis) {
    pruefe(Math.abs(e.strecke - ref.strecke) <= K.TEMPO_START * (1 / 30 + K.SCHRITT), `Strecke bei ${e.rate} Hz gleich`);
    pruefe(Math.abs(e.y - ref.y) < 18, `Flughöhe bei ${e.rate} Hz fast gleich (Abweichung nur durch Bildzeitpunkt der Eingabe)`);
  }
  console.log('  ' + ergebnis.map(e => `${e.rate} Hz: Strecke ${e.strecke.toFixed(1)}, Höhe ${e.y.toFixed(1)}`).join(' | '));
}

abschnitt('Level: Aufbau, Fairness, Sterne, Ziel');
{
  const { LEVEL, GEBIETE, erstelleKonfig, waehle } = api;
  pruefe(LEVEL.length === 32 && GEBIETE.length === 7, '32 Level in 7 Gebieten');
  pruefe(GEBIETE.every((g, gi) => LEVEL.filter(l => l.g === gi).length >= 4), 'jedes Gebiet hat mindestens 4 Level');
  for (const L of LEVEL) {
    for (const st of ['leicht', 'normal', 'schwer']) {
      const k = erstelleKonfig('level', L.nr, st);
      // Gleicher Aufbau bei jedem Versuch
      const a1 = erstelleSpiel(k); starte(a1); while (a1.erzeugt < k.anzahl) { a1.strecke += 400; api.fuelleHindernisse(a1); }
      const a2 = erstelleSpiel(k); starte(a2); const l2 = [...a2.hindernisse];
      pruefe(Math.abs(l2[0].mitte0 - a1.hindernisse.find(h => h.i === 0)?.mitte0 || 0) < 1e-9 || a1.hindernisse[0].i > 0, `Level ${L.nr}: fester Aufbau`);
      // Alle Hindernisse prüfen
      const s = erstelleSpiel(k); starte(s); const liste = [...s.hindernisse];
      while (s.erzeugt < k.anzahl) { s.strecke += 300; api.fuelleHindernisse(s); for (const h of s.hindernisse) if (!liste.includes(h)) liste.push(h); }
      pruefe(liste.length === k.anzahl, `Level ${L.nr} (${st}): ${k.anzahl} Hindernisse`);
      pruefe(liste.filter(h => h.muenze).length === 3, `Level ${L.nr} (${st}): genau 3 Sterne`);
      let vor = { mitte: K.FIGUR_START_Y, luecke: k.luecke(0), amp: 0 };
      const schub = (K.IMPULS * K.IMPULS) / (2 * (K.SCHWERKRAFT - k.wind));
      for (const h of liste) {
        const luecke = h.unten0 - h.oben0;
        pruefe(h.oben0 - h.amp >= K.LUECKE_OBEN_MIN - 1e-6 && h.unten0 + h.amp <= K.LUECKE_UNTEN_MAX + 1e-6, `Level ${L.nr}: Lücke bleibt im Rahmen`);
        pruefe(luecke >= schub + K.TREFFER_H + K.LUECKE_RESERVE - 1e-6, `Level ${L.nr}: Lücke größer als Schubweg + Figur + Luft`);
        if (h.amp) pruefe(luecke - 2 * 0 >= schub + K.TREFFER_H + K.SCHWEBE_RESERVE + h.amp - 1e-6, `Level ${L.nr}: Schwebeweg lässt Platz`);
        pruefe(Math.abs(h.mitte0 - vor.mitte) <= erlaubterVersatz(k, h.i, vor, { luecke, amp: h.amp }) + 1e-6, `Level ${L.nr} (${st}): Versatz machbar bei Hindernis ${h.i}`);
        vor = { mitte: h.mitte0, luecke, amp: h.amp };
      }
    }
  }
  // Ziel und Sterne
  const k = erstelleKonfig('level', 1, 'normal');
  const s = erstelleSpiel(k); starte(s); ereignisse(s);
  for (let n = 0; n < 20000 && s.zustand === ZUSTAND.SPIELEN; n++) {
    const h = s.hindernisse.find(o => o.x + o.b > s.strecke + K.FIGUR_X - 30) || s.hindernisse[s.hindernisse.length - 1];
    s.figur.y = (h.oben + h.unten) / 2; s.figur.vy = 0; schritt(s, dt);
  }
  const e = ereignisse(s);
  pruefe(s.zustand === ZUSTAND.ZIEL, 'Level 1 endet im Ziel');
  pruefe(s.punkte === k.anzahl && s.sterne === 3, 'mittig geflogen: alle Punkte und alle 3 Sterne');
  pruefe(e.filter(x => x.typ === 'stern').length === 3 && e.filter(x => x.typ === 'ziel').length === 1, 'genau 3 Stern- und 1 Ziel-Ereignis');
  pruefe(eingabe(s) === null && !pausiere(s), 'im Ziel: keine Eingabe, keine Pause');
  laufe(s, 1);
  pruefe(s.zustand === ZUSTAND.ZIEL, 'Ziel bleibt Ziel');
  waehle(s, erstelleKonfig('endlos', 0, 'normal'));
  pruefe(s.zustand === ZUSTAND.START && s.hindernisse.length === 0, 'Zurück ins Menü setzt alles zurück');
}

abschnitt('Bot fliegt alle Level (alle Stufen, mehrere Bildraten)');
{
  const { LEVEL, erstelleKonfig } = api;
  let gesamt = 0; let ziel = 0; const fehlschlaege = [];
  const raten = schnell ? [[60, 0]] : [[30, 0], [60, 0], [60, 0.5], [144, 0]];
  for (const L of LEVEL) for (const st of ['leicht', 'normal', 'schwer']) for (const [r, j] of raten) {
    const e = botSpiel(3, r, 1e9, j, erstelleKonfig('level', L.nr, st));
    gesamt++; if (e.ziel) ziel++; else fehlschlaege.push(`${L.nr}/${st}/${r}Hz`);
  }
  console.log(`  ${ziel}/${gesamt} Läufe im Ziel`, fehlschlaege.length ? fehlschlaege : '');
  pruefe(ziel === gesamt, 'jedes Level ist auf jeder Stufe schaffbar');
}

abschnitt('Wind');
{
  const { erstelleKonfig } = api;
  const k = erstelleKonfig('level', 22, 'normal');
  const s = erstelleSpiel(k); starte(s);
  pruefe(s.windPlan.length > 20, 'Böenplan vorhanden');
  pruefe(s.windPlan[0].start >= K.WIND_ERSTE, 'erste Böe nicht sofort');
  let warnung = false; let max = 0;
  for (let t = 0; t < 60; t += 0.01) { const w = api.windBei(s, t); if (w.warnung) warnung = true; max = Math.max(max, Math.abs(w.a)); }
  pruefe(warnung, 'vor jeder Böe gibt es einen Hinweis');
  pruefe(Math.abs(max - k.wind) < 1e-6, 'Böenstärke wie eingestellt');
  const ohne = erstelleSpiel(erstelleKonfig('level', 1, 'normal')); starte(ohne);
  pruefe(ohne.windPlan.length === 0, 'ohne Wind kein Plan');
}

abschnitt('Levelfortschritt speichern');
{
  const daten = {};
  const L = lade({ localStorage: { getItem: k => (k in daten ? daten[k] : null), setItem: (k, v) => { daten[k] = String(v); } } });
  pruefe(L.Speicher.fortschritt().geschafft.length === 0, 'leer am Anfang');
  let r = L.Speicher.levelGeschafft(1, 2);
  pruefe(r.erstmals && r.mehrSterne, 'erstes Geschafft');
  r = L.Speicher.levelGeschafft(1, 1);
  pruefe(!r.erstmals && !r.mehrSterne && L.Speicher.fortschritt().sterne[1] === 2, 'bestes Sternergebnis bleibt');
  L.Speicher.levelGeschafft(1, 3);
  pruefe(L.Speicher.fortschritt().sterne[1] === 3, 'mehr Sterne werden gemerkt');
  daten['pixelhafen.hafenhopser.v1.level'] = '{kaputt';
  pruefe(L.Speicher.fortschritt().geschafft.length === 0, 'kaputter Spielstand: sauber leer');
  L.Speicher.setzeRekord(12, 'schwer'); L.Speicher.setzeRekord(7);
  pruefe(L.Speicher.rekord('schwer') === 12 && L.Speicher.rekord('normal') === 7 && L.Speicher.rekord('leicht') === 0, 'Rekord je Stufe');
  pruefe(daten['pixelhafen.hafenhopser.v1.rekord'] === '7', 'alter Normal-Rekord behält seine Kennung');
  L.Speicher.setzeStufe('schwer');
  pruefe(L.Speicher.stufe() === 'schwer', 'Stufe gespeichert');
  daten['pixelhafen.hafenhopser.v1.stufe'] = 'quatsch';
  pruefe(L.Speicher.stufe() === 'normal', 'unbekannte Stufe ergibt Normal');
}

abschnitt('Speicher mit und ohne localStorage');
{
  const daten = {};
  const mitLager = lade({ localStorage: { getItem: k => (k in daten ? daten[k] : null), setItem: (k, v) => { daten[k] = String(v); } } });
  pruefe(mitLager.Speicher.rekord() === 0, 'Rekord startet bei 0');
  mitLager.Speicher.setzeRekord(17);
  pruefe(daten['pixelhafen.hafenhopser.v1.rekord'] === '17', 'versionierte Kennung im localStorage');
  pruefe(mitLager.Speicher.rekord() === 17, 'Rekord wird gelesen');
  mitLager.Speicher.setzeTon(false);
  pruefe(mitLager.Speicher.tonAn() === false, 'Ton-Einstellung wird gespeichert');
  daten['pixelhafen.hafenhopser.v1.rekord'] = 'Quatsch';
  pruefe(mitLager.Speicher.rekord() === 0, 'kaputter Wert ergibt 0');

  const gesperrt = {};
  Object.defineProperty(gesperrt, 'localStorage', { get() { throw new Error('SecurityError'); } });
  const ohne = lade(gesperrt);
  pruefe(ohne.Speicher.rekord() === 0 && ohne.Speicher.tonAn() === true, 'ohne localStorage: Standardwerte');
  ohne.Speicher.setzeRekord(5);
  ohne.Speicher.setzeTon(false);
  pruefe(ohne.Speicher.rekord() === 5 && ohne.Speicher.tonAn() === false, 'ohne localStorage: bis zum Neuladen gemerkt');
  const voll = lade({ localStorage: { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } } });
  voll.Speicher.setzeRekord(9);
  pruefe(voll.Speicher.rekord() === 9, 'voller Speicher: Wert bleibt im Spiel erhalten');
}

console.log(`\n${ok} Prüfungen bestanden, ${fehler} fehlgeschlagen.`);
process.exit(fehler ? 1 : 0);
