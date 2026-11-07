// ===================================================================
// 2 · LEVEL, GEBIETE UND SCHWIERIGKEIT
// Jedes Level hat einen festen Aufbau (fester Startwert): Wer scheitert,
// fliegt beim nächsten Versuch durch dieselben Lücken und kann lernen.
// Werte als [Anfang, Ende] steigen innerhalb des Levels gleichmäßig an.
// Was davon wirklich fair ist, rechnet die Logik aus der Flugphysik nach
// (erlaubterVersatz) – die Werte hier sind nur Obergrenzen.
// ===================================================================

const GEBIETE = [
  { name: 'Sonnenhafen', text: 'Blauer Himmel, frische Brise. Zum Warmfliegen.', neu: '' },
  { name: 'Werft im Nebel', text: 'Die Kräne heben und senken ihre Lasten.', neu: 'Schwebende Container' },
  { name: 'Abendmarkt', text: 'Lange Container: Höhe halten!', neu: 'Container-Tunnel' },
  { name: 'Nachthafen', text: 'Schneller, enger, dunkler.', neu: 'Alles zusammen' },
  { name: 'Sturmküste', text: 'Windböen drücken dich hoch oder runter.', neu: 'Windböen' },
  { name: 'Eishafen', text: 'Kalte Luft, dichter Verkehr.', neu: 'Enge Abstände' },
  { name: 'Hafenfest', text: 'Das große Finale unterm Feuerwerk.', neu: 'Alles auf einmal' },
];

