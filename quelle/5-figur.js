// ===================================================================
// 5 · FIGUR
// Der Hafenhopser, in voller Bildschirmauflösung gezeichnet: weiche Formen
// mit dickem dunklem Umriss, damit er auch klein klar zu erkennen ist.
// Koordinaten in Spielpunkten, (0|0) = Mitte der Trefferfläche.
// Die Figur schaut nach rechts; der Raketenrucksack sitzt auf dem Rücken (links).
// Jede Pose wird pro Bildschirmmaßstab einmal gemalt und zwischengespeichert.
// ===================================================================

const Figur = (() => {
  // Malfläche um den Mittelpunkt (in Spielpunkten)
  const W = 56;
  const H = 62;
  const ANKER = { x: 29, y: 29 };
  // Düse des Rucksacks relativ zum Mittelpunkt (für Funken und Rauch)
  const DUESE = { x: -16, y: 17 };
  const UMRISS = 2.2;
  const GROESSE = 1.1;   // Figur etwas größer zeichnen als die Grundmaße (Trefferfläche bleibt gleich)

  const F = {
    navy: '#10243A',
    kappe: '#24D6CD', kappeD: '#129BA8', kappeL: '#A6F7F1', band: '#2E7FC8', bandL: '#62B4EE',
    haut: '#F7C49B', hautD: '#DE9770', wange: '#FF9A82', haar: '#6B4A3A',
    gelb: '#FFD35A', gelbD: '#E5A33A', gelbL: '#FFF4B8',
    metall: '#A9BCD0', metallD: '#61748C', rost: '#FF805B', tuerkis: '#24D6CD', creme: '#FFF4DC',
    hose: '#2E4E80', hoseD: '#22395E',
    stiefel: '#FF805B', stiefelD: '#C9553A', stiefelL: '#FFB59E',
    stiefel2: '#E5664A', stiefel2D: '#A6432F', stiefel2L: '#F79A82',
    weiss: '#FFFFFF',
  };

  // Füllen und mit dunklem Umriss nachziehen
  function form(g, farbe, umriss = UMRISS) {
    g.fillStyle = farbe;
    g.fill();
    if (umriss) {
      g.lineWidth = umriss;
      g.strokeStyle = F.navy;
      g.stroke();
    }
  }
  function kreis(g, x, y, r, farbe, umriss = UMRISS) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    form(g, farbe, umriss);
  }
  function rundRechteck(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function strich(g, x1, y1, x2, y2, breite, farbe) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineCap = 'round';
    g.lineWidth = breite;
    g.strokeStyle = farbe;
    g.stroke();
  }

  // ---------- Teile ----------
  function rucksack(g) {
    // krummes Auspuffrohr
    rundRechteck(g, -20, -16, 4.5, 10, 1.2); form(g, F.metallD);
    rundRechteck(g, -21.5, -17.5, 7.5, 3, 1.2); form(g, F.rost);
    // Düse
    g.beginPath();
    g.moveTo(-20.5, 11); g.lineTo(-11.5, 11); g.lineTo(-13, 17); g.lineTo(-19, 17); g.closePath();
    form(g, F.metallD);
    g.fillStyle = F.rost; g.fillRect(-18, 15, 4, 1.6);
    // Gehäuse
    rundRechteck(g, -24, -8, 15, 20, 3.5);
    g.save(); g.clip();
    g.fillStyle = F.metall; g.fillRect(-24, -8, 15, 20);
    g.fillStyle = F.metallD; g.fillRect(-24, -8, 3, 20);
    g.fillStyle = F.rost; g.fillRect(-24, 1, 15, 3);
    g.fillStyle = F.tuerkis; g.fillRect(-24, 7, 15, 2);
    g.restore();
    rundRechteck(g, -24, -8, 15, 20, 3.5); form(g, 'rgba(0,0,0,0)');
    kreis(g, -16.5, -3.5, 2.3, F.tuerkis, 1.4);
    kreis(g, -17.2, -4.2, 0.8, F.weiss, 0);
    kreis(g, -11.5, -5.5, 0.9, F.creme, 0);
    kreis(g, -11.5, 9.5, 0.9, F.creme, 0);
  }

  function stiefel(g, x, y, hinten) {
    const a = hinten ? F.stiefel2 : F.stiefel;
    const d = hinten ? F.stiefel2D : F.stiefelD;
    const l = hinten ? F.stiefel2L : F.stiefelL;
    // Schaft und viel zu große Spitze als eine Form
    g.beginPath();
    g.moveTo(x - 4.5, y - 8);
    g.lineTo(x + 3.5, y - 8);
    g.lineTo(x + 3.5, y - 3.5);
    g.quadraticCurveTo(x + 11, y - 3.8, x + 11, y + 0.5);
    g.lineTo(x + 11, y + 1.2);
    g.quadraticCurveTo(x + 11, y + 3, x + 9, y + 3);
    g.lineTo(x - 3.5, y + 3);
    g.quadraticCurveTo(x - 5, y + 3, x - 5, y + 1.5);
    g.closePath();
    g.save(); g.clip();
    g.fillStyle = a; g.fillRect(x - 6, y - 9, 18, 13);
    g.fillStyle = d; g.fillRect(x - 6, y + 1.2, 18, 2);
    g.fillStyle = l; g.fillRect(x - 6, y - 8, 18, 2.2);
    g.restore();
    g.lineWidth = UMRISS; g.strokeStyle = F.navy; g.stroke();
    kreis(g, x + 7.5, y - 1, 1, 'rgba(255,255,255,0.8)', 0);
  }

  function bein(g, hx, hy, fx, fy, hinten) {
    strich(g, hx, hy, fx, fy, 6.6, F.navy);
    strich(g, hx, hy, fx, fy, 4.2, hinten ? F.hoseD : F.hose);
  }

  const BEINE = {
    normal: [[-6, 24], [5, 24]],
    hoch: [[-11, 19], [-1, 20]],
    flattern0: [[-5, 26], [6, 21]],
    flattern1: [[-8, 21], [4, 26]],
  };

  function beine(g, art) {
    const [hinten, vorn] = BEINE[art] || BEINE.normal;
    bein(g, -3, 12, hinten[0], hinten[1] - 7, true);
    stiefel(g, hinten[0], hinten[1], true);
    bein(g, 4, 12, vorn[0], vorn[1] - 7, false);
    stiefel(g, vorn[0], vorn[1], false);
  }

  function jacke(g, flattern) {
    g.beginPath();
    g.moveTo(-5, -7);
    g.bezierCurveTo(-14, -5, -15, 8, -13, 14);
    if (flattern === 1) { g.lineTo(-16, 18); g.lineTo(-6, 16); g.lineTo(5, 16.5); g.lineTo(14, 15); }
    else { g.lineTo(-12, 16.5); g.lineTo(-2, 17); g.lineTo(8, 16); g.lineTo(16, 18.5); g.lineTo(14, 14); }
    g.bezierCurveTo(16, 6, 15, -5, 9, -7);
    g.closePath();
    g.save(); g.clip();
    g.fillStyle = F.gelb; g.fillRect(-18, -9, 36, 30);
    g.fillStyle = F.gelbD;
    g.beginPath(); g.ellipse(-14, 9, 8, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(-18, 14, 36, 6);
    g.fillStyle = F.gelbL;
    g.beginPath(); g.ellipse(11, -1, 2.2, 4.5, -0.3, 0, Math.PI * 2); g.fill();
    g.restore();
    g.lineWidth = UMRISS; g.strokeStyle = F.navy; g.stroke();
    // Knopfleiste, Knöpfe, Tasche, Rucksackgurt
    g.beginPath(); g.moveTo(8, -4); g.quadraticCurveTo(9.5, 6, 8.5, 15.5);
    g.lineWidth = 1.3; g.strokeStyle = F.gelbD; g.stroke();
    kreis(g, 10.5, 2, 1.1, F.creme, 0.9);
    kreis(g, 10.5, 8.5, 1.1, F.creme, 0.9);
    strich(g, -3, 9, 3, 9, 1.4, F.gelbD);
    strich(g, -6, -5, -8, 9, 2.4, F.metallD);
  }

  function kopf(g, gesicht) {
    kreis(g, -2.5, -11, 2.4, F.hautD);              // Ohr
    kreis(g, 4, -11, 8.6, F.haut);
    kreis(g, 12.3, -9.8, 2.5, F.haut);              // Nase
    kreis(g, 12.8, -10.5, 0.7, 'rgba(255,255,255,0.7)', 0);
    // Bartstoppeln
    g.fillStyle = F.hautD;
    for (const [x, y] of [[2, -4.2], [4.5, -3.6], [7, -3.8], [9.5, -4.4]]) g.fillRect(x, y, 1, 1);
    kreis(g, 1, -7.5, 1.6, 'rgba(255,128,100,0.45)', 0);   // Wange

    if (gesicht === 'verdutzt') {
      kreis(g, 3.6, -11.6, 2.8, F.weiss, 1.4);
      kreis(g, 9.6, -11.6, 2.6, F.weiss, 1.4);
      kreis(g, 4.6, -12.4, 1.2, F.navy, 0);         // Pupillen schielen
      kreis(g, 8.8, -10.8, 1.2, F.navy, 0);
      g.beginPath(); g.moveTo(1, -16.3); g.quadraticCurveTo(3.6, -18.2, 6, -16.6);
      g.lineWidth = 1.6; g.strokeStyle = F.navy; g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.moveTo(7.6, -16.6); g.quadraticCurveTo(10, -18.2, 12, -16.3); g.stroke();
      kreis(g, 7.5, -5.6, 1.8, F.haar, 1.3);         // „Oh!“-Mund
    } else {
      // Übertrieben ernst: schräge, tiefe Augenbrauen, entschlossene Augen, gerader Mund
      g.beginPath(); g.ellipse(3.9, -10.8, 2.2, 1.9, 0, 0, Math.PI * 2); g.fillStyle = F.weiss; g.fill();
      g.lineWidth = 1; g.strokeStyle = F.navy; g.stroke();
      g.beginPath(); g.ellipse(9.6, -10.8, 2.1, 1.9, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      kreis(g, 4.8, -10.6, 1.35, F.navy, 0);
      kreis(g, 10.4, -10.6, 1.35, F.navy, 0);
      strich(g, 0.8, -15.2, 6, -12.8, 2.8, F.navy);
      strich(g, 7.4, -12.8, 12.2, -15, 2.8, F.navy);
      strich(g, 5, -5.8, 10.4, -6.2, 1.7, F.navy);
    }
  }

  function kragen(g) {
    g.beginPath();
    g.moveTo(-5, -5); g.lineTo(-3, -1); g.lineTo(3, -0.4); g.lineTo(-1, -3.6); g.closePath();
    form(g, F.gelb, 1.6);
    g.beginPath();
    g.moveTo(11, -4.4); g.lineTo(10, -0.6); g.lineTo(5, -0.4); g.lineTo(8, -3.2); g.closePath();
    form(g, F.gelb, 1.6);
  }

  function arm(g, hoch) {
    const hx = 16;
    const hy = hoch ? 2 : 8;
    strich(g, 3, 2, hx - 1, hy, 7.6, F.navy);
    strich(g, 3, 2, hx - 1, hy, 5, F.gelb);
    strich(g, hx - 3.5, hy - 0.3, hx - 2.3, hy, 5, F.gelbD);
    kreis(g, hx + 0.6, hy, 2.8, F.haut, 1.8);       // Faust
  }

  function muetze(g, dy, schief) {
    g.save();
    if (schief) {
      // Mütze rutscht schief nach vorn, die Haare kommen zum Vorschein
      kreis(g, -1.5, -17, 2.2, F.haar, 1.4);
      kreis(g, 1.5, -18.6, 2.2, F.haar, 1.4);
      g.translate(7, -12.5);
      g.rotate(0.42);
      g.translate(-4, 12);
    } else {
      g.translate(0, dy);
    }
    // Zipfel
    kreis(g, 4.5, -23, 1.8, F.kappeD, 1.6);
    // Kuppel
    g.beginPath();
    g.moveTo(-5.4, -14);
    g.bezierCurveTo(-5.4, -25, 13.4, -25, 13.4, -14);
    g.closePath();
    g.save(); g.clip();
    g.fillStyle = F.kappe; g.fillRect(-7, -26, 22, 13);
    g.fillStyle = F.kappeD; g.fillRect(-7, -26, 4.2, 13);
    g.fillStyle = F.kappeL;
    g.beginPath(); g.ellipse(5, -20.4, 3, 1.4, -0.2, 0, Math.PI * 2); g.fill();
    g.restore();
    g.lineWidth = UMRISS; g.strokeStyle = F.navy; g.stroke();
    // Umschlag-Band
    rundRechteck(g, -6.2, -15.6, 20.4, 4.6, 2);
    g.save(); g.clip();
    g.fillStyle = F.band; g.fillRect(-7, -16, 22, 6);
    g.fillStyle = F.bandL; g.fillRect(-7, -16, 22, 1.6);
    g.restore();
    rundRechteck(g, -6.2, -15.6, 20.4, 4.6, 2); form(g, 'rgba(0,0,0,0)');
    // kleines Anker-Etikett
    rundRechteck(g, 7.4, -14.8, 3.6, 3, 0.6); form(g, F.creme, 1);
    g.restore();
  }

  // Malt eine Pose in einen fertigen Ausschnitt mit Maßstab sk (Bildpunkte pro Spielpunkt)
  // pose: { beine, kappeDy, jacke, gesicht: 'ernst'|'verdutzt', schief }
  function male(pose, sk) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * GROESSE * sk);
    c.height = Math.ceil(H * GROESSE * sk);
    const g = c.getContext('2d');
    g.scale(sk * GROESSE, sk * GROESSE);
    g.translate(ANKER.x, ANKER.y);
    g.lineJoin = 'round';
    rucksack(g);
    beine(g, pose.beine);
    jacke(g, pose.jacke || 0);
    kopf(g, pose.gesicht);
    kragen(g);
    muetze(g, pose.kappeDy ? pose.kappeDy * 1.6 : 0, !!pose.schief);
    arm(g, pose.beine === 'hoch');
    return c;
  }

  const speicher = new Map();
  let speicherSk = 0;
  function schluessel(p) {
    return `${p.beine}|${p.kappeDy || 0}|${p.jacke || 0}|${p.gesicht}|${p.schief ? 1 : 0}`;
  }

  // Liefert die Pose für den Bildschirmmaßstab sk (Bildpunkte pro Spielpunkt)
  function bild(pose, sk) {
    sk = Math.round(sk * 100) / 100;
    if (sk !== speicherSk) { speicher.clear(); speicherSk = sk; }
    const key = schluessel(pose);
    let c = speicher.get(key);
    if (!c) { c = male(pose, sk); speicher.set(key, c); }
    return c;
  }

  return {
    W: W * GROESSE, H: H * GROESSE,
    ANKER: { x: ANKER.x * GROESSE, y: ANKER.y * GROESSE },
    DUESE: { x: DUESE.x * GROESSE, y: DUESE.y * GROESSE },
    F, bild,
  };
})();
