'use strict';
// ===================================================================
// 1 · EINSTELLUNGEN
// Alle Werte zum Abstimmen an einer Stelle. Alles ist in logischen
// Spielkoordinaten angegeben: Das Spielfeld ist immer 360 × 640 groß,
// egal wie groß der Bildschirm ist. Zeiten in Sekunden, Tempo in
// Spielpunkten pro Sekunde.
// ===================================================================

const K = {
  BREITE: 360,
  HOEHE: 640,

  // ---- Zeit ----
  SCHRITT: 1 / 120,          // fester Simulationsschritt (unabhängig von der Bildrate)
  MAX_FRAME: 0.1,            // längere Lücken zwischen zwei Bildern werden gekappt
  MAX_SCHRITTE: 24,          // höchstens so viele Schritte pro Bild

  // ---- Spielfeldgrenzen ----
  DECKE: 14,                 // Unterkante der Kranbahn oben = obere Spielgrenze
  WASSER: 584,               // Wasseroberfläche = untere Spielgrenze

  // ---- Figur ----
  FIGUR_X: 104,              // Mitte der Figur, bleibt im linken Drittel
  FIGUR_START_Y: 300,
  TREFFER_B: 22,             // Trefferfläche (kleiner als die sichtbare Figur von etwa 34 × 48)
  TREFFER_H: 26,

  // ---- Flugphysik ----
  SCHWERKRAFT: 1450,         // Beschleunigung nach unten
  IMPULS: -415,              // ein Tipp SETZT die Geschwindigkeit auf diesen Wert (nicht addieren)
  MAX_FALL: 540,             // höchste Fallgeschwindigkeit

  // ---- Hindernisse ----
  HINDERNIS_B: 64,           // Breite aller Container und Anlagen
  ABSTAND: 215,              // Abstand von Hindernis zu Hindernis (linke Kanten)
  ANFLUG: 430,               // erstes Hindernis so weit rechts von der Figur → ca. 3 s freier Anflug
  HINDERNIS_EINZUG: 2,       // Trefferfläche der Hindernisse links und rechts so viel schmaler
  LUECKE_OBEN_MIN: 70,       // Lücke beginnt frühestens hier (Abstand zur Kranbahn)
  LUECKE_UNTEN_MAX: 520,     // Lücke endet spätestens hier (Abstand zum Wasser)
  SEIL: 12,                  // Kranseile zwischen Kranbahn und Spreizer (nur Deko, kein Hindernis)
  SPREIZER: 6,               // gelber Greifrahmen über den hängenden Containern
  PIER: 22,                  // Betonsockel unter den Containerstapeln
  CONTAINER_H: 32,           // gewünschte Containerhöhe (wird passend gestreckt)

  // ---- Schwierigkeit (steigt mit den Punkten, ist nach oben begrenzt) ----
  TEMPO_START: 125,
  TEMPO_PRO_PUNKT: 1.6,
  TEMPO_MAX: 178,            // erreicht bei etwa 33 Punkten
  LUECKE_START: 178,
  LUECKE_PRO_PUNKT: 1.1,
  LUECKE_MIN: 140,           // erreicht bei etwa 35 Punkten
  VERSATZ_START: 60,         // größter Höhenunterschied zweier Lücken am Anfang
  VERSATZ_PRO_PUNKT: 5,
  VERSATZ_MAX: 180,
  RUHIGE_HINDERNISSE: 2,     // die ersten Lücken liegen fast mittig

  // ---- Fairness ----
  // Der erlaubte Höhenunterschied wird aus der echten Flugphysik berechnet:
  // Wie weit kommt man hoch, wenn man bequem alle FAIR_TIPP_ABSTAND Sekunden tippt,
  // in der Zeit zwischen zwei Hindernissen? Davon nur FAIR_FAKTOR als Reserve.
  FAIR_TIPP_ABSTAND: 0.28,
  FAIR_FAKTOR: 0.75,
  FAIR_SICHERHEIT: 10,       // Abstand zur Lückenkante, der als Reserve bleibt

  // ---- Ablauf ----
  SPERRE_NACH_UNFALL: 0.32,  // so lange werden Eingaben nach einem Unfall ignoriert
  SCHUB_POSE: 0.16,          // so lange zeigt die Figur nach einem Tipp „Beine hoch“

  // ---- Effekte ----
  MAX_PARTIKEL: 90,
};
