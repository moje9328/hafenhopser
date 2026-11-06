// ===================================================================
// 2 · SPIELLOGIK
// Zustände, Flugphysik, Hindernisse, Punkte und Kollisionen.
// Kein Zugriff auf Bildschirm, Ton oder Browser: alles hier lässt sich
// in Node testen (quelle/test-logik.js).
// ===================================================================

const ZUSTAND = {
  START: 'start',        // Startfenster, Figur schwebt
  SPIELEN: 'spielen',
  BEREIT: 'bereit',      // nach der Pause: Welt steht still, erst ein Tipp fliegt weiter
  PAUSE: 'pause',
  ENDE: 'ende',          // Bruchlandung (kurze Sperre, dann Neustart möglich)
};

// Kleiner Zufallsgenerator mit Startwert, damit Folgen nachprüfbar sind
function zufallsGenerator(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const begrenze = (v, min, max) => Math.max(min, Math.min(max, v));

// ---------- Schwierigkeit ----------
// Index i = Nummer des Hindernisses = Punktestand, während man darauf zufliegt.
function tempoBei(punkte) { return Math.min(K.TEMPO_START + punkte * K.TEMPO_PRO_PUNKT, K.TEMPO_MAX); }
function lueckeBei(i) { return Math.max(K.LUECKE_START - i * K.LUECKE_PRO_PUNKT, K.LUECKE_MIN); }
function versatzBei(i) {
  if (i < K.RUHIGE_HINDERNISSE) return 24;
  return Math.min(K.VERSATZ_START + (i - K.RUHIGE_HINDERNISSE) * K.VERSATZ_PRO_PUNKT, K.VERSATZ_MAX);
}

// Durchschnittliche Steiggeschwindigkeit bei bequemem Tippen (aus der echten Physik)
function steigRate() {
  const t = K.FAIR_TIPP_ABSTAND;
  return (-K.IMPULS * t - 0.5 * K.SCHWERKRAFT * t * t) / t;
}

// Größter fairer Höhenunterschied zwischen der Lücke davor (A) und der neuen Lücke (B).
// Zwischen den Hindernissen bleibt die freie Flugzeit; dazu kommt der Spielraum,
// den man innerhalb beider Lücken hat (man kann A oben verlassen und B unten erreichen).
function erlaubterVersatz(i, lueckeA, lueckeB) {
  const frei = (K.ABSTAND - K.HINDERNIS_B - K.TREFFER_B) / tempoBei(i);
  const spielraum = Math.max(0, (lueckeA - K.TREFFER_H) / 2 - K.FAIR_SICHERHEIT)
                  + Math.max(0, (lueckeB - K.TREFFER_H) / 2 - K.FAIR_SICHERHEIT);
  return steigRate() * frei * K.FAIR_FAKTOR + spielraum;
}

// ---------- Spielstand ----------
function erstelleSpiel() {
  return {
    zustand: ZUSTAND.START,
    zeit: 0,                 // läuft immer (für Animationen)
    punkte: 0,
    strecke: 0,              // so weit ist die Welt schon nach links gezogen
    figur: { y: K.FIGUR_START_Y, vy: 0, schub: 99 },
    vorher: { y: K.FIGUR_START_Y, strecke: 0 },   // für weiche Darstellung zwischen zwei Schritten
    hindernisse: [],
    erzeugt: 0,
    letzteMitte: K.FIGUR_START_Y,
    letzteLuecke: K.LUECKE_START,
    rng: zufallsGenerator(1),
    unfall: null,            // { art: 'container' | 'wasser' | 'decke', zeit }
    ereignisse: [],
    statistik: { impulse: 0, starts: 0 },
  };
}

function erzeugeHindernis(s) {
  const i = s.erzeugt++;
  const luecke = lueckeBei(i);
  const oben = K.LUECKE_OBEN_MIN + luecke / 2;
  const unten = K.LUECKE_UNTEN_MAX - luecke / 2;
  const d = Math.min(versatzBei(i), erlaubterVersatz(i, s.letzteLuecke, luecke));
  // Begrenzen kann den Versatz nur verkleinern (die vorige Mitte liegt immer im erlaubten Bereich)
  const mitte = begrenze(s.letzteMitte + (s.rng() * 2 - 1) * d, oben, unten);
  s.letzteMitte = mitte;
  s.letzteLuecke = luecke;
  s.hindernisse.push({
    i,
    x: K.FIGUR_X + K.ANFLUG + i * K.ABSTAND,   // linke Kante in Weltkoordinaten
    oben: mitte - luecke / 2,                  // Oberkante der freien Lücke
    unten: mitte + luecke / 2,                 // Unterkante der freien Lücke
    gezaehlt: false,
    saat: Math.floor(s.rng() * 1e9),           // nur für Farben und Aufkleber
  });
}

// Hält genug Hindernisse vor der Figur bereit und räumt hinten auf
function fuelleHindernisse(s) {
  while (!s.hindernisse.length || s.hindernisse[s.hindernisse.length - 1].x < s.strecke + K.BREITE + K.ABSTAND) {
    erzeugeHindernis(s);
  }
  while (s.hindernisse.length && s.hindernisse[0].x + K.HINDERNIS_B < s.strecke - 40) s.hindernisse.shift();
}

function neuStart(s, saat) {
  s.zustand = ZUSTAND.SPIELEN;
  s.punkte = 0;
  s.strecke = 0;
  s.figur.y = K.FIGUR_START_Y;
  s.figur.vy = 0;
  s.figur.schub = 99;
  s.vorher.y = s.figur.y;
  s.vorher.strecke = 0;
  s.hindernisse = [];
  s.erzeugt = 0;
  s.letzteMitte = K.FIGUR_START_Y;
  s.letzteLuecke = K.LUECKE_START;
  s.rng = zufallsGenerator(saat === undefined ? (Date.now() ^ 0x5eed) : saat);
  s.unfall = null;
  s.ereignisse.length = 0;
  s.statistik.starts++;
  fuelleHindernisse(s);
}

// Ein Flugimpuls: Geschwindigkeit wird GESETZT, nicht addiert
function impuls(s) {
  s.figur.vy = K.IMPULS;
  s.figur.schub = 0;
  s.statistik.impulse++;
  s.ereignisse.push({ typ: 'impuls' });
}

// Startet einen Versuch und gibt genau einen ersten Impuls
function starte(s, saat) {
  neuStart(s, saat);
  impuls(s);
}

// Darf die nächste Spieleingabe einen neuen Versuch starten?
function kannStarten(s) {
  return s.zustand === ZUSTAND.START || (s.zustand === ZUSTAND.ENDE && s.unfall && s.unfall.zeit >= K.SPERRE_NACH_UNFALL);
}

// Eine Spieleingabe (Taste, Klick, Tipp). Gibt zurück, was passiert ist.
function eingabe(s, saat) {
  switch (s.zustand) {
    case ZUSTAND.SPIELEN: impuls(s); return 'impuls';
    case ZUSTAND.BEREIT: s.zustand = ZUSTAND.SPIELEN; impuls(s); return 'weiter';
    case ZUSTAND.START:
    case ZUSTAND.ENDE:
      if (!kannStarten(s)) return null;
      starte(s, saat);
      return 'start';
    default: return null;   // in der Pause zählt nur „Weiter“
  }
}

function pausiere(s) {
  if (s.zustand !== ZUSTAND.SPIELEN && s.zustand !== ZUSTAND.BEREIT) return false;
  s.zustand = ZUSTAND.PAUSE;
  return true;
}

// Nach der Pause: Bereitschaft, erst die nächste Eingabe fliegt weiter
function setzeFort(s) {
  if (s.zustand !== ZUSTAND.PAUSE) return false;
  s.zustand = ZUSTAND.BEREIT;
  return true;
}

// Trefferfläche der Figur (Weltkoordinaten)
function trefferFlaeche(s) {
  const x = s.strecke + K.FIGUR_X;
  return {
    l: x - K.TREFFER_B / 2, r: x + K.TREFFER_B / 2,
    o: s.figur.y - K.TREFFER_H / 2, u: s.figur.y + K.TREFFER_H / 2,
  };
}

// Trifft die Figur ein Hindernis? Container oben reichen von der Kranbahn bis zur Lücke,
// Stapel unten von der Lücke bis ins Wasser. Seile liegen innerhalb dieser Fläche über
// den Containern und sind zu kurz, um hindurchzupassen: kein unerwartetes Hindernis.
function trifftHindernis(t, h) {
  const l = h.x + K.HINDERNIS_EINZUG;
  const r = h.x + K.HINDERNIS_B - K.HINDERNIS_EINZUG;
  if (t.r <= l || t.l >= r) return false;
  return t.o < h.oben || t.u > h.unten;
}

function pruefeKollision(s) {
  const t = trefferFlaeche(s);
  if (t.o < K.DECKE) return 'decke';
  if (t.u > K.WASSER) return 'wasser';
  for (const h of s.hindernisse) {
    if (h.x > t.r) break;
    if (trifftHindernis(t, h)) return 'container';
  }
  return null;
}

function unfall(s, art) {
  s.zustand = ZUSTAND.ENDE;
  s.unfall = { art, zeit: 0, y: s.figur.y };
  s.figur.vy = 0;
  s.ereignisse.push({ typ: 'unfall', art });
}

function schritt(s, dt) {
  s.zeit += dt;
  s.vorher.y = s.figur.y;
  s.vorher.strecke = s.strecke;

  if (s.zustand === ZUSTAND.ENDE) { s.unfall.zeit += dt; return; }
  if (s.zustand !== ZUSTAND.SPIELEN) return;

  const f = s.figur;
  f.schub += dt;
  f.vy = Math.min(f.vy + K.SCHWERKRAFT * dt, K.MAX_FALL);
  f.y += f.vy * dt;
  s.strecke += tempoBei(s.punkte) * dt;
  fuelleHindernisse(s);

  const art = pruefeKollision(s);
  if (art) { unfall(s, art); return; }

  // Punkt erst, wenn die Trefferfläche das Hindernis ganz hinter sich hat; jedes Paar nur einmal
  const links = s.strecke + K.FIGUR_X - K.TREFFER_B / 2;
  for (const h of s.hindernisse) {
    if (!h.gezaehlt && links > h.x + K.HINDERNIS_B) {
      h.gezaehlt = true;
      s.punkte++;
      s.ereignisse.push({ typ: 'punkt', punkte: s.punkte });
    }
  }
}