// n = Anzahl der Hindernispaare bis zum Ziel
// tempo, luecke, versatz = [Anfang, Ende]; abstand = Abstand der Hindernisse (Standard 215)
// bewegt = Anteil schwebender Container, amp = wie weit sie schweben [Anfang, Ende]
// lang = Anteil langer Container (Tunnel), wind = Stärke der Böen (0 = kein Wind)
const LEVEL = [
  // ---- 1 · Sonnenhafen ----
  { g: 0, name: 'Erster Hopser', n: 8, tempo: [118, 124], luecke: [192, 182], versatz: [30, 60] },
  { g: 0, name: 'Kistenslalom', n: 12, tempo: [122, 132], luecke: [184, 172], versatz: [45, 85] },
  { g: 0, name: 'Hafenrundflug', n: 15, tempo: [126, 142], luecke: [176, 162], versatz: [60, 115] },
  { g: 0, name: 'Möwenkurs', n: 18, tempo: [130, 150], luecke: [170, 155], versatz: [80, 135] },
  { g: 0, name: 'Großer Kai', n: 22, tempo: [134, 158], luecke: [165, 148], versatz: [90, 155] },
  // ---- 2 · Werft im Nebel: schwebende Container ----
  { g: 1, name: 'Schwebende Last', n: 12, tempo: [128, 136], luecke: [182, 172], versatz: [40, 75], bewegt: 0.6, amp: [14, 20] },
  { g: 1, name: 'Hoch und runter', n: 15, tempo: [130, 144], luecke: [176, 166], versatz: [55, 100], bewegt: 0.75, amp: [18, 26] },
  { g: 1, name: 'Nebelkräne', n: 18, tempo: [134, 150], luecke: [172, 160], versatz: [65, 120], bewegt: 0.8, amp: [20, 30] },
  { g: 1, name: 'Helling', n: 20, tempo: [136, 154], luecke: [168, 155], versatz: [75, 130], bewegt: 0.85, amp: [22, 34] },
  { g: 1, name: 'Stapellauf', n: 24, tempo: [140, 160], luecke: [164, 150], versatz: [85, 150], bewegt: 0.9, amp: [24, 38] },
  // ---- 3 · Abendmarkt: lange Container ----
  { g: 2, name: 'Lange Kisten', n: 12, tempo: [128, 138], luecke: [184, 174], versatz: [40, 75], lang: 0.45 },
  { g: 2, name: 'Tunnelblick', n: 15, tempo: [130, 144], luecke: [180, 168], versatz: [50, 95], lang: 0.5 },
  { g: 2, name: 'Markthallen', n: 18, tempo: [136, 152], luecke: [174, 160], versatz: [65, 120], lang: 0.5, bewegt: 0.3, amp: [18, 22] },
  { g: 2, name: 'Lampionkette', n: 20, tempo: [138, 156], luecke: [170, 156], versatz: [75, 130], lang: 0.55, bewegt: 0.4, amp: [20, 26] },
  { g: 2, name: 'Fischauktion', n: 24, tempo: [142, 162], luecke: [166, 150], versatz: [85, 150], lang: 0.6, bewegt: 0.45, amp: [22, 30] },
  // ---- 4 · Nachthafen: alles zusammen, schneller ----
  { g: 3, name: 'Laternenlicht', n: 15, tempo: [140, 150], luecke: [174, 160], versatz: [70, 110], lang: 0.3, bewegt: 0.4, amp: [18, 24] },
  { g: 3, name: 'Mondschein', n: 18, tempo: [144, 158], luecke: [168, 155], versatz: [80, 130], bewegt: 0.6, amp: [22, 30], abstand: 205 },
  { g: 3, name: 'Nachtschicht', n: 20, tempo: [148, 164], luecke: [162, 150], versatz: [90, 140], lang: 0.4, bewegt: 0.5, amp: [22, 30] },
  { g: 3, name: 'Leuchtfeuer', n: 22, tempo: [150, 168], luecke: [158, 146], versatz: [100, 150], lang: 0.3, bewegt: 0.5, amp: [24, 32], abstand: 200 },
  { g: 3, name: 'Mitternacht', n: 26, tempo: [152, 172], luecke: [155, 142], versatz: [110, 165], lang: 0.4, bewegt: 0.6, amp: [26, 36], abstand: 205 },
  // ---- 5 · Sturmküste: Windböen ----
  { g: 4, name: 'Erste Böe', n: 14, tempo: [130, 140], luecke: [186, 176], versatz: [40, 80], wind: 220 },
  { g: 4, name: 'Gegenwind', n: 18, tempo: [136, 150], luecke: [174, 162], versatz: [65, 115], wind: 300 },
  { g: 4, name: 'Brandung', n: 21, tempo: [140, 158], luecke: [168, 155], versatz: [75, 130], wind: 330, bewegt: 0.4, amp: [18, 26] },
  { g: 4, name: 'Sturmflut', n: 25, tempo: [144, 164], luecke: [162, 148], versatz: [85, 150], wind: 360, lang: 0.3, bewegt: 0.4, amp: [20, 30] },
  // ---- 6 · Eishafen: enge Abstände ----
  { g: 5, name: 'Frostflug', n: 16, tempo: [140, 154], luecke: [170, 158], versatz: [70, 120], abstand: 200, bewegt: 0.4, amp: [18, 26] },
  { g: 5, name: 'Eisschollen', n: 20, tempo: [144, 160], luecke: [164, 152], versatz: [80, 135], abstand: 198, lang: 0.4 },
  { g: 5, name: 'Schneegestöber', n: 23, tempo: [148, 165], luecke: [160, 148], versatz: [90, 145], abstand: 200, wind: 300, bewegt: 0.4, amp: [20, 28] },
  { g: 5, name: 'Polarnacht', n: 26, tempo: [150, 170], luecke: [156, 144], versatz: [100, 160], abstand: 195, lang: 0.3, bewegt: 0.5, amp: [22, 32] },
  // ---- 7 · Hafenfest: Finale ----
  { g: 6, name: 'Lampionflug', n: 20, tempo: [146, 162], luecke: [164, 152], versatz: [85, 140], lang: 0.3, bewegt: 0.4, amp: [20, 28] },
  { g: 6, name: 'Feuerwerk', n: 24, tempo: [150, 168], luecke: [158, 147], versatz: [95, 150], wind: 300, bewegt: 0.4, amp: [22, 30] },
  { g: 6, name: 'Festumzug', n: 28, tempo: [154, 174], luecke: [154, 143], versatz: [105, 160], wind: 320, lang: 0.35, bewegt: 0.5, amp: [24, 34], abstand: 205 },
  { g: 6, name: 'Großes Finale', n: 34, tempo: [156, 178], luecke: [152, 140], versatz: [115, 170], wind: 340, lang: 0.4, bewegt: 0.55, amp: [24, 36], abstand: 200 },
];
LEVEL.forEach((l, i) => { l.nr = i + 1; });

// Schwierigkeitsgrade gelten für Level und Endlos-Flug
const STUFEN = {
  leicht: { name: 'Gemütlich', luecke: 24, tempo: 0.9, versatz: 0.8, kraft: 0.7 },
  normal: { name: 'Normal', luecke: 0, tempo: 1, versatz: 1, kraft: 1 },
  schwer: { name: 'Profi', luecke: -12, tempo: 1.08, versatz: 1.12, kraft: 1.15 },
};
const STUFEN_REIHE = ['leicht', 'normal', 'schwer'];

function levelEbene(nr) { return LEVEL[nr - 1] || null; }
function erstesLevelImGebiet(g) { return LEVEL.find(l => l.g === g).nr; }
function letztesLevelImGebiet(g) { let n = 0; for (const l of LEVEL) if (l.g === g) n = l.nr; return n; }
