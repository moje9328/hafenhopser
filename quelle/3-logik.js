// ===================================================================
// 3 · SPIELLOGIK
// Zustände, Flugphysik, Hindernisse, Sterne, Wind, Punkte und Kollisionen.
// Kein Zugriff auf Bildschirm, Ton oder Browser: alles hier lässt sich
// in Node testen (quelle/test-logik.js).
// ===================================================================

const ZUSTAND = {
  START: 'start',        // vor dem Start, Figur schwebt
  SPIELEN: 'spielen',
  BEREIT: 'bereit',      // nach der Pause: Welt steht still, erst ein Tipp fliegt weiter
  PAUSE: 'pause',
  ENDE: 'ende',          // Bruchlandung (kurze Sperre, dann Neustart möglich)
  ZIEL: 'ziel',          // Level geschafft, Figur fliegt aus
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

// ---------- Regeln für einen Lauf (Endlos oder Level, mit Schwierigkeitsgrad) ----------
// Index i = Nummer des Hindernisses = Punktestand, während man darauf zufliegt.
function erstelleKonfig(modus, nr, stufe) {
  const st = STUFEN[stufe] || STUFEN.normal;
  stufe = STUFEN[stufe] ? stufe : 'normal';
  const ruhig = (i, v) => (i < K.RUHIGE_HINDERNISSE ? 24 : v);
  if (modus !== 'level' || !levelEbene(nr)) {
    return {
      modus: 'endlos', nr: 0, stufe, gebiet: 0, anzahl: Infinity, saat: null, abstand: K.ABSTAND,
      tempo: i => Math.min(K.TEMPO_START + i * K.TEMPO_PRO_PUNKT, K.TEMPO_MAX) * st.tempo,
      luecke: i => Math.max(K.LUECKE_START - i * K.LUECKE_PRO_PUNKT, K.LUECKE_MIN) + st.luecke,
      versatz: i => ruhig(i, Math.min(K.VERSATZ_START + (i - K.RUHIGE_HINDERNISSE) * K.VERSATZ_PRO_PUNKT, K.VERSATZ_MAX) * st.versatz),
      lang: 0, bewegt: 0, amp: () => 0, wind: 0, muenzen: [],
    };
  }
  const L = levelEbene(nr);
  const q = i => (L.n > 1 ? begrenze(i / (L.n - 1), 0, 1) : 0);
  const mische = (paar, i) => paar[0] + (paar[1] - paar[0]) * q(i);
  return {
    modus: 'level', nr, stufe, gebiet: L.g, anzahl: L.n, saat: 1000 + nr * 7919, abstand: L.abstand || K.ABSTAND,
    tempo: i => mische(L.tempo, i) * st.tempo,
    luecke: i => mische(L.luecke, i) + st.luecke,
    versatz: i => ruhig(i, mische(L.versatz, i) * st.versatz),
    lang: L.lang || 0,
    bewegt: L.bewegt || 0,
    amp: i => (L.amp ? mische(L.amp, i) * st.kraft : 0),
    wind: (L.wind || 0) * st.kraft,
    muenzen: [0.25, 0.55, 0.85].map(f => Math.round((L.n - 1) * f)),
  };
}

// Die bisherigen Kurven des Endlos-Flugs (Stufe Normal)
const ENDLOS_NORMAL = erstelleKonfig('endlos', 0, 'normal');
function tempoBei(punkte) { return ENDLOS_NORMAL.tempo(punkte); }
function lueckeBei(i) { return ENDLOS_NORMAL.luecke(i); }
function versatzBei(i) { return ENDLOS_NORMAL.versatz(i); }

// Durchschnittliche Steiggeschwindigkeit bei bequemem Tippen (aus der echten Physik).
// Mit Wind wird mit der stärksten Böe nach unten gerechnet.
function steigRate(schwerkraft = K.SCHWERKRAFT) {
  const t = K.FAIR_TIPP_ABSTAND;
  return (-K.IMPULS * t - 0.5 * schwerkraft * t * t) / t;
}

// Größter fairer Höhenunterschied zwischen der Lücke davor (A) und der neuen Lücke (B).
// Zwischen den Hindernissen bleibt die freie Flugzeit; dazu kommt der Spielraum,
// den man innerhalb beider Lücken hat (man kann A oben verlassen und B unten erreichen).
// Schwebende Container können im ungünstigsten Fall gegeneinander laufen: ihr
// Schwebeweg wird abgezogen.
function erlaubterVersatz(k, i, A, B) {
  if (typeof k === 'number') { B = { luecke: A }; A = { luecke: i }; i = k; k = ENDLOS_NORMAL; }   // alte Form (i, lueckeA, lueckeB)
  const frei = (k.abstand - K.HINDERNIS_B - K.TREFFER_B) / k.tempo(i);
  const spielraum = Math.max(0, (A.luecke - K.TREFFER_H) / 2 - K.FAIR_SICHERHEIT)
                  + Math.max(0, (B.luecke - K.TREFFER_H) / 2 - K.FAIR_SICHERHEIT);
  return steigRate(K.SCHWERKRAFT + k.wind) * frei * K.FAIR_FAKTOR + spielraum - (A.amp || 0) - (B.amp || 0);
}

// Wie hoch trägt ein einzelner Tipp im ungünstigsten Fall (stärkster Aufwind)?
function schubHoehe(k) {
  return (K.IMPULS * K.IMPULS) / (2 * (K.SCHWERKRAFT - k.wind));
}

// ---------- Windplan: feste Folge von Böen pro Level ----------
function erstelleWindPlan(saat, staerke) {
  if (!staerke) return [];
  const z = zufallsGenerator((saat ^ 0xA11CE) >>> 0);
  const plan = [];
  let t = K.WIND_ERSTE + z() * 1.2;
  let letzte = 0;
  while (t < 600) {
    const dauer = 1.4 + z() * 0.9;
    // Höchstens zwei Böen hintereinander in dieselbe Richtung
    let richtung = z() < 0.5 ? -1 : 1;
    if (plan.length >= 2 && plan[plan.length - 1].richtung === letzte && plan[plan.length - 2].richtung === letzte) richtung = -letzte;
    letzte = richtung;
    plan.push({ start: t, ende: t + dauer, richtung });   // richtung +1 = nach unten, -1 = nach oben
    t += dauer + 2.3 + z() * 2.2;
  }
  return plan;
}

// Aktuelle Windlage zur Flugzeit t: Beschleunigung, Hinweis und Stärke 0..1
function windBei(s, t) {
  const w = s.wind;
  const plan = s.windPlan;
  w.a = 0; w.anteil = 0; w.richtung = 0; w.warnung = 0;
  if (!plan.length) return w;
  while (w.idx < plan.length - 1 && plan[w.idx].ende <= t) w.idx++;
  const b = plan[w.idx];
  if (t >= b.start && t < b.ende) {
    const anteil = Math.min(1, (t - b.start) / K.WIND_RAMPE, (b.ende - t) / K.WIND_RAMPE);
    w.anteil = anteil;
    w.richtung = b.richtung;
    w.a = s.konfig.wind * b.richtung * anteil;
  } else if (t < b.start && t >= b.start - K.WIND_WARNUNG) {
    w.warnung = b.richtung;
    w.richtung = b.richtung;
  }
  return w;
}

// ---------- Spielstand ----------
function erstelleSpiel(konfig) {
  return {
    konfig: konfig || erstelleKonfig('endlos', 0, 'normal'),
    zustand: ZUSTAND.START,
    zeit: 0,                 // läuft immer (für Animationen)
    flugzeit: 0,             // läuft nur im Flug (Schwebe-Container, Wind)
    punkte: 0,
    sterne: 0,
    strecke: 0,              // so weit ist die Welt schon nach links gezogen
    figur: { y: K.FIGUR_START_Y, vy: 0, schub: 99 },
    vorher: { y: K.FIGUR_START_Y, strecke: 0 },   // für weiche Darstellung zwischen zwei Schritten
    hindernisse: [],
    erzeugt: 0,
    naechstesX: 0,
    zielX: null,
    letzte: { mitte: K.FIGUR_START_Y, luecke: K.LUECKE_START, amp: 0 },
    rng: zufallsGenerator(1),
    windPlan: [],
    wind: { idx: 0, a: 0, anteil: 0, richtung: 0, warnung: 0 },
    unfall: null,            // { art: 'container' | 'wasser' | 'decke', zeit }
    ziel: null,              // { zeit }
    ereignisse: [],
    statistik: { impulse: 0, starts: 0 },
  };
}

// Anderen Modus oder anderes Level wählen: zurück in den Startzustand
function waehle(s, konfig) {
  s.konfig = konfig;
  s.zustand = ZUSTAND.START;
  s.punkte = 0;
  s.sterne = 0;
  s.strecke = 0;
  s.flugzeit = 0;
  s.figur.y = K.FIGUR_START_Y;
  s.figur.vy = 0;
  s.figur.schub = 99;
  s.vorher.y = s.figur.y;
  s.vorher.strecke = 0;
  s.hindernisse = [];
  s.erzeugt = 0;
  s.zielX = null;
  s.unfall = null;
  s.ziel = null;
  s.windPlan = [];
  s.wind.idx = 0; s.wind.a = 0; s.wind.anteil = 0; s.wind.richtung = 0; s.wind.warnung = 0;
  s.ereignisse.length = 0;
}

// Setzt die Lücke eines schwebenden Containers auf die aktuelle Flugzeit
function bewegeHindernis(h, t) {
  const v = h.amp ? h.amp * Math.sin(h.frq * t + h.phase) : 0;
  h.versatz = v;
  h.oben = h.oben0 + v;
  h.unten = h.unten0 + v;
}

function erzeugeHindernis(s) {
  const k = s.konfig;
  if (s.erzeugt >= k.anzahl) return false;
  const i = s.erzeugt++;
  const z = s.rng;
  // Reihenfolge der Zufallszahlen ist fest, damit ein Level immer gleich aussieht
  const lang = i >= K.RUHIGE_HINDERNISSE && z() < k.lang;
  let amp = 0;
  let frq = 0;
  let phase = 0;
  if (!lang && i >= K.RUHIGE_HINDERNISSE && z() < k.bewegt) {
    amp = k.amp(i);
    frq = K.SCHWEBE_FRQ[0] + z() * (K.SCHWEBE_FRQ[1] - K.SCHWEBE_FRQ[0]);
    phase = z() * Math.PI * 2;
  }
  const b = lang ? K.LANG_B : K.HINDERNIS_B;
  // Jede Lücke bietet mindestens den vollen Schubweg (bei Aufwind länger) plus Figur plus Luft
  const luecke = Math.max(k.luecke(i) + (lang ? K.LANG_EXTRA : 0), schubHoehe(k) + K.TREFFER_H + K.LUECKE_RESERVE);
  // Ein Tipp trägt immer ganz nach oben (mit Aufwind höher). Die Figur braucht in der Lücke
  // mindestens diesen Schubweg plus ihre Größe; nur was übrig bleibt, darf die Lücke schweben.
  if (amp) {
    amp = Math.min(amp, luecke - schubHoehe(k) - K.TREFFER_H - K.SCHWEBE_RESERVE);
    if (amp < 6) amp = 0;
  }
  const oben = K.LUECKE_OBEN_MIN + luecke / 2 + amp;
  const unten = K.LUECKE_UNTEN_MAX - luecke / 2 - amp;
  const neu = { luecke, amp };
  const d = Math.max(0, Math.min(k.versatz(i), erlaubterVersatz(k, i, s.letzte, neu)));
  // Begrenzen verkleinert den Versatz fast immer; die Tests prüfen, dass er erlaubt bleibt
  const mitte = begrenze(s.letzte.mitte + (z() * 2 - 1) * d, oben, unten);
  s.letzte = { mitte, luecke, amp };
  const x = i === 0 ? K.FIGUR_X + K.ANFLUG : s.naechstesX;
  s.naechstesX = x + b + (k.abstand - K.HINDERNIS_B);
  const h = {
    i,
    x,                                       // linke Kante in Weltkoordinaten
    b,                                       // Breite
    lang,
    mitte0: mitte,
    oben0: mitte - luecke / 2,               // Oberkante der freien Lücke (ohne Schweben)
    unten0: mitte + luecke / 2,              // Unterkante der freien Lücke (ohne Schweben)
    amp, frq, phase,
    versatz: 0,
    oben: 0,
    unten: 0,
    gezaehlt: false,
    muenze: k.muenzen.includes(i),
    geholt: false,
    saat: Math.floor(z() * 1e9),             // nur für Farben und Aufkleber
  };
  bewegeHindernis(h, s.flugzeit);
  s.hindernisse.push(h);
  if (s.erzeugt >= k.anzahl) s.zielX = x + b + 70;
  return true;
}

// Hält genug Hindernisse vor der Figur bereit und räumt hinten auf
function fuelleHindernisse(s) {
  while (s.erzeugt < s.konfig.anzahl && (!s.hindernisse.length || s.hindernisse[s.hindernisse.length - 1].x < s.strecke + K.BREITE + K.ABSTAND)) {
    erzeugeHindernis(s);
  }
  while (s.hindernisse.length && s.hindernisse[0].x + s.hindernisse[0].b < s.strecke - 40) s.hindernisse.shift();
}

function neuStart(s, saat) {
  const k = s.konfig;
  waehle(s, k);
  s.zustand = ZUSTAND.SPIELEN;
  s.letzte = { mitte: K.FIGUR_START_Y, luecke: k.luecke(0), amp: 0 };
  const startwert = k.saat !== null ? k.saat : (saat === undefined ? (Date.now() ^ 0x5eed) : saat);
  s.rng = zufallsGenerator(startwert);
  s.windPlan = erstelleWindPlan(startwert, k.wind);
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
    default: return null;   // in der Pause zählt nur „Weiter“, im Ziel die Knöpfe
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
// Stapel unten von der Lücke bis ins Wasser.
function trifftHindernis(t, h) {
  const l = h.x + K.HINDERNIS_EINZUG;
  const r = h.x + h.b - K.HINDERNIS_EINZUG;
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

// Wo liegt der Stern eines Hindernisses gerade?
function sternPos(h) { return { x: h.x + h.b / 2, y: (h.oben + h.unten) / 2 }; }

function aktuellesTempo(s) {
  if (s.zustand !== ZUSTAND.SPIELEN && s.zustand !== ZUSTAND.ZIEL) return 0;
  return s.konfig.tempo(Math.min(s.punkte, s.konfig.anzahl - 1));
}

function schritt(s, dt) {
  s.zeit += dt;
  s.vorher.y = s.figur.y;
  s.vorher.strecke = s.strecke;

  if (s.zustand === ZUSTAND.ENDE) { s.unfall.zeit += dt; return; }
  if (s.zustand === ZUSTAND.ZIEL) {
    // Ausflug nach dem Ziel: keine Hindernisse mehr, Figur gleitet in die Mitte
    s.ziel.zeit += dt;
    s.flugzeit += dt;
    s.strecke += aktuellesTempo(s) * dt;
    s.figur.vy = 0;
    s.figur.schub += dt;
    s.figur.y += (K.FIGUR_START_Y - s.figur.y) * Math.min(1, dt * 2.5);
    for (const h of s.hindernisse) if (h.amp) bewegeHindernis(h, s.flugzeit);
    return;
  }
  if (s.zustand !== ZUSTAND.SPIELEN) return;

  s.flugzeit += dt;
  const wind = windBei(s, s.flugzeit);
  const f = s.figur;
  f.schub += dt;
  f.vy = Math.min(f.vy + (K.SCHWERKRAFT + wind.a) * dt, K.MAX_FALL);
  f.y += f.vy * dt;
  s.strecke += aktuellesTempo(s) * dt;
  fuelleHindernisse(s);
  for (const h of s.hindernisse) if (h.amp) bewegeHindernis(h, s.flugzeit);

  // Sterne einsammeln (vor der Kollision: wer ihn berührt, hat ihn)
  const fx = s.strecke + K.FIGUR_X;
  for (const h of s.hindernisse) {
    if (!h.muenze || h.geholt) continue;
    const p = sternPos(h);
    // Abstand vom Sternmittelpunkt zum nächsten Punkt der Figur-Fläche
    const dx = Math.max(Math.abs(p.x - fx) - K.STERN_FIGUR_B / 2, 0);
    const dy = Math.max(Math.abs(p.y - f.y) - K.STERN_FIGUR_H / 2, 0);
    if (dx * dx + dy * dy < K.STERN_RADIUS ** 2) {
      h.geholt = true;
      s.sterne++;
      s.ereignisse.push({ typ: 'stern', sterne: s.sterne, x: p.x - s.strecke, y: p.y });
    }
  }

  const art = pruefeKollision(s);
  if (art) { unfall(s, art); return; }

  // Punkt erst, wenn die Trefferfläche das Hindernis ganz hinter sich hat; jedes Paar nur einmal
  const links = s.strecke + K.FIGUR_X - K.TREFFER_B / 2;
  for (const h of s.hindernisse) {
    if (!h.gezaehlt && links > h.x + h.b) {
      h.gezaehlt = true;
      s.punkte++;
      s.ereignisse.push({ typ: 'punkt', punkte: s.punkte });
    }
  }

  if (s.punkte >= s.konfig.anzahl) {
    s.zustand = ZUSTAND.ZIEL;
    s.ziel = { zeit: 0 };
    s.ereignisse.push({ typ: 'ziel', sterne: s.sterne });
  }
}
