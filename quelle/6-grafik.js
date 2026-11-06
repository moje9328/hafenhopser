// ===================================================================
// 6 · GRAFIK
// Zeichnet alles in voller Geräteauflösung. Gerechnet wird in Spielkoordinaten
// (360 × 640); jedes Rechteck wird auf ganze Bildpunkte gerundet, damit die
// Pixelgrafik knackig bleibt. Ruhige Hintergrundebenen werden einmal pro
// Größe vorgezeichnet und dann nur verschoben (Parallax).
// ===================================================================

const Grafik = (() => {
  const B = K.BREITE;
  const H = K.HOEHE;
  const HORIZONT = 446;
  const NAVY = '#10243A';
  const CREME = '#FFF4DC';
  const GELB = '#FFD35A';

  // Containerfarben: [Grundton, Schatten, Licht]
  const CONTAINER_FARBEN = [
    ['#FF805B', '#D45C3C', '#FFAA8C'],   // Korallorange
    ['#24D6CD', '#14A09D', '#8BF0EA'],   // Türkis
    ['#FFD35A', '#D6A332', '#FFE9A3'],   // Sonnengelb
    ['#FFF1D6', '#D8C19B', '#FFFFFF'],   // Creme
    ['#3D7FE0', '#2858A8', '#7FB3F7'],   // Hafenblau
    ['#EE5D6C', '#B53A4B', '#F897A1'],   // Hummerrot
    ['#46C98B', '#2C9364', '#8EE6BC'],   // Seegrün
  ];

  let canvas = null;
  let ctx = null;
  let skala = 1;
  let reduziert = false;
  let ebenen = null;
  let partikel = [];
  let anzeigeWinkel = 0;
  let punktePop = 0;
  let letztePunkte = 0;
  let emitterZeit = 0;
  let zeitEffekte = 0;

  function leinwand(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ---------- Malhelfer: Rechtecke auf ganze Bildpunkte gerundet ----------
  function maler(g, sk, oy = 0) {
    const p = {
      r(x, y, w, h, farbe) {
        const x0 = Math.round(x * sk);
        const y0 = Math.round((y - oy) * sk);
        const x1 = Math.round((x + w) * sk);
        const y1 = Math.round((y + h - oy) * sk);
        if (x1 <= x0 || y1 <= y0) return;
        g.fillStyle = farbe;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
      },
      // Pixelkreis aus waagerechten Streifen
      kreis(cx, cy, rad, farbe, raster = 2) {
        for (let dy = -rad; dy < rad; dy += raster) {
          const m = dy + raster / 2;
          const hw = Math.round(Math.sqrt(Math.max(0, rad * rad - m * m)) / raster) * raster;
          if (hw > 0) p.r(cx - hw, cy + dy, hw * 2, raster, farbe);
        }
      },
      // Treppenlinie aus kleinen Quadraten
      linie(x1, y1, x2, y2, dicke, farbe) {
        const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          p.r(Math.round((x1 + (x2 - x1) * t) / 2) * 2, Math.round((y1 + (y2 - y1) * t) / 2) * 2, dicke, dicke, farbe);
        }
      },
    };
    return p;
  }
  let p = null;   // Maler für das Hauptbild

  // ===================================================================
  // Vorgezeichnete Hintergrundebenen
  // ===================================================================
  function ebene(breite, y0, hoehe, malen, dunst) {
    const c = leinwand(breite * skala, hoehe * skala);
    const g = c.getContext('2d');
    malen(maler(g, skala, y0));
    if (dunst) {
      // Leichter Dunst: Hintergrund bleibt blass, Hindernisse heben sich klar ab
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = dunst;
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
    }
    return { c, breite, y0, devB: c.width };
  }

  function baueEbenen() {
    // ---- Himmel, Sonne und Hafenbecken (steht still) ----
    const himmel = leinwand(B * skala, K.WASSER * skala);
    const hp = maler(himmel.getContext('2d'), skala);
    const baender = [
      [0, '#6FCBF2'], [110, '#80D3F4'], [190, '#93DCF6'], [250, '#A7E4F7'],
      [300, '#BCEBF7'], [342, '#D2F2F5'], [380, '#E6F6EE'], [412, '#F7F3DD'], [436, '#FFEFD0'],
    ];
    baender.forEach(([y, f], i) => {
      const bis = i + 1 < baender.length ? baender[i + 1][0] : HORIZONT;
      hp.r(0, y, B, bis - y, f);
    });
    hp.kreis(284, 132, 44, 'rgba(255, 246, 205, 0.45)');
    hp.kreis(284, 132, 32, '#FFE58A');
    hp.kreis(280, 128, 22, '#FFF0B8');
    const wasserBaender = [
      [HORIZONT, '#86D3E9'], [454, '#6CC4E2'], [470, '#59B5DA'], [494, '#47A3CF'],
      [522, '#3A92C3'], [552, '#3080B5'],
    ];
    wasserBaender.forEach(([y, f], i) => {
      const bis = i + 1 < wasserBaender.length ? wasserBaender[i + 1][0] : K.WASSER;
      hp.r(0, y, B, bis - y, f);
    });
    for (const [x, y, w] of [[20, 462, 40], [150, 466, 24], [230, 478, 56], [60, 506, 30], [300, 512, 34], [190, 540, 46], [24, 560, 28]]) {
      hp.r(x, y, w, 2, 'rgba(255, 255, 255, 0.28)');
    }

    // ---- Wolken ----
    const wolken = ebene(720, 30, 250, w => {
      const wolke = (x, y, b) => {
        const c = '#FFF9EE';
        const sch = '#E2F1F8';
        w.kreis(x + b * 0.3, y + 14, Math.round(b * 0.16), c);
        w.kreis(x + b * 0.56, y + 10, Math.round(b * 0.21), c);
        w.kreis(x + b * 0.78, y + 16, Math.round(b * 0.13), c);
        w.r(x + 6, y + 16, b - 12, 12, c);
        w.kreis(x + 8, y + 22, 6, c);
        w.kreis(x + b - 8, y + 22, 6, c);
        w.r(x + 6, y + 26, b - 12, 4, sch);
      };
      wolke(30, 40, 92);
      wolke(250, 110, 70);
      wolke(420, 30, 116);
      wolke(600, 140, 84);
      wolke(170, 210, 60);
      wolke(540, 230, 50);
    });

    // ---- Ferne Küste mit Leuchtturm ----
    const fern = ebene(720, 290, HORIZONT - 290, f => {
      const z = zufallsGenerator(7);
      for (let x = 0; x < 720; x += 24) {
        const h = 6 + Math.floor(z() * 4) * 4;
        f.r(x, HORIZONT - h, 24, h, z() < 0.5 ? '#A9D6EA' : '#9DCDE4');
      }
      // Landzunge
      const huegel = [[440, 6], [452, 12], [464, 18], [480, 24], [500, 30], [530, 34], [600, 36], [640, 30], [660, 22], [676, 14], [690, 6]];
      for (let i = 0; i < huegel.length - 1; i++) {
        const [x, h] = huegel[i];
        f.r(x, HORIZONT - h, huegel[i + 1][0] - x, h, '#8DC2DC');
      }
      // Häuschen
      for (const [x, w, h, d] of [[478, 16, 12, '#EAB7A6'], [498, 12, 10, '#F3E3C4'], [630, 14, 12, '#EAB7A6']]) {
        f.r(x, HORIZONT - 24 - h + 2, w, h, d);
        f.r(x - 2, HORIZONT - 24 - h - 2, w + 4, 4, '#C98B7A');
      }
      // Leuchtturm
      const lx = 584;
      const fuss = HORIZONT - 36;
      for (let y = 330; y < fuss; y += 4) {
        const w = 10 + Math.round(((y - 330) / (fuss - 330)) * 10 / 2) * 2;
        f.r(lx - w / 2, y, w, 4, Math.floor((y - 330) / 12) % 2 === 0 ? '#F4A08A' : '#FFF4DC');
      }
      f.kreis(lx, 318, 16, 'rgba(255, 238, 160, 0.55)');
      f.r(lx - 13, 326, 26, 4, '#4B7FA6');
      f.r(lx - 7, 314, 14, 12, '#FFE07A');
      f.r(lx - 1, 314, 2, 12, '#4B7FA6');
      f.r(lx - 9, 310, 18, 4, '#E9876F');
      f.r(lx - 6, 306, 12, 4, '#E9876F');
      f.r(lx - 2, 302, 4, 4, '#E9876F');
    }, 'rgba(205, 238, 250, 0.22)');

    // ---- Kräne und Lagerhäuser ----
    const mitte = ebene(720, 300, HORIZONT + 10 - 300, m => {
      m.r(0, HORIZONT, 720, 8, '#5E8FB8');
      m.r(0, HORIZONT, 720, 2, '#86B2D6');
      const kran = (x, farbe, dunkel) => {
        m.r(x, 372, 6, 74, farbe);
        m.r(x + 40, 372, 6, 74, farbe);
        m.r(x, 404, 46, 4, dunkel);
        m.r(x - 2, 440, 10, 6, dunkel);
        m.r(x + 38, 440, 10, 6, dunkel);
        m.r(x - 6, 366, 58, 8, farbe);
        m.r(x - 34, 356, 158, 6, farbe);
        m.r(x + 16, 318, 8, 48, dunkel);
        m.linie(x + 20, 320, x - 30, 356, 2, dunkel);
        m.linie(x + 20, 320, x + 116, 356, 2, dunkel);
        m.r(x + 50, 362, 12, 10, '#F3EEDF');
        m.r(x + 52, 364, 8, 3, '#5E8FB8');
        m.r(x + 88, 362, 8, 4, dunkel);
        m.r(x + 90, 366, 1, 16, dunkel);
        m.r(x + 95, 366, 1, 16, dunkel);
        m.r(x + 84, 382, 20, 9, '#E9A08C');
      };
      kran(60, '#63BAC4', '#3F8E9C');
      kran(430, '#E8A08A', '#B9735F');
      // Lagerhäuser mit Sägezahndach
      const halle = (x, w, h, farbe, dach) => {
        m.r(x, HORIZONT - h, w, h, farbe);
        for (let dx = 0; dx < w; dx += 20) {
          m.r(x + dx, HORIZONT - h - 4, 20, 4, dach);
          m.r(x + dx + 8, HORIZONT - h - 8, 12, 4, dach);
          m.r(x + dx + 14, HORIZONT - h - 12, 6, 4, dach);
        }
        for (let dx = 8; dx < w - 8; dx += 14) m.r(x + dx, HORIZONT - h + 10, 8, 6, '#C9E4F2');
        m.r(x + w / 2 - 10, HORIZONT - 18, 20, 18, '#4F7BA4');
      };
      halle(220, 120, 44, '#6E9CC6', '#557FA8');
      halle(590, 100, 36, '#7AA7CF', '#5D8AB4');
      // Kleine Containerstapel auf der Kaje
      const kfarben = ['#E9A08C', '#7FCFD0', '#F1CF7C', '#93B3E6', '#E68C96'];
      for (let i = 0; i < 9; i++) {
        const x = 360 + (i % 3) * 18;
        const y = HORIZONT - 9 - Math.floor(i / 3) * 9;
        if (i === 8) continue;
        m.r(x, y, 16, 8, kfarben[i % kfarben.length]);
      }
    }, 'rgba(205, 238, 250, 0.12)');

    // ---- Schiffe im Hafenbecken ----
    const schiffe = ebene(900, 430, 80, sp => {
      // Containerschiff
      sp.r(80, 482, 160, 14, '#3E6F9E');
      sp.r(240, 482, 8, 10, '#3E6F9E');
      sp.r(248, 482, 6, 6, '#3E6F9E');
      sp.r(84, 494, 156, 3, '#E2876F');
      sp.r(80, 480, 168, 2, '#F3EEDF');
      const kf = ['#E9A08C', '#7FCFD0', '#F1CF7C', '#93B3E6', '#E68C96', '#9FDDB8'];
      for (let k = 0; k < 9; k++) {
        sp.r(110 + k * 14, 468, 13, 12, kf[k % kf.length]);
        if (k % 3 !== 1) sp.r(110 + k * 14, 457, 13, 11, kf[(k + 2) % kf.length]);
      }
      sp.r(86, 450, 18, 30, '#F3EEDF');
      sp.r(88, 454, 14, 3, '#3E6F9E');
      sp.r(92, 442, 6, 8, '#E2876F');
      sp.r(84, 498, 150, 2, 'rgba(255, 255, 255, 0.3)');
      // Schlepper mit Rauchwölkchen
      sp.r(480, 488, 46, 9, '#E58A73');
      sp.r(526, 488, 6, 5, '#E58A73');
      sp.r(480, 495, 46, 2, '#3E6F9E');
      sp.r(492, 476, 20, 12, '#F3EEDF');
      sp.r(495, 479, 14, 3, '#3E6F9E');
      sp.r(500, 466, 6, 10, '#3E6F9E');
      sp.r(500, 468, 6, 2, '#F1CF7C');
      sp.kreis(508, 458, 4, 'rgba(255, 255, 255, 0.7)');
      sp.kreis(516, 450, 6, 'rgba(255, 255, 255, 0.55)');
      sp.r(482, 499, 40, 2, 'rgba(255, 255, 255, 0.3)');
      // Boje
      sp.r(360, 498, 6, 8, '#E58A73');
      sp.r(360, 496, 6, 2, '#F3EEDF');
      // Segelboot
      sp.r(700, 494, 40, 6, '#F3EEDF');
      sp.r(704, 500, 32, 2, '#3E6F9E');
      sp.r(718, 440, 2, 54, '#3E6F9E');
      for (let i = 0; i < 12; i++) sp.r(720, 442 + i * 4, 4 + i * 2, 4, '#FFF8EA');
      for (let i = 0; i < 8; i++) sp.r(716 - (2 + i * 1.5), 452 + i * 4, 2 + i * 1.5, 4, '#7FCFD0');
    }, 'rgba(205, 238, 250, 0.1)');

    ebenen = { himmel, wolken, fern, mitte, schiffe };
  }

  // Zeichnet eine Kachel-Ebene verschoben und nahtlos wiederholt
  function zeichneEbene(e, verschiebung) {
    const off = ((Math.round(verschiebung * skala) % e.devB) + e.devB) % e.devB;
    const y = Math.round(e.y0 * skala);
    ctx.drawImage(e.c, -off, y);
    if (e.devB - off < canvas.width) ctx.drawImage(e.c, e.devB - off, y);
  }

  // ===================================================================
  // Bewegte Teile
  // ===================================================================
  function zeichneGlitzern(s, strecke) {
    const t = s.zeit;
    for (let i = 0; i < 16; i++) {
      const x = (((i * 97 + 31) % 360) - strecke * (reduziert ? 0 : 0.55) % 360 + 720) % 360;
      const y = 458 + ((i * 53) % 118);
      const an = reduziert ? i % 3 === 0 : Math.sin(t * 3 + i * 1.7) > 0.55;
      if (!an) continue;
      p.r(Math.floor(x / 2) * 2, y, 4, 2, 'rgba(255, 255, 255, 0.85)');
      if (!reduziert && Math.sin(t * 3 + i * 1.7) > 0.85) {
        p.r(Math.floor(x / 2) * 2 + 1, y - 2, 2, 6, 'rgba(255, 255, 255, 0.6)');
      }
    }
  }

  function zeichneVorderWasser(strecke) {
    p.r(0, K.WASSER, B, 6, '#2A86B8');
    p.r(0, K.WASSER + 6, B, 14, '#1F6F9E');
    p.r(0, K.WASSER + 20, B, 16, '#185A85');
    p.r(0, K.WASSER + 36, B, H - K.WASSER - 36, '#123F60');
    // Schaumkronen und Wellenstriche ziehen mit der Welt mit
    const welle = (periode, faktor, y, w, h, farbe, versatz = 0) => {
      const off = (strecke * faktor + versatz) % periode;
      for (let x = -off; x < B; x += periode) p.r(x, y, w, h, farbe);
    };
    welle(32, 1, K.WASSER, 14, 2, '#D9F6F8');
    welle(32, 1, K.WASSER + 2, 6, 2, '#9EE3EE', -14);
    welle(44, 0.9, K.WASSER + 12, 12, 2, '#3A97C6');
    welle(58, 0.8, K.WASSER + 27, 16, 2, '#2D7AA6', 20);
    welle(70, 0.7, K.WASSER + 44, 20, 2, '#1D5A80', 8);
  }

  function zeichneKranbahn(strecke) {
    p.r(0, 0, B, 9, '#1D3A57');
    p.r(0, 0, B, 2, '#3B6286');
    const off = strecke % 24;
    for (let x = -off + 6; x < B; x += 24) p.r(x, 4, 2, 2, '#7FA3C2');
    // Gelb-blaue Warnstreifen: hier ist die obere Grenze
    p.r(0, 9, B, 5, NAVY);
    const o2 = strecke % 16;
    for (let x = -o2 - 16; x < B + 8; x += 16) {
      for (let k = 0; k < 5; k++) p.r(x + k, 9 + k, 8, 1, GELB);
    }
    p.r(0, K.DECKE, B, 2, 'rgba(16, 36, 58, 0.28)');
  }

  // ---------- Hindernisse ----------
  const MINI = {
    anker: ['..x..', '.xxx.', '..x..', 'x.x.x', '.xxx.'],
    fisch: ['.xx..x', 'xxxxxx', 'x.xx.x', '.xx..x'],
    welle: ['.x...x', 'x.x.x.', '...x..'],
    stern: ['..x..', 'xxxxx', '.xxx.', 'x...x'],
  };
  const ZIFFERN = {
    0: ['xxx', 'x.x', 'x.x', 'x.x', 'xxx'], 1: ['.x.', 'xx.', '.x.', '.x.', 'xxx'],
    2: ['xxx', '..x', 'xxx', 'x..', 'xxx'], 3: ['xxx', '..x', '.xx', '..x', 'xxx'],
    4: ['x.x', 'x.x', 'xxx', '..x', '..x'], 5: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
    6: ['xxx', 'x..', 'xxx', 'x.x', 'xxx'], 7: ['xxx', '..x', '.x.', '.x.', '.x.'],
    8: ['xxx', 'x.x', 'xxx', 'x.x', 'xxx'], 9: ['xxx', 'x.x', 'xxx', '..x', 'xxx'],
  };
  function muster(karte, x, y, g, farbe) {
    karte.forEach((zeile, j) => {
      for (let i = 0; i < zeile.length; i++) if (zeile[i] === 'x') p.r(x + i * g, y + j * g, g, g, farbe);
    });
  }

  function container(x, y, w, h, farbe, deko, z) {
    const [haupt, dunkel, hell] = farbe;
    p.r(x, y, w, h, NAVY);
    p.r(x + 2, y + 2, w - 4, h - 4, haupt);
    p.r(x + 2, y + 2, w - 4, 3, hell);
    p.r(x + 2, y + h - 5, w - 4, 3, dunkel);
    if (h >= 20) for (let cx = x + 8; cx < x + w - 6; cx += 7) p.r(cx, y + 7, 2, h - 14, dunkel);
    p.r(x + 2, y + 2, 4, 4, dunkel);
    p.r(x + w - 6, y + 2, 4, 4, dunkel);
    p.r(x + 2, y + h - 6, 4, 4, NAVY);
    p.r(x + w - 6, y + h - 6, 4, 4, NAVY);
    if (h < 22) return;
    const my = y + Math.round(h / 2);
    switch (deko) {
      case 1: {   // Anker-Aufkleber
        const sx = x + 10 + Math.floor(z() * 20);
        p.r(sx, my - 7, 16, 14, CREME);
        muster(MINI.anker, sx + 3, my - 5, 2, NAVY);
        break;
      }
      case 2: {   // Fisch-Aufkleber
        const sx = x + 8 + Math.floor(z() * 26);
        p.r(sx, my - 6, 18, 12, CREME);
        muster(MINI.fisch, sx + 3, my - 4, 2, '#FF805B');
        break;
      }
      case 3: {   // Schablonen-Nummer
        const n = Math.floor(z() * 90) + 10;
        const sx = x + 14 + Math.floor(z() * 14);
        muster(ZIFFERN[Math.floor(n / 10)], sx, my - 5, 2, 'rgba(255, 255, 255, 0.75)');
        muster(ZIFFERN[n % 10], sx + 8, my - 5, 2, 'rgba(255, 255, 255, 0.75)');
        break;
      }
      case 4: {   // Wellen-Band
        p.r(x + 2, my - 4, w - 4, 8, NAVY);
        for (let wx = x + 4; wx < x + w - 10; wx += 12) muster(MINI.welle, wx, my - 3, 1, '#24D6CD');
        break;
      }
      case 5: {   // Sternchen-Aufkleber
        const sx = x + 30 + Math.floor(z() * 10);
        p.r(sx, my - 6, 14, 12, NAVY);
        muster(MINI.stern, sx + 2, my - 4, 2, GELB);
        break;
      }
    }
  }

  // Teilt eine Höhe in gleich hohe Container auf
  function stapel(hoehe) {
    const n = Math.max(1, Math.round(hoehe / K.CONTAINER_H));
    return { n, h: hoehe / n };
  }

  function zeichneHindernis(h, strecke) {
    const W = K.HINDERNIS_B;
    const x = Math.round((h.x - strecke) * skala) / skala;
    if (x > B + 4 || x + W < -4) return;
    const z = zufallsGenerator(h.saat);
    const farbe = () => CONTAINER_FARBEN[Math.floor(z() * CONTAINER_FARBEN.length)];
    const deko = () => (z() < 0.55 ? 1 + Math.floor(z() * 5) : 0);

    // ---- Oben: Laufkatze an der Kranbahn, Seile, Spreizer, hängende Container ----
    const seilEnde = K.DECKE + K.SEIL;
    const spreizEnde = seilEnde + K.SPREIZER;
    p.r(x + 16, 3, 8, 8, '#3B4E66');
    p.r(x + W - 24, 3, 8, 8, '#3B4E66');
    p.r(x + 12, 10, W - 24, 9, NAVY);
    p.r(x + 14, 11, W - 28, 6, GELB);
    p.r(x + 14, 15, W - 28, 2, '#D6A332');
    p.r(x + 19, 19, 2, seilEnde - 19, '#34495F');
    p.r(x + W - 21, 19, 2, seilEnde - 19, '#34495F');
    p.r(x + 4, seilEnde, W - 8, K.SPREIZER, NAVY);
    p.r(x + 6, seilEnde + 1, W - 12, K.SPREIZER - 2, GELB);
    for (let k = x + 10; k < x + W - 10; k += 10) p.r(k, seilEnde + 1, 4, K.SPREIZER - 2, NAVY);
    const oben = stapel(h.oben - spreizEnde);
    for (let i = 0; i < oben.n; i++) {
      container(x, spreizEnde + i * oben.h, W, oben.h, farbe(), deko(), z);
    }

    // ---- Unten: Containerstapel auf einem Betonsockel im Wasser ----
    const pierY = K.WASSER - K.PIER;
    const unten = stapel(pierY - h.unten);
    for (let i = 0; i < unten.n; i++) {
      container(x, h.unten + i * unten.h, W, unten.h, farbe(), deko(), z);
    }
    p.r(x, pierY, W, K.PIER, NAVY);
    p.r(x + 2, pierY, W - 4, K.PIER, '#C9D4E0');
    p.r(x + 2, pierY + K.PIER - 4, W - 4, 4, '#9FB0C4');
    for (let k = 0; k < W - 4; k += 8) p.r(x + 2 + k, pierY + 2, 4, 4, k % 16 === 0 ? GELB : NAVY);
    for (const tx of [x + 8, x + W - 20]) {
      p.r(tx, pierY + 8, 12, 10, '#1B2A3D');
      p.r(tx + 4, pierY + 11, 4, 4, '#3A4A5E');
    }
    // Pfähle unter Wasser
    for (const px of [x + 6, x + W - 18]) {
      p.r(px, K.WASSER, 12, H - K.WASSER, '#0F3550');
      p.r(px, K.WASSER, 4, H - K.WASSER, '#1A4A6E');
      p.r(px - 2, K.WASSER + 2, 16, 2, '#9EE3EE');
    }
  }

  // ---------- Partikel ----------
  function neuesTeilchen(t) {
    if (partikel.length >= K.MAX_PARTIKEL) partikel.shift();
    partikel.push(t);
  }

  function duesenPos(y, winkel) {
    const k = K.KUNST_PIXEL;
    const dx = (Figur.DUESE.x - Figur.ANKER.x) * k;
    const dy = (Figur.DUESE.y - Figur.ANKER.y) * k;
    const c = Math.cos(winkel);
    const si = Math.sin(winkel);
    return { x: K.FIGUR_X + dx * c - dy * si, y: y + dx * si + dy * c };
  }

  const FUNKEN = ['#24D6CD', '#FF805B', '#FFD35A', '#7FF3EC'];

  function funken(x, y, anzahl, kraft) {
    for (let i = 0; i < anzahl; i++) {
      neuesTeilchen({
        art: 'funke', x, y,
        vx: -30 - Math.random() * 70, vy: 60 + Math.random() * 140 * kraft,
        leben: 0, max: 0.22 + Math.random() * 0.22,
        g: Math.random() < 0.5 ? 2 : 3, farbe: FUNKEN[i % FUNKEN.length], schwer: 260,
      });
    }
  }
  function rauch(x, y) {
    neuesTeilchen({
      art: 'rauch', x: x - 2 + Math.random() * 4, y,
      vx: -20 - Math.random() * 20, vy: 10 + Math.random() * 30,
      leben: 0, max: 0.5 + Math.random() * 0.25, g: 3, schwer: -60,
    });
  }

  function impulsEffekt(s) {
    const d = duesenPos(s.figur.y, anzeigeWinkel);
    funken(d.x, d.y, reduziert ? 2 : 6, 1);
    if (!reduziert) { rauch(d.x, d.y + 2); rauch(d.x - 3, d.y + 4); }
  }

  function unfallEffekt(s, art) {
    if (art === 'wasser') {
      const n = reduziert ? 5 : 14;
      for (let i = 0; i < n; i++) {
        neuesTeilchen({
          art: 'funke', x: K.FIGUR_X - 12 + Math.random() * 24, y: K.WASSER - 2,
          vx: -70 + Math.random() * 140, vy: -110 - Math.random() * 130,
          leben: 0, max: 0.45 + Math.random() * 0.2, g: 3,
          farbe: i % 2 ? '#D9F6F8' : '#7FD3EE', schwer: 600,
        });
      }
    } else {
      const d = duesenPos(s.figur.y, anzeigeWinkel);
      for (let i = 0; i < (reduziert ? 1 : 4); i++) rauch(d.x, d.y);
    }
  }

  function rekordEffekt() {
    const n = reduziert ? 12 : 48;
    for (let i = 0; i < n; i++) {
      neuesTeilchen({
        art: 'funke', x: Math.random() * B, y: -10 - Math.random() * 120,
        vx: -30 + Math.random() * 60, vy: 60 + Math.random() * 90,
        leben: 0, max: 2.4 + Math.random() * 1.2, g: 4,
        farbe: CONTAINER_FARBEN[i % CONTAINER_FARBEN.length][0], schwer: 40, flattern: Math.random() * 6,
      });
    }
  }

  function effekteSchritt(dt, s) {
    zeitEffekte += dt;
    const welt = s.zustand === ZUSTAND.SPIELEN ? tempoBei(s.punkte) : 0;
    // Dauerfunken und Rauchwölkchen aus dem Rucksack
    if (!reduziert && (s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.BEREIT || s.zustand === ZUSTAND.START)) {
      emitterZeit += dt;
      while (emitterZeit > 0.07) {
        emitterZeit -= 0.07;
        const y = s.zustand === ZUSTAND.SPIELEN ? s.figur.y : schwebeY(s);
        const d = duesenPos(y, anzeigeWinkel);
        if (Math.random() < 0.6) funken(d.x, d.y, 1, 0.5); else rauch(d.x, d.y + 1);
      }
    }
    for (const t of partikel) {
      t.leben += dt;
      t.vy += t.schwer * dt;
      t.x += (t.vx - welt) * dt + (t.flattern ? Math.sin(zeitEffekte * 5 + t.flattern) * 20 * dt : 0);
      t.y += t.vy * dt;
      if (t.art === 'rauch') t.g = 3 + (t.leben / t.max) * 6;
    }
    partikel = partikel.filter(t => t.leben < t.max && t.x > -20 && t.x < B + 20 && t.y < H + 10);
    if (punktePop > 0) punktePop = Math.max(0, punktePop - dt);
  }

  function effekteLeeren() {
    partikel = [];
    emitterZeit = 0;
  }

  function zeichnePartikel() {
    for (const t of partikel) {
      const rest = 1 - t.leben / t.max;
      if (t.art === 'rauch') {
        ctx.globalAlpha = Math.max(0, rest * 0.75);
        const g = Math.round(t.g / 2) * 2;
        p.r(t.x - g / 2, t.y - g / 2, g, g, CREME);
      } else {
        ctx.globalAlpha = Math.min(1, rest * 2);
        p.r(t.x, t.y, t.g, t.g, t.farbe);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Figur ----------
  function schwebeY(s) {
    if (s.zustand === ZUSTAND.START) return K.FIGUR_START_Y + (reduziert ? 0 : Math.sin(s.zeit * 2.4) * 6);
    if (s.zustand === ZUSTAND.BEREIT || s.zustand === ZUSTAND.PAUSE) return s.figur.y + (reduziert ? 0 : Math.sin(s.zeit * 3) * 3);
    return s.figur.y;
  }

  function waehlePose(s) {
    const f = s.figur;
    if (s.zustand === ZUSTAND.ENDE) return { beine: 'flattern0', gesicht: 'verdutzt', schief: true, jacke: 1 };
    if (s.zustand !== ZUSTAND.SPIELEN) {
      const fl = Math.floor(s.zeit * 5) % 2;
      return { beine: fl ? 'flattern1' : 'flattern0', gesicht: 'ernst', jacke: fl };
    }
    if (f.schub < K.SCHUB_POSE) return { beine: 'hoch', gesicht: 'ernst', kappeDy: f.schub < 0.08 ? -1 : 0, jacke: 0 };
    if (f.vy > 80) {
      const fl = Math.floor(s.zeit * 14) % 2;
      return { beine: fl ? 'flattern1' : 'flattern0', gesicht: 'ernst', jacke: fl };
    }
    return { beine: 'normal', gesicht: 'ernst', jacke: 0 };
  }

  function zeichneFigur(s, alpha, dt) {
    let y;
    let ziel;
    if (s.zustand === ZUSTAND.SPIELEN) {
      y = s.vorher.y + (s.figur.y - s.vorher.y) * alpha;
      const vy = s.figur.vy;
      ziel = vy < 0 ? Math.max(-0.3, (vy / -K.IMPULS) * -0.3) : Math.min(0.62, (vy / K.MAX_FALL) * 0.62);
    } else if (s.zustand === ZUSTAND.ENDE) {
      const t = s.unfall.zeit;
      y = s.figur.y;
      if (!reduziert && t < 0.4) y -= Math.sin((t / 0.4) * Math.PI) * 14;   // kleiner Boing-Hüpfer
      ziel = reduziert ? 0.15 : 0.18 + Math.sin(t * 16) * 0.25 * Math.exp(-t * 4);
    } else {
      y = schwebeY(s);
      ziel = 0;
    }
    if (reduziert) anzeigeWinkel = ziel * 0.6;
    else anzeigeWinkel += (ziel - anzeigeWinkel) * Math.min(1, dt * 14);

    const px = Math.max(1, Math.round(K.KUNST_PIXEL * skala));
    const bild = Figur.bild(waehlePose(s), px);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, Math.round(K.FIGUR_X * skala), Math.round(y * skala));
    if (Math.abs(anzeigeWinkel) > 0.01) {
      ctx.rotate(anzeigeWinkel);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.imageSmoothingEnabled = false;
    }
    ctx.drawImage(bild, -Math.round(Figur.ANKER.x * px), -Math.round(Figur.ANKER.y * px));
    ctx.restore();

    if (s.zustand === ZUSTAND.ENDE) zeichneVerdutzt(s, y);
  }

  // Sternchen um den Kopf und ein kurzes Comic-Wort
  function zeichneVerdutzt(s, y) {
    const t = s.unfall.zeit;
    const kopfY = y - 22;
    for (let i = 0; i < 3; i++) {
      const a = (reduziert ? 0 : t * 5) + (i * Math.PI * 2) / 3;
      const sx = K.FIGUR_X + 2 + Math.cos(a) * 16;
      const sy = kopfY + Math.sin(a) * 5;
      p.r(sx - 1, sy - 3, 2, 6, GELB);
      p.r(sx - 3, sy - 1, 6, 2, GELB);
    }
    if (t < 0.9) {
      const wort = s.unfall.art === 'wasser' ? 'PLATSCH!' : s.unfall.art === 'decke' ? 'BONK!' : 'BOING!';
      text(wort, K.FIGUR_X + 34, y - 42 - (reduziert ? 0 : Math.min(t, 0.3) * 20), 12, GELB, 'left');
    }
  }

  function text(inhalt, x, y, groesse, farbe, ausrichtung = 'center') {
    ctx.save();
    ctx.setTransform(skala, 0, 0, skala, 0, 0);
    ctx.font = `${groesse}px "Press Start 2P", "Courier New", monospace`;
    ctx.textAlign = ausrichtung;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, groesse * 0.42);
    ctx.strokeStyle = NAVY;
    ctx.strokeText(inhalt, x, y);
    ctx.fillStyle = farbe;
    ctx.fillText(inhalt, x, y);
    ctx.restore();
  }

  function zeichnePunkte(s) {
    if (s.punkte !== letztePunkte) {
      if (s.punkte > letztePunkte) punktePop = 0.22;
      letztePunkte = s.punkte;
    }
    const g = 28 + (reduziert ? 0 : (punktePop / 0.22) * 8);
    text(String(s.punkte), B / 2, 30 - (g - 28) / 2, g, CREME);
  }

  // ===================================================================
  // Öffentliche Funktionen
  // ===================================================================
  function init(c) {
    canvas = c;
    ctx = c.getContext('2d', { alpha: false });
  }

  function setzeReduziert(wert) { reduziert = wert; }

  // Passt das Spielfeld in den freien Platz: gleiches Seitenverhältnis, keine Verzerrung.
  // Wenn es fast passt, wird ein ganzzahliger Maßstab gewählt (gleich große Pixel).
  function groesse(platzW, platzH, dpr) {
    const cssW = Math.max(120, Math.min(platzW, (platzH * B) / H));
    let sk = (cssW * dpr) / B;
    const ganz = Math.floor(sk);
    if (ganz >= 2 && ganz / sk >= 0.88) sk = ganz;
    const w = Math.round(B * sk);
    const h = Math.round(H * sk);
    if (canvas.width !== w || canvas.height !== h || !ebenen) {
      canvas.width = w;
      canvas.height = h;
      skala = w / B;
      p = maler(ctx, skala);
      baueEbenen();
    }
    return { cssW: w / dpr, cssH: h / dpr };
  }

  let letzteZeit = null;
  function zeichne(s, alpha = 1) {
    if (!ebenen) return;
    const jetzt = s.zeit;
    const dt = letzteZeit === null ? 0 : Math.max(0, Math.min(0.1, jetzt - letzteZeit));
    letzteZeit = jetzt;
    const strecke = s.zustand === ZUSTAND.SPIELEN ? s.vorher.strecke + (s.strecke - s.vorher.strecke) * alpha : s.strecke;
    const par = reduziert ? 0 : 1;
    const drift = reduziert ? 0 : s.zeit * 4;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ebenen.himmel, 0, 0);
    zeichneEbene(ebenen.wolken, strecke * 0.06 * par + drift);
    zeichneEbene(ebenen.fern, strecke * 0.15 * par);
    zeichneEbene(ebenen.mitte, strecke * 0.32 * par);
    zeichneEbene(ebenen.schiffe, strecke * 0.5 * par);
    zeichneGlitzern(s, strecke);
    zeichneVorderWasser(strecke);
    zeichneKranbahn(strecke);
    if (s.zustand !== ZUSTAND.START) for (const h of s.hindernisse) zeichneHindernis(h, strecke);
    zeichnePartikel();
    zeichneFigur(s, alpha, dt);
    if (s.zustand !== ZUSTAND.START) zeichnePunkte(s);
  }

  // Kleine animierte Figur im Startfenster
  function malStartFigur(ziel, t) {
    const g = ziel.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, ziel.width, ziel.height);
    const px = Math.max(1, Math.floor((ziel.height * 0.78) / Figur.H));
    const fl = Math.floor(t * 5) % 2;
    const schub = !reduziert && (t % 1.2) < 0.18;
    const pose = schub ? { beine: 'hoch', gesicht: 'ernst', kappeDy: -1 } : { beine: fl ? 'flattern1' : 'flattern0', gesicht: 'ernst', jacke: fl };
    const bild = Figur.bild(pose, px);
    const bob = reduziert ? 0 : Math.round(Math.sin(t * 2.6) * px * 1.5);
    const x = Math.round((ziel.width - Figur.W * px) / 2);
    const y = Math.round((ziel.height - Figur.H * px) / 2 - px * 2) + bob;
    // Flämmchen aus der Düse
    const dx = x + Figur.DUESE.x * px;
    const dy = y + Figur.DUESE.y * px;
    const flamme = [['#FFD35A', 0], ['#FF805B', 1], ['#24D6CD', 2]];
    for (const [farbe, k] of flamme) {
      if (reduziert && k > 0) continue;
      const len = reduziert ? 1 : 1 + ((Math.floor(t * 12) + k) % 3);
      g.fillStyle = farbe;
      g.fillRect(dx - px + k * px * 0.5, dy + px * (1 + k), px * 2 - k * px * 0.5, px * len);
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(Figur.bild(pose, px), x, y);
    return bild;
  }

  // Dekorative Hafenkulisse an den Seiten großer Bildschirme (wird nur bei Größenänderung gemalt)
  function malKulisse(ziel, w, h, dpr) {
    ziel.width = Math.round(w * dpr);
    ziel.height = Math.round(h * dpr);
    const g = ziel.getContext('2d');
    const verlauf = g.createLinearGradient(0, 0, 0, ziel.height);
    verlauf.addColorStop(0, '#0C1D30');
    verlauf.addColorStop(0.62, '#173A5A');
    verlauf.addColorStop(1, '#10243A');
    g.fillStyle = verlauf;
    g.fillRect(0, 0, ziel.width, ziel.height);
    const e = Math.max(2, Math.round(3 * dpr));   // Pixelgröße der Kulisse
    const r = (x, y, bw, bh, f) => { g.fillStyle = f; g.fillRect(Math.round(x / e) * e, Math.round(y / e) * e, Math.max(e, Math.round(bw / e) * e), Math.max(e, Math.round(bh / e) * e)); };
    const W = ziel.width;
    const Hh = ziel.height;
    const boden = Hh * 0.78;
    const z = zufallsGenerator(42);
    // Sterne
    for (let i = 0; i < 70; i++) r(z() * W, z() * boden * 0.7, e, e, z() < 0.3 ? 'rgba(255, 211, 90, 0.7)' : 'rgba(255, 244, 220, 0.55)');
    // Kräne
    for (let x = W * 0.03; x < W; x += W * 0.23) {
      const hk = Hh * (0.3 + z() * 0.12);
      r(x, boden - hk, e * 3, hk, '#1F4466');
      r(x + e * 14, boden - hk, e * 3, hk, '#1F4466');
      r(x - e * 10, boden - hk - e * 4, e * 44, e * 3, '#22496D');
      r(x + e * 6, boden - hk - e * 16, e * 3, e * 12, '#22496D');
      r(x + e * 28, boden - hk + e * 2, e, hk * 0.25, '#1C3D5C');
      r(x + e * 24, boden - hk + e * 2 + hk * 0.25, e * 9, e * 5, ['#8C4A3E', '#1E7C7A', '#8F7438'][Math.floor(z() * 3)]);
      r(x + e * 7, boden - hk - e * 20, e, e, z() < 0.5 ? '#FF805B' : '#FFD35A');
    }
    // Containerstapel
    const farben = ['#7A3E35', '#1A6F6C', '#7F6531', '#2C4F8A', '#7C3442'];
    for (let x = 0; x < W; x += e * 22) {
      const n = 1 + Math.floor(z() * 4);
      for (let k = 0; k < n; k++) r(x, boden - (k + 1) * e * 8, e * 21, e * 7, farben[Math.floor(z() * farben.length)]);
    }
    r(0, boden, W, Hh - boden, '#0E2236');
    for (let x = 0; x < W; x += e * 12) r(x + z() * e * 6, boden + e * 3 + z() * (Hh - boden - e * 6), e * 5, e, 'rgba(36, 214, 205, 0.25)');
  }

  return {
    init, groesse, zeichne, setzeReduziert, impulsEffekt, unfallEffekt, rekordEffekt,
    effekteSchritt, effekteLeeren, malStartFigur, malKulisse,
    get skala() { return skala; },
  };
})();
