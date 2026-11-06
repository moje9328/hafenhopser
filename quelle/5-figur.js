// ===================================================================
// 5 · FIGUR
// Der Hafenhopser als selbst gezeichnete Pixelgrafik (27 × 34 Kunstpixel).
// Jede Pose wird einmal gemalt, mit Umriss versehen und dann in der
// passenden Bildschirmauflösung zwischengespeichert.
// Die Figur schaut nach rechts; der Raketenrucksack sitzt auf dem Rücken (links).
// ===================================================================

const Figur = (() => {
  const W = 27;
  const H = 34;
  const OX = 1;
  const OY = 2;
  // Mittelpunkt der Trefferfläche in Kunstpixeln (Bauch der Jacke)
  const ANKER = { x: 15.5, y: 18 };
  // Düse des Rucksacks (für Funken und Rauch)
  const DUESE = { x: 7, y: 26 };

  const F = {
    navy: '#10243A',
    kappe: '#24D6CD', kappeD: '#139AA8', kappeL: '#9BF5EF', band: '#2E7FC8', bandL: '#5BAEEB',
    haut: '#F6C198', hautD: '#DB9670', wange: '#FF9A82', haar: '#6B4A3A',
    gelb: '#FFD35A', gelbD: '#E3A43B', gelbL: '#FFF1A8',
    metall: '#A3B6CA', metallD: '#61748C', rost: '#FF805B', tuerkis: '#24D6CD', creme: '#FFF4DC',
    hose: '#2B4A7A', hoseD: '#1E355C',
    stiefel: '#FF805B', stiefelD: '#C9553A', stiefelL: '#FFB59E',
    stiefel2: '#E8694A', stiefel2D: '#A9442F', stiefel2L: '#F79A82',
    weiss: '#FFFFFF',
  };

  function leinwand(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // Malt eine Pose in Originalgröße (1 Kunstpixel = 1 Bildpunkt)
  // pose: { beine: 'normal'|'hoch'|'flattern0'|'flattern1', kappeDy: 0|-1, jacke: 0|1,
  //         gesicht: 'ernst'|'verdutzt', schief: bool }
  function male(pose) {
    const c = leinwand(W, H);
    const g = c.getContext('2d');
    const r = (x, y, w, h, farbe) => { g.fillStyle = farbe; g.fillRect(x + OX, y + OY, w, h); };

    // ---------- Raketenrucksack (alte Hafenmaschine) ----------
    r(3, 9, 2, 3, F.metallD);            // krummes Auspuffrohr
    r(2, 9, 4, 1, F.rost);
    r(2, 12, 7, 10, F.metall);
    r(2, 12, 1, 10, F.metallD);
    r(2, 21, 7, 1, F.metallD);
    r(2, 15, 7, 1, F.rost);              // Warnstreifen
    r(2, 18, 7, 1, F.tuerkis);
    r(4, 13, 2, 1, F.tuerkis);           // Kontrolllämpchen
    r(8, 13, 1, 1, F.creme);             // Nieten
    r(8, 19, 1, 1, F.creme);
    r(4, 22, 4, 2, F.metallD);           // Düse
    r(5, 23, 2, 1, F.rost);

    // ---------- Beine und viel zu große Gummistiefel ----------
    const bein = (x, y, h) => { r(x, y, 2, h, F.hose); r(x, y, 1, h, F.hoseD); };
    const stiefel = (x, y, hinten) => {
      const a = hinten ? F.stiefel2 : F.stiefel;
      const d = hinten ? F.stiefel2D : F.stiefelD;
      const l = hinten ? F.stiefel2L : F.stiefelL;
      r(x, y, 4, 1, l);                  // Stulpe
      r(x, y + 1, 4, 1, a);
      r(x, y + 2, 6, 1, a);              // Spitze ragt nach vorn
      r(x, y + 3, 6, 1, d);              // Sohle
      r(x + 4, y + 2, 1, 1, l);          // Glanzpunkt
    };
    switch (pose.beine) {
      case 'hoch':      // Beine zucken beim Schub nach oben
        bein(10, 23, 1); stiefel(7, 24, true);
        bein(15, 23, 1); stiefel(12, 24, false);
        break;
      case 'flattern0':
        bein(10, 23, 4); stiefel(9, 27, true);
        bein(15, 23, 2); stiefel(14, 25, false);
        break;
      case 'flattern1':
        bein(10, 23, 2); stiefel(8, 25, true);
        bein(15, 23, 4); stiefel(15, 27, false);
        break;
      default:
        bein(10, 23, 3); stiefel(9, 26, true);
        bein(15, 23, 3); stiefel(14, 26, false);
    }

    // ---------- Große gelbe Regenjacke ----------
    r(10, 11, 8, 1, F.gelb);
    r(8, 12, 12, 1, F.gelb);
    r(7, 13, 14, 10, F.gelb);
    if (pose.jacke === 1) r(7, 23, 5, 1, F.gelbD);   // Saum flattert hinten
    else r(15, 23, 5, 1, F.gelbD);                    // oder vorne
    r(7, 14, 3, 9, F.gelbD);
    r(7, 22, 14, 1, F.gelbD);
    r(16, 12, 2, 1, F.gelbL);
    r(17, 13, 2, 2, F.gelbL);
    r(18, 15, 1, 7, F.gelbD);            // Knopfleiste
    r(19, 16, 1, 1, F.creme);
    r(19, 19, 1, 1, F.creme);
    r(11, 19, 4, 1, F.gelbD);            // Taschenklappe
    r(9, 12, 1, 6, F.metallD);           // Rucksackgurt
    // Arm mit Faust (beim Schub etwas angehoben)
    const ay = pose.beine === 'hoch' ? -2 : 0;
    r(15, 16 + ay, 6, 3, F.gelb);
    r(15, 18 + ay, 6, 1, F.gelbD);
    r(20, 16 + ay, 1, 3, F.gelbD);
    r(21, 16 + ay, 2, 3, F.haut);
    r(21, 18 + ay, 2, 1, F.hautD);

    // ---------- Kopf ----------
    r(11, 4, 7, 1, F.haut);
    r(10, 5, 9, 6, F.haut);
    r(11, 11, 7, 1, F.haut);
    r(19, 7, 1, 2, F.haut);              // Nase
    r(19, 8, 1, 1, F.hautD);
    r(11, 7, 1, 2, F.hautD);             // Ohr
    r(12, 11, 1, 1, F.hautD);            // Bartstoppeln
    r(14, 11, 1, 1, F.hautD);
    r(16, 11, 1, 1, F.hautD);
    r(10, 10, 3, 2, F.gelb);             // hochgeklappter Kragen
    r(16, 10, 3, 2, F.gelb);
    r(16, 10, 1, 1, F.gelbL);

    if (pose.gesicht === 'verdutzt') {
      r(13, 5, 2, 1, F.navy);            // Augenbrauen weit oben
      r(17, 5, 2, 1, F.navy);
      r(13, 7, 2, 2, F.weiss);           // große Augen, Pupillen schielen
      r(14, 7, 1, 1, F.navy);
      r(16, 7, 2, 2, F.weiss);
      r(16, 8, 1, 1, F.navy);
      r(15, 10, 2, 1, F.navy);           // „Oh!“-Mund
      r(15, 11, 2, 1, F.haar);
      r(12, 9, 1, 1, F.wange);
      r(18, 9, 1, 1, F.wange);
    } else {
      // Übertrieben ernst: schräge, tiefe Augenbrauen, schmale Augen, gerader Mund
      r(13, 6, 2, 1, F.navy);
      r(15, 7, 1, 1, F.navy);
      r(16, 7, 1, 1, F.navy);
      r(17, 6, 2, 1, F.navy);
      r(13, 8, 1, 1, F.weiss);
      r(14, 8, 1, 1, F.navy);
      r(16, 8, 1, 1, F.weiss);
      r(17, 8, 1, 1, F.navy);
      r(14, 10, 4, 1, F.navy);
      r(12, 9, 1, 1, F.wange);
    }

    // ---------- Blau-türkisfarbene Hafenmütze ----------
    if (pose.schief) {
      // Nach der Bruchlandung rutscht die Mütze schief nach vorn
      r(10, 4, 3, 1, F.haar);
      r(10, 5, 2, 1, F.haar);
      r(16, 0, 2, 1, F.kappeD);
      r(14, 1, 5, 1, F.kappe);
      r(12, 2, 8, 1, F.kappe);
      r(12, 3, 9, 1, F.kappe);
      r(12, 2, 2, 2, F.kappeD);
      r(15, 2, 2, 1, F.kappeL);
      r(12, 4, 9, 1, F.bandL);
      r(13, 5, 8, 1, F.band);
      r(18, 4, 2, 2, F.creme);
    } else {
      const dy = pose.kappeDy || 0;
      r(14, -1 + dy, 2, 1, F.kappeD);    // kleiner Zipfel
      r(13, 0 + dy, 4, 1, F.kappe);
      r(11, 1 + dy, 8, 1, F.kappe);
      r(10, 2 + dy, 10, 2, F.kappe);
      r(10, 2 + dy, 2, 2, F.kappeD);
      r(13, 1 + dy, 2, 1, F.kappeL);
      r(14, 2 + dy, 1, 1, F.kappeL);
      r(9, 4 + dy, 11, 1, F.bandL);
      r(9, 5 + dy, 11, 1, F.band);
      r(16, 4 + dy, 2, 2, F.creme);      // kleines Anker-Etikett
      r(17, 5 + dy, 1, 1, F.band);
    }

    umrande(c);
    return c;
  }

  // Dunkler Umriss um alles, was nicht durchsichtig ist (gut lesbar auf hellem Himmel)
  function umrande(c) {
    const g = c.getContext('2d');
    const bild = g.getImageData(0, 0, c.width, c.height);
    const d = bild.data;
    const w = c.width;
    const h = c.height;
    const voll = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    const rand = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (voll(x, y)) continue;
        if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) rand.push(x, y);
      }
    }
    g.fillStyle = F.navy;
    for (let i = 0; i < rand.length; i += 2) g.fillRect(rand[i], rand[i + 1], 1, 1);
  }

  // Zwischenspeicher: pro Pose und Bildpunktgröße ein fertig hochskaliertes Bild
  const roh = new Map();
  const gross = new Map();
  let groessePx = 0;

  function schluessel(p) {
    return `${p.beine}|${p.kappeDy || 0}|${p.jacke || 0}|${p.gesicht}|${p.schief ? 1 : 0}`;
  }

  // Liefert die Pose in der gewünschten Größe: jeder Kunstpixel wird ein Block aus px × px Bildpunkten
  function bild(pose, px) {
    px = Math.max(1, Math.round(px));
    if (px !== groessePx) { gross.clear(); groessePx = px; }
    const key = schluessel(pose);
    let c = gross.get(key);
    if (!c) {
      let r = roh.get(key);
      if (!r) { r = male(pose); roh.set(key, r); }
      c = leinwand(W * px, H * px);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(r, 0, 0, W * px, H * px);
      gross.set(key, c);
    }
    return c;
  }

  return { W, H, ANKER, DUESE, F, bild };
})();
