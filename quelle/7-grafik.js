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
  // Themen: Jedes Gebiet hat eigenen Himmel, eigenes Wasser, eigene Fernkulisse
  // und eigenes Wetter. Kräne und Schiffe werden wiederverwendet und passend
  // eingefärbt; Lichter und Schnee kommen nach dem Einfärben dazu.
  // ===================================================================
  const THEMEN = [
    { // 0 · Sonnenhafen
      himmel: [[0, '#6FCBF2'], [110, '#80D3F4'], [190, '#93DCF6'], [250, '#A7E4F7'], [300, '#BCEBF7'], [342, '#D2F2F5'], [380, '#E6F6EE'], [412, '#F7F3DD'], [436, '#FFEFD0']],
      wasser: ['#86D3E9', '#6CC4E2', '#59B5DA', '#47A3CF', '#3A92C3', '#3080B5'],
      vorne: ['#2A86B8', '#1F6F9E', '#185A85', '#123F60'],
      schaum: ['#D9F6F8', '#9EE3EE'], wellen: ['#3A97C6', '#2D7AA6', '#1D5A80'],
      glanz: 'rgba(255, 255, 255, 0.28)', glitzer: 'rgba(255, 255, 255, 0.85)',
      wolken: ['#FFF9EE', '#E2F1F8'],
      himmelExtra: hp => { hp.kreis(284, 132, 44, 'rgba(255, 246, 205, 0.45)'); hp.kreis(284, 132, 32, '#FFE58A'); hp.kreis(280, 128, 22, '#FFF0B8'); },
      fern: malKueste, fernDunst: 'rgba(205, 238, 250, 0.22)',
      mitteDunst: 'rgba(205, 238, 250, 0.12)', schiffDunst: 'rgba(205, 238, 250, 0.1)',
      wetter: null, kulisse: '#9FE3FF',
    },
    { // 1 · Werft im Nebel
      himmel: [[0, '#AFC3D2'], [110, '#BCCCD8'], [190, '#C8D4DC'], [250, '#D3DBDF'], [300, '#DEE1E1'], [342, '#E8E5E0'], [380, '#F0E8DE'], [412, '#F5E9DA'], [436, '#F8EAD6']],
      wasser: ['#A9C4C9', '#98B8BF', '#88ACB5', '#7A9FAA', '#6C939F', '#5F8794'],
      vorne: ['#55808D', '#46717F', '#3A6371', '#2B4D59'],
      schaum: ['#E4EEEE', '#B9CFD2'], wellen: ['#6E97A2', '#5A8590', '#466F7A'],
      glanz: 'rgba(255, 255, 255, 0.22)', glitzer: 'rgba(255, 250, 235, 0.7)',
      wolken: ['#F2EFEA', '#DCE2E6'],
      himmelExtra: hp => { hp.kreis(250, 170, 46, 'rgba(255, 240, 215, 0.4)'); hp.kreis(250, 170, 30, '#FBE9CC'); },
      fern: malWerft, fernDunst: 'rgba(232, 236, 238, 0.42)',
      mitteDunst: 'rgba(225, 230, 234, 0.32)', schiffDunst: 'rgba(225, 230, 234, 0.22)',
      wetter: 'nebel', kulisse: '#C8D4DC',
    },
    { // 2 · Abendmarkt
      himmel: [[0, '#5B3C8C'], [90, '#734396'], [160, '#9A4E9A'], [220, '#C55E94'], [270, '#E8738A'], [315, '#F7907E'], [355, '#FCAE77'], [395, '#FEC97B'], [428, '#FFDD96']],
      wasser: ['#E9A383', '#CF8A88', '#B0738C', '#92628D', '#77528A', '#5F447D'],
      vorne: ['#57407A', '#48356A', '#3A2B5A', '#291F44'],
      schaum: ['#FFE0C8', '#E9A9A8'], wellen: ['#7E5A92', '#68497F', '#52386A'],
      glanz: 'rgba(255, 220, 170, 0.35)', glitzer: 'rgba(255, 226, 160, 0.9)',
      wolken: ['#F9B6A2', '#E58E98'],
      himmelExtra: hp => { hp.kreis(108, 420, 70, 'rgba(255, 214, 140, 0.35)'); hp.kreis(108, 420, 48, '#FFD27A'); hp.kreis(104, 414, 34, '#FFE7A6'); },
      fern: malMarkt, fernDunst: 'rgba(250, 160, 140, 0.16)', fernLicht: lichterMarkt,
      mitteDunst: 'rgba(120, 60, 110, 0.32)', mitteLicht: lichterHallen,
      schiffDunst: 'rgba(120, 60, 110, 0.28)', schiffLicht: lichterSchiffe,
      wetter: 'laternen', kulisse: '#C55E94',
    },
    { // 3 · Nachthafen
      himmel: [[0, '#0B1630'], [110, '#0F1D3D'], [190, '#13244A'], [250, '#182C57'], [300, '#1D3464'], [342, '#233D70'], [380, '#2A477B'], [412, '#315083'], [436, '#38588A']],
      wasser: ['#2E4C78', '#28446E', '#223C63', '#1D3459', '#192D4F', '#142645'],
      vorne: ['#14284A', '#10213F', '#0C1A33', '#081227'],
      schaum: ['#9FB8D8', '#5F7FAE'], wellen: ['#2C4A78', '#233E68', '#1A3156'],
      glanz: 'rgba(255, 220, 140, 0.3)', glitzer: 'rgba(255, 220, 140, 0.9)',
      wolken: null,
      himmelExtra: hp => { sterneMalen(hp, 60, 300); hp.kreis(270, 110, 40, 'rgba(244, 239, 216, 0.12)'); hp.kreis(270, 110, 24, '#F4EFD8'); hp.kreis(280, 104, 20, '#13244A'); },
      fern: malStadt, fernDunst: 'rgba(10, 22, 50, 0.35)', fernLicht: lichterStadt,
      mitteDunst: 'rgba(8, 18, 45, 0.55)', mitteLicht: lichterHallen,
      schiffDunst: 'rgba(8, 18, 45, 0.5)', schiffLicht: lichterSchiffe,
      wetter: 'sterne', kulisse: '#13244A',
    },
    { // 4 · Sturmküste
      himmel: [[0, '#47535F'], [110, '#53606C'], [190, '#5F6C77'], [250, '#6B7782'], [300, '#77828C'], [342, '#838D96'], [380, '#8F98A0'], [412, '#9AA2A9'], [436, '#A4ABB1']],
      wasser: ['#62797F', '#566E75', '#4B636B', '#405961', '#364F57', '#2C454E'],
      vorne: ['#2E4A52', '#264048', '#1E363E', '#152A31'],
      schaum: ['#E3ECEC', '#AFC2C4'], wellen: ['#4C6970', '#3F5C63', '#2F4C53'],
      glanz: 'rgba(230, 240, 240, 0.25)', glitzer: 'rgba(230, 240, 245, 0.6)',
      wolken: ['#3E4954', '#323C46'], wolkenGross: true,
      himmelExtra: () => {},
      fern: malKlippen, fernDunst: 'rgba(160, 170, 178, 0.22)', fernLicht: lichterLeuchtturm,
      mitteDunst: 'rgba(90, 100, 110, 0.38)', schiffDunst: 'rgba(90, 100, 110, 0.32)',
      wetter: 'regen', kulisse: '#53606C',
    },
    { // 5 · Eishafen
      himmel: [[0, '#93D1EC'], [110, '#A5DAF0'], [190, '#B6E2F3'], [250, '#C7E9F5'], [300, '#D6EFF7'], [342, '#E3F4F8'], [380, '#EDF7F9'], [412, '#F5FAFB'], [436, '#FAFCFC']],
      wasser: ['#94CDDD', '#81C0D3', '#6FB3C9', '#60A6BF', '#529AB4', '#468DA9'],
      vorne: ['#3E86A4', '#337896', '#286A88', '#1D5774'],
      schaum: ['#FFFFFF', '#CDEFF6'], wellen: ['#4E9CBC', '#3C8AAA', '#2C7494'],
      glanz: 'rgba(255, 255, 255, 0.45)', glitzer: 'rgba(255, 255, 255, 0.95)',
      wolken: ['#FFFFFF', '#DDEEF6'],
      himmelExtra: hp => { hp.kreis(84, 112, 36, 'rgba(255, 250, 225, 0.45)'); hp.kreis(84, 112, 22, '#FFF6D8'); },
      fern: malEis, fernDunst: 'rgba(225, 245, 252, 0.2)',
      mitteDunst: 'rgba(205, 235, 250, 0.2)', mitteLicht: schneeHallen,
      schiffDunst: 'rgba(205, 235, 250, 0.16)', schiffLicht: schneeSchiffe,
      wetter: 'schnee', kulisse: '#B6E2F3',
    },
    { // 6 · Hafenfest
      himmel: [[0, '#1A1240'], [110, '#22184F'], [190, '#2B1E5C'], [250, '#352569'], [300, '#402C74'], [342, '#4C347E'], [380, '#593D86'], [412, '#67468C'], [436, '#744F90']],
      wasser: ['#56488E', '#4B4084', '#423878', '#39316D', '#302A62', '#282357'],
      vorne: ['#2A2458', '#221D4B', '#1B173E', '#120F2E'],
      schaum: ['#D9C8FF', '#9C86D6'], wellen: ['#4B3F86', '#3F3575', '#322A62'],
      glanz: 'rgba(255, 200, 230, 0.3)', glitzer: 'rgba(255, 214, 120, 0.95)',
      wolken: null,
      himmelExtra: hp => sterneMalen(hp, 40, 260),
      fern: malFest, fernDunst: 'rgba(40, 20, 80, 0.25)', fernLicht: lichterFest,
      mitteDunst: 'rgba(30, 15, 70, 0.5)', mitteLicht: lichterHallen,
      schiffDunst: 'rgba(30, 15, 70, 0.45)', schiffLicht: lichterSchiffe,
      wetter: 'feuerwerk', kulisse: '#2B1E5C',
    },
  ];
  let thema = 0;

  // ===================================================================
  // Vorgezeichnete Hintergrundebenen
  // ===================================================================
  function ebene(breite, y0, hoehe, malen, dunst, nachher) {
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
    if (nachher) nachher(maler(g, skala, y0));
    return { c, breite, y0, devB: c.width };
  }

  function sterneMalen(hp, anzahl, bisY) {
    const z = zufallsGenerator(99);
    for (let i = 0; i < anzahl; i++) {
      const x = Math.floor(z() * B / 2) * 2;
      const y = Math.floor(z() * bisY / 2) * 2;
      hp.r(x, y, 2, 2, z() < 0.25 ? 'rgba(255, 220, 140, 0.8)' : 'rgba(255, 250, 235, 0.65)');
    }
  }

  // ---------- Fernkulissen (Breite 720, wiederholt sich) ----------
  function malKueste(f) {
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
  }

  // Werft: Schiffsrumpf auf der Helling mit Gerüst, Portalkran, Werfthalle
  function malWerft(f) {
    for (let x = 0; x < 720; x += 24) f.r(x, HORIZONT - 8, 24, 8, '#9DB3C1');
    // Rumpf
    for (let y = 372; y < HORIZONT - 6; y += 4) {
      const einzug = Math.max(0, (y - 410) * 1.6);
      f.r(70 + einzug * 0.4, y, 230 - einzug, 4, y > 420 ? '#C3907F' : '#8EA3B4');
    }
    f.r(70, 368, 230, 4, '#A9BAC7');
    f.r(250, 346, 34, 22, '#A9BAC7');
    f.r(256, 334, 10, 12, '#8EA3B4');
    // Gerüst
    for (let x = 60; x <= 310; x += 18) f.r(x, 330, 2, HORIZONT - 330, '#AEBECA');
    for (let y = 340; y < HORIZONT; y += 22) f.r(58, y, 256, 2, '#AEBECA');
    // Portalkran
    f.r(370, 318, 6, HORIZONT - 318, '#9AAEBE');
    f.r(470, 318, 6, HORIZONT - 318, '#9AAEBE');
    f.r(356, 310, 136, 8, '#9AAEBE');
    f.r(410, 318, 22, 12, '#8A9FB0');
    f.r(420, 330, 2, 30, '#8A9FB0');
    // Halle
    f.r(540, 360, 150, HORIZONT - 360, '#A0B4C3');
    for (let dx = 0; dx < 150; dx += 30) { f.r(540 + dx, 352, 30, 8, '#93A8B8'); f.r(548 + dx, 346, 14, 6, '#93A8B8'); }
    f.r(590, 388, 50, HORIZONT - 388, '#8A9FB0');
  }

  // Abendmarkt: Giebelhäuser, Kirchturm, Markthalle
  function malMarkt(f) {
    const z = zufallsGenerator(21);
    const farben = ['#9C5E8E', '#8A527F', '#B06A8E', '#A25F86'];
    for (let x = 0; x < 720;) {
      const w = 26 + Math.floor(z() * 4) * 4;
      const h = 30 + Math.floor(z() * 6) * 5;
      const farbe = farben[Math.floor(z() * farben.length)];
      f.r(x, HORIZONT - h, w, h, farbe);
      for (let s = 2; s < w / 2; s += 2) f.r(x + s, HORIZONT - h - s, w - s * 2, 2, farbe);
      x += w + 2;
    }
    // Kirchturm
    f.r(420, 330, 24, HORIZONT - 330, '#7E4A77');
    for (let s = 0; s < 12; s++) f.r(424 + s / 2, 330 - s * 3, 16 - s, 3, '#7E4A77');
    f.r(429, 346, 6, 8, '#6A3C64');
  }
  function lichterMarkt(f) {
    const z = zufallsGenerator(22);
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(z() * 700 / 2) * 2 + 6;
      const y = HORIZONT - 8 - Math.floor(z() * 7) * 5;
      f.r(x, y, 4, 4, z() < 0.6 ? '#FFD98A' : '#FFB86A');
    }
    f.r(430, 348, 4, 4, '#FFD98A');
  }

  // Nachthafen: Hochhäuser und Speicher mit erleuchteten Fenstern
  function malStadt(f) {
    const z = zufallsGenerator(31);
    for (let x = 0; x < 720;) {
      const w = 30 + Math.floor(z() * 5) * 6;
      const h = 34 + Math.floor(z() * 9) * 9;
      f.r(x, HORIZONT - h, w, h, z() < 0.5 ? '#203760' : '#1A2E54');
      if (z() < 0.3) f.r(x + w / 2 - 1, HORIZONT - h - 12, 2, 12, '#203760');
      x += w + 4;
    }
  }
  function lichterStadt(f) {
    const z = zufallsGenerator(32);
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(z() * 700 / 4) * 4 + 6;
      const y = HORIZONT - 10 - Math.floor(z() * 16) * 6;
      if (z() < 0.55) f.r(x, y, 2, 3, z() < 0.7 ? 'rgba(255, 214, 120, 0.9)' : 'rgba(150, 220, 255, 0.8)');
    }
    for (let x = 30; x < 720; x += 140) f.r(x, HORIZONT - 90, 2, 2, '#FF5A5A');
  }

  // Sturmküste: Felsklippen mit Leuchtturm
  function malKlippen(f) {
    const z = zufallsGenerator(41);
    let h = 20;
    for (let x = 0; x < 720; x += 8) {
      const ziel = x > 380 && x < 680 ? 92 : 24;
      h += (ziel - h) * 0.12 + (z() * 2 - 1) * 4;
      f.r(x, HORIZONT - h, 8, h, x % 16 === 0 ? '#58665F' : '#52605A');
      f.r(x, HORIZONT - h, 8, 3, '#6C7C74');
    }
    const lx = 540;
    const fuss = HORIZONT - 96;
    for (let y = fuss - 64; y < fuss; y += 4) {
      const w = 10 + Math.round(((y - fuss + 64) / 64) * 6 / 2) * 2;
      f.r(lx - w / 2, y, w, 4, Math.floor((y - fuss + 64) / 12) % 2 === 0 ? '#D96E5E' : '#ECE6DA');
    }
    f.r(lx - 9, fuss - 76, 18, 12, '#3B4650');
    f.r(lx - 7, fuss - 82, 14, 6, '#C25A4C');
  }
  function lichterLeuchtturm(f) {
    const lx = 540;
    const y = HORIZONT - 96 - 70;
    for (let i = 0; i < 9; i++) f.r(lx + 8 + i * 12, y - 1 - i * 1.5, 12, 3 + i * 3, `rgba(255, 238, 170, ${0.32 - i * 0.03})`);
    f.r(lx - 5, y - 3, 10, 6, '#FFE58A');
  }

  // Eishafen: Gletscherberge und Eisberge
  function malEis(f) {
    const berg = (x, w, h, farbe, kappe) => {
      for (let s = 0; s < h; s += 4) {
        const bw = w * (s / h);
        f.r(x + (w - bw) / 2, HORIZONT - h + s, bw, 4, s < h * 0.3 ? kappe : farbe);
      }
    };
    berg(-30, 240, 120, '#BBD9E6', '#F4FBFF');
    berg(180, 200, 96, '#B2D2E0', '#F4FBFF');
    berg(400, 280, 136, '#BBD9E6', '#F4FBFF');
    berg(640, 160, 84, '#B2D2E0', '#F4FBFF');
    // Eisberge im Wasser
    for (const [x, w, h] of [[120, 54, 26], [330, 40, 20], [560, 70, 32]]) {
      for (let s = 0; s < h; s += 2) {
        const bw = Math.min(w, 12 + s * 2.4);
        f.r(x + (w - bw) / 2, HORIZONT - h + s, bw, 2, s < 6 ? '#FFFFFF' : '#DDF1FA');
      }
      f.r(x + w / 2, HORIZONT - h + 6, w / 2 - 4, h - 6, '#C2E3F1');
    }
  }

  // Hafenfest: Riesenrad, Festzelte, Lampionketten
  function malFest(f) {
    // Zelte
    for (const [x, w, h] of [[40, 70, 40], [150, 90, 52], [270, 60, 34]]) {
      for (let s = 0; s < h; s += 2) {
        const bw = Math.min(w, 8 + s * 2.6);
        for (let k = 0; k < bw; k += 10) f.r(x + (w - bw) / 2 + k, HORIZONT - h + s, Math.min(5, bw - k), 2, '#C04A6A');
        for (let k = 5; k < bw; k += 10) f.r(x + (w - bw) / 2 + k, HORIZONT - h + s, Math.min(5, bw - k), 2, '#E8D6E8');
      }
      f.r(x + w / 2 - 1, HORIZONT - h - 8, 2, 8, '#E8D6E8');
    }
    // Riesenrad
    const cx = 520;
    const cy = 356;
    const r = 66;
    f.r(cx - 30, cy, 4, HORIZONT - cy, '#5A4890');
    f.r(cx + 26, cy, 4, HORIZONT - cy, '#5A4890');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      f.linie(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, '#6B57A6');
    }
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      f.r(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4, '#7A66B8');
    }
    f.kreis(cx, cy, 6, '#7A66B8');
  }
  function lichterFest(f) {
    const cx = 520;
    const cy = 356;
    const r = 66;
    const farben = ['#FFD35A', '#FF805B', '#24D6CD', '#FF9AD5'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      f.r(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r, 8, 7, farben[i % 4]);
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.13;
      f.r(cx + Math.cos(a) * (r - 2) - 1, cy + Math.sin(a) * (r - 2) - 1, 2, 2, '#FFF4DC');
    }
    // Lampionkette über den Zelten
    for (let x = 20; x < 360; x += 12) {
      const y = 382 + Math.sin((x / 340) * Math.PI) * 14;
      f.r(x, y, 4, 5, farben[(x / 12) % 4 | 0]);
    }
  }

  // ---------- Kräne, Hallen und Schiffe (für alle Themen, nur eingefärbt) ----------
  function malKraene(m) {
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
  }
  function lichterHallen(m) {
    for (const [x, w, h] of [[220, 120, 44], [590, 100, 36]]) {
      for (let dx = 8; dx < w - 8; dx += 14) m.r(x + dx, HORIZONT - h + 10, 8, 6, 'rgba(255, 214, 120, 0.85)');
    }
    for (const x of [76, 446]) { m.r(x, 314, 4, 4, '#FF5A5A'); m.r(x + 70, 352, 3, 3, '#FFD35A'); }
  }
  function schneeHallen(m) {
    for (const [x, w, h] of [[220, 120, 44], [590, 100, 36]]) {
      for (let dx = 0; dx < w; dx += 20) { m.r(x + dx, HORIZONT - h - 14, 20, 3, '#FFFFFF'); m.r(x + dx + 8, HORIZONT - h - 10, 12, 2, '#FFFFFF'); }
    }
    for (const x of [60, 430]) { m.r(x - 34, 354, 158, 3, '#FFFFFF'); m.r(x - 6, 364, 58, 2, '#FFFFFF'); }
  }

  function malSchiffe(sp) {
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
  }
  function lichterSchiffe(sp) {
    for (let k = 0; k < 6; k++) sp.r(92 + k * 24, 488, 3, 3, 'rgba(255, 214, 120, 0.9)');
    sp.r(94, 455, 4, 3, 'rgba(255, 214, 120, 0.9)');
    sp.r(500, 480, 4, 3, 'rgba(255, 214, 120, 0.9)');
    sp.r(717, 438, 4, 4, '#FF5A5A');
    sp.r(361, 492, 4, 4, '#FF5A5A');
  }
  function schneeSchiffe(sp) {
    for (let k = 0; k < 9; k++) if (k % 3 !== 1) sp.r(110 + k * 14, 455, 13, 3, '#FFFFFF'); else sp.r(110 + k * 14, 466, 13, 3, '#FFFFFF');
    sp.r(86, 448, 18, 3, '#FFFFFF');
    sp.r(492, 474, 20, 3, '#FFFFFF');
  }

  function baueEbenen() {
    const T = THEMEN[thema];
    // ---- Himmel, Sonne und Hafenbecken (steht still) ----
    const himmel = leinwand(B * skala, H * skala);
    const hp = maler(himmel.getContext('2d'), skala);
    T.himmel.forEach(([y, f], i) => {
      const bis = i + 1 < T.himmel.length ? T.himmel[i + 1][0] : HORIZONT;
      hp.r(0, y, B, bis - y, f);
    });
    T.himmelExtra(hp);
    const wy = [HORIZONT, 454, 470, 494, 522, 552];
    T.wasser.forEach((f, i) => hp.r(0, wy[i], B, (i + 1 < wy.length ? wy[i + 1] : K.WASSER) - wy[i], f));
    hp.r(0, K.WASSER, B, 6, T.vorne[0]);
    hp.r(0, K.WASSER + 6, B, 14, T.vorne[1]);
    hp.r(0, K.WASSER + 20, B, 16, T.vorne[2]);
    hp.r(0, K.WASSER + 36, B, H - K.WASSER - 36, T.vorne[3]);
    for (const [x, y, w] of [[20, 462, 40], [150, 466, 24], [230, 478, 56], [60, 506, 30], [300, 512, 34], [190, 540, 46], [24, 560, 28]]) {
      hp.r(x, y, w, 2, T.glanz);
    }

    // ---- Wolken ----
    let wolken = null;
    if (T.wolken) {
      wolken = ebene(720, 30, 250, w => {
        const wolke = (x, y, b) => {
          const [c, sch] = T.wolken;
          w.kreis(x + b * 0.3, y + 14, Math.round(b * 0.16), c);
          w.kreis(x + b * 0.56, y + 10, Math.round(b * 0.21), c);
          w.kreis(x + b * 0.78, y + 16, Math.round(b * 0.13), c);
          w.r(x + 6, y + 16, b - 12, 12, c);
          w.kreis(x + 8, y + 22, 6, c);
          w.kreis(x + b - 8, y + 22, 6, c);
          w.r(x + 6, y + 26, b - 12, 4, sch);
        };
        const f = T.wolkenGross ? 1.7 : 1;
        wolke(30, 40, 92 * f);
        wolke(250, 110, 70 * f);
        wolke(420, 30, 116 * f);
        wolke(600, 140, 84 * f);
        wolke(170, 210 - (f > 1 ? 40 : 0), 60 * f);
        wolke(540, 230 - (f > 1 ? 60 : 0), 50 * f);
      });
    }

    const fern = ebene(720, 280, HORIZONT - 280, T.fern, T.fernDunst, T.fernLicht);
    const mitte = ebene(720, 300, HORIZONT + 10 - 300, malKraene, T.mitteDunst, T.mitteLicht);
    const schiffe = ebene(900, 430, 80, malSchiffe, T.schiffDunst, T.schiffLicht);

    // ---- Kranbahn oben (Muster wiederholt sich alle 48 Punkte) ----
    const kranbahn = ebene(B + 48, 0, K.DECKE + 2, k => {
      k.r(0, 0, B + 48, 9, '#1D3A57');
      k.r(0, 0, B + 48, 2, '#3B6286');
      for (let x = 6; x < B + 48; x += 24) k.r(x, 4, 2, 2, '#7FA3C2');
      // Gelb-blaue Warnstreifen: hier ist die obere Grenze
      k.r(0, 9, B + 48, 5, NAVY);
      for (let x = -16; x < B + 56; x += 16) for (let j = 0; j < 5; j++) k.r(x + j, 9 + j, 8, 1, GELB);
      k.r(0, K.DECKE, B + 48, 2, 'rgba(16, 36, 58, 0.28)');
    });

    // ---- Schaumkronen (ziehen mit der Welt) und Wellenstriche (etwas langsamer) ----
    const schaum = ebene(B + 32, K.WASSER, 4, w => {
      for (let x = 0; x < B + 32; x += 32) {
        w.r(x, K.WASSER, 14, 2, T.schaum[0]);
        w.r(x + 14, K.WASSER + 2, 6, 2, T.schaum[1]);
      }
    });
    const wellen = ebene(B + 192, K.WASSER + 10, 38, w => {
      for (let x = 0; x < B + 192; x += 48) w.r(x, K.WASSER + 12, 12, 2, T.wellen[0]);
      for (let x = 20; x < B + 192; x += 64) w.r(x, K.WASSER + 27, 16, 2, T.wellen[1]);
      for (let x = 8; x < B + 192; x += 96) w.r(x, K.WASSER + 44, 20, 2, T.wellen[2]);
    });

    ebenen = { himmel, wolken, fern, mitte, schiffe, kranbahn, schaum, wellen, wetter: baueWetter(T.wetter), wind: baueWindLinien() };
    sprites = null;
    punkteBild = null;
  }

  // ---------- Wetter: einmal vorgezeichnete Kacheln, die nur verschoben werden ----------
  function baueWetter(art) {
    if (art === 'nebel') {
      return ebene(B * 2, 0, H, w => {
        const z = zufallsGenerator(5);
        for (let i = 0; i < 9; i++) {
          const x = z() * B * 2;
          const y = 120 + z() * 380;
          const b = 120 + z() * 160;
          // Nebelbank aus weichen Streifen; am Rand nahtlos auf die andere Seite
          for (const dx of [0, -B * 2, B * 2]) {
            for (let s = -5; s < 6; s++) w.r(x + dx - b / 2 + Math.abs(s) * 8, y + s * 4, b - Math.abs(s) * 16, 4, 'rgba(250, 250, 248, 0.09)');
          }
        }
      });
    }
    if (art === 'regen') {
      return ebene(B, 0, H, w => {
        const z = zufallsGenerator(6);
        for (let i = 0; i < 70; i++) {
          const x = Math.floor(z() * B / 2) * 2;
          const y = Math.floor(z() * H / 2) * 2;
          const l = 10 + Math.floor(z() * 4) * 4;
          for (let k = 0; k < l; k += 2) w.r(((x - k * 0.35) % B + B) % B, (y + k) % H, 1.5, 2, 'rgba(220, 235, 245, 0.45)');
        }
      });
    }
    if (art === 'schnee') {
      return ebene(B, 0, H, w => {
        const z = zufallsGenerator(7);
        for (let i = 0; i < 60; i++) {
          const x = Math.floor(z() * B / 2) * 2;
          const y = Math.floor(z() * H / 2) * 2;
          const g = z() < 0.3 ? 4 : 2;
          w.r(x, y, g, g, 'rgba(255, 255, 255, 0.9)');
        }
      });
    }
    if (art === 'laternen') {
      // Aufsteigende Himmelslaternen im Abendhimmel
      return ebene(B, 0, H, w => {
        const z = zufallsGenerator(8);
        for (let i = 0; i < 9; i++) {
          const x = Math.floor(z() * (B - 12));
          const y = 40 + Math.floor(z() * 360);
          w.r(x - 2, y - 2, 10, 12, 'rgba(255, 200, 120, 0.25)');
          w.r(x, y, 6, 8, '#FFC46A');
          w.r(x + 1, y + 1, 4, 3, '#FFE4A0');
        }
      });
    }
    return null;
  }
  function baueWindLinien() {
    return ebene(B, 0, H, w => {
      const z = zufallsGenerator(9);
      for (let i = 0; i < 34; i++) {
        const x = 8 + Math.floor(z() * (B - 16) / 2) * 2;
        const y = Math.floor(z() * H / 2) * 2;
        const l = 18 + Math.floor(z() * 4) * 8;
        w.r(x, y, 2, l, 'rgba(255, 255, 255, 0.55)');
        if (y + l > H) w.r(x, y - H, 2, l, 'rgba(255, 255, 255, 0.55)');
      }
    });
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
      p.r(Math.floor(x / 2) * 2, y, 4, 2, THEMEN[thema].glitzer);
      if (!reduziert && Math.sin(t * 3 + i * 1.7) > 0.85) {
        p.r(Math.floor(x / 2) * 2 + 1, y - 2, 2, 6, 'rgba(255, 255, 255, 0.6)');
      }
    }
  }

  // Kachel nach links schieben; periode = Musterlänge, damit es nahtlos weiterläuft
  function schiebe(e, verschiebung, periode) {
    const off = Math.round((((verschiebung % periode) + periode) % periode) * skala);
    ctx.drawImage(e.c, -off, Math.round(e.y0 * skala));
  }

  function zeichneVorderWasser(strecke) {
    schiebe(ebenen.wellen, strecke * 0.85, 192);
    schiebe(ebenen.schaum, strecke, 32);
  }

  function zeichneKranbahn(strecke) {
    schiebe(ebenen.kranbahn, strecke, 48);
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

  // Ein Hindernis wird einmal in zwei eigene Bilder gemalt (oben hängend, unten stehend)
  // und danach nur verschoben. Das spart pro Bild Hunderte Zeichenbefehle (wichtig für Handys).
  // Schwebende Container: Das obere Bild hängt an langen Seilen und wird mit der Lücke
  // verschoben; das untere steht auf einem Ponton, der mitschaukelt.
  function zeichneHindernis(h, strecke) {
    const sx = h.x - strecke;
    if (sx > B + 4 || sx + h.b < -4) return;
    if (!h.bild || h.bildSkala !== skala || h.bildThema !== thema) baueHindernisBild(h);
    const X = Math.round(sx * skala);
    ctx.drawImage(h.bild.oben, X, Math.round((h.versatz - h.amp) * skala));
    ctx.drawImage(h.bild.unten, X, Math.round(h.unten * skala));
  }

  function baueHindernisBild(h) {
    const hauptMaler = p;
    const z = zufallsGenerator(h.saat);
    // oben: Bild reicht von 0 bis zur tiefsten Lage der Lückenoberkante
    const T = h.oben0 + h.amp;
    const oben = leinwand(h.b * skala, T * skala);
    p = maler(oben.getContext('2d'), skala);
    malHaengend(h, T, z);
    // unten: Bild beginnt an der Lückenunterkante und reicht bis unter den Bildrand
    const U = h.unten0;
    const unten = leinwand(h.b * skala, (H - U + h.amp + 4) * skala);
    p = maler(unten.getContext('2d'), skala, U);
    malStehend(h, U, z);
    p = hauptMaler;
    h.bild = { oben, unten };
    h.bildSkala = skala;
    h.bildThema = thema;
  }

  // Hängende Container mit Spreizer und Seilen (Laufkatze wird extra gezeichnet)
  function malHaengend(h, T, z) {
    const W = h.b;
    const farbe = () => CONTAINER_FARBEN[Math.floor(z() * CONTAINER_FARBEN.length)];
    const deko = () => (z() < 0.55 ? 1 + Math.floor(z() * 5) : 0);
    const spreizEnde = K.DECKE + K.SEIL + K.SPREIZER;
    const hoehe = h.oben0 - h.amp - spreizEnde;      // Stapelhöhe in der höchsten Lage
    const stapelOben = T - hoehe;
    const spreizer = stapelOben - K.SPREIZER;
    for (const sx of seilPositionen(W)) p.r(sx, 0, 2, spreizer, '#34495F');
    p.r(4, spreizer, W - 8, K.SPREIZER, NAVY);
    p.r(6, spreizer + 1, W - 12, K.SPREIZER - 2, GELB);
    for (let k = 10; k < W - 10; k += 10) p.r(k, spreizer + 1, 4, K.SPREIZER - 2, NAVY);
    const st = stapel(hoehe);
    for (let i = 0; i < st.n; i++) container(0, stapelOben + i * st.h, W, st.h, farbe(), deko(), z);
    if (h.amp) {
      // Kleine Warnleuchte unter dem schwebenden Stapel: „ich bewege mich“
      p.r(W / 2 - 5, T - 4, 10, 4, NAVY);
      p.r(W / 2 - 3, T - 3, 6, 2, '#FF805B');
    }
  }
  function seilPositionen(W) {
    return W > K.HINDERNIS_B ? [19, W / 2 - 1, W - 21] : [19, W - 21];
  }

  // Stehender Stapel auf Betonsockel (fest) oder Ponton (schwebend)
  function malStehend(h, U, z) {
    const W = h.b;
    const farbe = () => CONTAINER_FARBEN[Math.floor(z() * CONTAINER_FARBEN.length)];
    const deko = () => (z() < 0.55 ? 1 + Math.floor(z() * 5) : 0);
    const pierY = K.WASSER - K.PIER;
    const st = stapel(pierY - U);
    for (let i = 0; i < st.n; i++) container(0, U + i * st.h, W, st.h, farbe(), deko(), z);
    if (THEMEN[thema].wetter === 'schnee') {
      // Schneehaube auf dem obersten Container (innerhalb der Trefferfläche)
      p.r(2, U + 1, W - 4, 3, '#FFFFFF');
      for (let k = 6; k < W - 8; k += 14) p.r(k, U + 4, 6, 2, '#FFFFFF');
    }
    p.r(0, pierY, W, K.PIER, NAVY);
    p.r(2, pierY, W - 4, K.PIER, h.amp ? '#FFB59E' : '#C9D4E0');
    p.r(2, pierY + K.PIER - 4, W - 4, 4, h.amp ? '#E5664A' : '#9FB0C4');
    for (let k = 0; k < W - 4; k += 8) p.r(2 + k, pierY + 2, 4, 4, k % 16 === 0 ? GELB : NAVY);
    const unterkante = H + h.amp + 4;
    if (h.amp) {
      // Ponton: schwimmt und schaukelt mit
      p.r(0, pierY + K.PIER, W, unterkante - pierY - K.PIER, NAVY);
      p.r(3, pierY + K.PIER, W - 6, unterkante - pierY - K.PIER, '#C9553A');
      p.r(3, pierY + K.PIER + 6, W - 6, 3, '#FFF4DC');
      return;
    }
    for (const tx of [8, W - 20]) {
      p.r(tx, pierY + 8, 12, 10, '#1B2A3D');
      p.r(tx + 4, pierY + 11, 4, 4, '#3A4A5E');
    }
    // Pfähle unter Wasser
    const pfaehle = W > K.HINDERNIS_B ? [6, W / 2 - 6, W - 18] : [6, W - 18];
    for (const px of pfaehle) {
      p.r(px, K.WASSER, 12, unterkante - K.WASSER, '#0F3550');
      p.r(px, K.WASSER, 4, unterkante - K.WASSER, '#1A4A6E');
      p.r(px - 2, K.WASSER + 2, 16, 2, '#9EE3EE');
    }
  }

  // ---------- Kleine Bilder, die oft gebraucht werden ----------
  let sprites = null;
  function baueSprites() {
    const mal = (w, h, f) => {
      const c = leinwand(w * skala, h * skala);
      const hauptMaler = p;
      p = maler(c.getContext('2d'), skala);
      f(c.getContext('2d'));
      p = hauptMaler;
      return c;
    };
    const laufkatze = W => mal(W, 20, () => {
      p.r(16, 3, 8, 8, '#3B4E66');
      p.r(W - 24, 3, 8, 8, '#3B4E66');
      if (W > K.HINDERNIS_B) p.r(W / 2 - 4, 3, 8, 8, '#3B4E66');
      p.r(12, 10, W - 24, 9, NAVY);
      p.r(14, 11, W - 28, 6, GELB);
      p.r(14, 15, W - 28, 2, '#D6A332');
    });
    // Stern: glatt gezeichnet mit dickem Umriss
    const sternPfad = (g, cx, cy, ra, ri) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? ri : ra;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.closePath();
    };
    const stern = (gr, voll) => mal(gr, gr, g => {
      g.scale(skala, skala);
      const m = gr / 2;
      if (voll) {
        g.fillStyle = 'rgba(255, 211, 90, 0.28)';
        g.beginPath(); g.arc(m, m, m - 0.5, 0, Math.PI * 2); g.fill();
      }
      sternPfad(g, m, m + 0.8, m * 0.82, m * 0.38);
      g.lineJoin = 'round';
      g.lineWidth = Math.max(2, gr * 0.09);
      g.strokeStyle = NAVY;
      g.fillStyle = voll ? GELB : 'rgba(16, 36, 58, 0.55)';
      g.fill();
      g.stroke();
      if (voll) {
        sternPfad(g, m - gr * 0.05, m - gr * 0.02, m * 0.45, m * 0.2);
        g.fillStyle = '#FFF4B8';
        g.fill();
      } else {
        g.strokeStyle = 'rgba(255, 244, 220, 0.6)';
        g.lineWidth = 1.2;
        sternPfad(g, m, m + 0.8, m * 0.62, m * 0.28);
        g.stroke();
      }
    });
    // Ziellinie: karierter Streifen über die ganze Höhe und ein Schild unter der Kranbahn
    const ziel = mal(64, H, g => {
      for (let y = K.DECKE; y < K.WASSER; y += 8) {
        p.r(28, y, 4, 4, (y / 8) % 2 ? 'rgba(255, 244, 220, 0.85)' : 'rgba(16, 36, 58, 0.85)');
        p.r(32, y, 4, 4, (y / 8) % 2 ? 'rgba(16, 36, 58, 0.85)' : 'rgba(255, 244, 220, 0.85)');
        p.r(28, y + 4, 4, 4, (y / 8) % 2 ? 'rgba(16, 36, 58, 0.85)' : 'rgba(255, 244, 220, 0.85)');
        p.r(32, y + 4, 4, 4, (y / 8) % 2 ? 'rgba(255, 244, 220, 0.85)' : 'rgba(16, 36, 58, 0.85)');
      }
      p.r(4, 22, 56, 26, NAVY);
      p.r(6, 24, 52, 22, GELB);
      g.save();
      g.scale(skala, skala);
      g.font = '10px "Press Start 2P", "Courier New", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = NAVY;
      g.fillText('ZIEL', 32, 36);
      g.restore();
    });
    // Wind-Schild: Pfeile und „BÖE“
    const windSchild = richtung => mal(78, 28, g => {
      g.save();
      g.scale(skala, skala);
      g.fillStyle = 'rgba(16, 36, 58, 0.88)';
      g.strokeStyle = '#7FF3EC';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect ? g.roundRect(1, 1, 76, 26, 7) : g.rect(1, 1, 76, 26);
      g.fill();
      g.stroke();
      g.fillStyle = '#7FF3EC';
      for (const ax of [10, 24]) {
        g.beginPath();
        if (richtung < 0) { g.moveTo(ax - 6, 18); g.lineTo(ax, 8); g.lineTo(ax + 6, 18); }
        else { g.moveTo(ax - 6, 10); g.lineTo(ax, 20); g.lineTo(ax + 6, 10); }
        g.closePath();
        g.fill();
      }
      g.font = '9px "Press Start 2P", "Courier New", monospace';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = CREME;
      g.fillText('WIND', 35, 15);
      g.restore();
    });
    sprites = {
      laufkatze: { [K.HINDERNIS_B]: laufkatze(K.HINDERNIS_B), [K.LANG_B]: laufkatze(K.LANG_B) },
      stern: stern(26, true), sternHud: stern(18, true), sternLeer: stern(18, false),
      ziel, windHoch: windSchild(-1), windRunter: windSchild(1),
      schrift: document.fonts ? document.fonts.status : 'loaded',
    };
  }

  function zeichneLaufkatzen(s, strecke) {
    for (const h of s.hindernisse) {
      const sx = h.x - strecke;
      if (sx > B + 4 || sx + h.b < -4) continue;
      ctx.drawImage(sprites.laufkatze[h.b], Math.round(sx * skala), 0);
    }
  }

  // Sterne in den Lücken: drehen sich langsam und wippen leicht
  function zeichneSterneWelt(s, strecke) {
    const spr = sprites.stern;
    for (const h of s.hindernisse) {
      if (!h.muenze || h.geholt) continue;
      const pos = sternPos(h);
      const x = pos.x - strecke;
      if (x < -20 || x > B + 20) continue;
      const dreh = reduziert ? 1 : 0.4 + 0.6 * Math.abs(Math.cos(s.zeit * 2.2 + h.i));
      const bob = reduziert ? 0 : Math.sin(s.zeit * 3 + h.i) * 2;
      const w = 26 * dreh;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spr, Math.round((x - w / 2) * skala), Math.round((pos.y - 13 + bob) * skala), Math.max(1, Math.round(w * skala)), Math.round(26 * skala));
      ctx.imageSmoothingEnabled = false;
    }
  }

  function zeichneZiel(s, strecke) {
    if (s.zielX === null) return;
    const x = s.zielX - strecke;
    if (x < -64 || x > B + 4) return;
    ctx.drawImage(sprites.ziel, Math.round((x - 32) * skala), 0);
  }

  // ---------- Partikel ----------
  function neuesTeilchen(t) {
    if (partikel.length >= K.MAX_PARTIKEL) partikel.shift();
    partikel.push(t);
  }

  function duesenPos(y, winkel) {
    const dx = Figur.DUESE.x;
    const dy = Figur.DUESE.y;
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
    const welt = aktuellesTempo(s);
    // Dauerfunken und Rauchwölkchen aus dem Rucksack
    if (!reduziert && (s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.BEREIT || s.zustand === ZUSTAND.START || s.zustand === ZUSTAND.ZIEL)) {
      emitterZeit += dt;
      while (emitterZeit > 0.07) {
        emitterZeit -= 0.07;
        const y = s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.ZIEL ? s.figur.y : schwebeY(s);
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
    for (let i = 0; i < 3; i++) if (sternPop[i] > 0) sternPop[i] = Math.max(0, sternPop[i] - dt);
    feuerwerkSchritt(dt);
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

  const glatt = u => u * u * (3 - 2 * u);

  // Fließende Bewegung statt fester Posen: Beine ziehen nach dem Schub weich hoch und
  // sinken wieder, im Fall schlenkern Stiefel und Jackensaum, die Mütze wippt kurz.
  function bewegung(s) {
    const t = s.zeit;
    const ruhig = reduziert ? 0 : 1;
    if (s.zustand === ZUSTAND.ENDE) {
      const u = s.unfall.zeit;
      return {
        hub: 0.2, arm: 0.3, kappe: 0, gesicht: 'verdutzt', schief: true,
        schwung: ruhig * Math.sin(u * 9) * 0.8 * Math.exp(-u * 1.5),
        saum: ruhig * Math.sin(u * 7) * 0.5 * Math.exp(-u),
      };
    }
    if (s.zustand !== ZUSTAND.SPIELEN) {
      return { hub: 0.15, arm: 0.2, kappe: 0, gesicht: 'ernst', schwung: ruhig * Math.sin(t * 4) * 0.5, saum: ruhig * Math.sin(t * 3.2) * 0.6 };
    }
    const f = s.figur;
    const u = f.schub;
    const hub = glatt(u < 0.06 ? u / 0.06 : Math.max(0, 1 - (u - 0.06) / 0.34));
    const fall = Math.max(0, Math.min(1, f.vy / K.MAX_FALL));
    const k = Math.min(1, u / 0.3);
    return {
      hub, arm: hub, gesicht: 'ernst',
      schwung: ruhig * Math.sin(t * 16) * fall * (1 - hub) * 0.9,
      saum: ruhig * Math.sin(t * 19 + 1) * (0.25 + 0.75 * fall),
      kappe: ruhig * -2.2 * Math.sin(Math.PI * k) * (1 - k * 0.5),
    };
  }

  function zeichneFigur(s, alpha, dt) {
    let y;
    let ziel;
    if (s.zustand === ZUSTAND.ZIEL) {
      y = s.vorher.y + (s.figur.y - s.vorher.y) * alpha + (reduziert ? 0 : Math.sin(s.ziel.zeit * 6) * 3 * Math.min(1, s.ziel.zeit * 2));
      ziel = reduziert ? 0 : -0.12;
    } else if (s.zustand === ZUSTAND.SPIELEN) {
      y = s.vorher.y + (s.figur.y - s.vorher.y) * alpha;
      const vy = s.figur.vy;
      ziel = vy < 0 ? Math.max(-0.26, (vy / -K.IMPULS) * -0.26) : Math.min(0.5, (vy / K.MAX_FALL) * 0.5);
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
    else anzeigeWinkel += (ziel - anzeigeWinkel) * Math.min(1, dt * 10);

    ctx.save();
    ctx.setTransform(skala, 0, 0, skala, K.FIGUR_X * skala, y * skala);
    ctx.rotate(anzeigeWinkel);
    Figur.zeichne(ctx, bewegung(s));
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

  // Die Punktezahl wird nur neu gemalt, wenn sie sich ändert
  let punkteBild = null;
  function zeichnePunkte(s) {
    if (s.punkte !== letztePunkte) {
      if (s.punkte > letztePunkte) punktePop = 0.22;
      letztePunkte = s.punkte;
    }
    const level = s.konfig.modus === 'level';
    const inhalt = level ? `${Math.min(s.punkte, s.konfig.anzahl)}/${s.konfig.anzahl}` : String(s.punkte);
    if (!punkteBild || punkteBild.wert !== inhalt || punkteBild.sk !== skala || punkteBild.schrift !== (document.fonts ? document.fonts.status : 'loaded')) {
      const groesse = level ? 22 : 28;
      const c = leinwand((inhalt.length * groesse + 24) * skala, (groesse + 16) * skala);
      const g = c.getContext('2d');
      g.scale(skala, skala);
      g.font = `${groesse}px "Press Start 2P", "Courier New", monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.lineJoin = 'round';
      g.lineWidth = groesse * 0.42;
      g.strokeStyle = NAVY;
      const mx = (inhalt.length * groesse + 24) / 2;
      g.strokeText(inhalt, mx, 7);
      g.fillStyle = CREME;
      g.fillText(inhalt, mx, 7);
      punkteBild = { c, wert: inhalt, sk: skala, b: inhalt.length * groesse + 24, h: groesse + 16, schrift: document.fonts ? document.fonts.status : 'loaded' };
    }
    const f = 1 + (reduziert ? 0 : (punktePop / 0.22) * 0.28);
    const w = punkteBild.b * f;
    const hh = punkteBild.h * f;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(punkteBild.c, Math.round((B / 2 - w / 2) * skala), Math.round((30 - 7 * f) * skala), Math.round(w * skala), Math.round(hh * skala));
    ctx.imageSmoothingEnabled = false;
  }

  // Gesammelte Sterne oben links und der Böen-Hinweis darunter
  let sternPop = [0, 0, 0];
  function zeichneHud(s) {
    if (s.konfig.modus === 'level') {
      ctx.imageSmoothingEnabled = true;
      for (let i = 0; i < 3; i++) {
        const voll = i < s.sterne;
        const f = 1 + (reduziert ? 0 : sternPop[i] * 1.6);
        const g = 18 * f;
        const cx = 20 + i * 21;
        ctx.drawImage(voll ? sprites.sternHud : sprites.sternLeer, Math.round((cx - g / 2) * skala), Math.round((36 - g / 2) * skala), Math.round(g * skala), Math.round(g * skala));
      }
      ctx.imageSmoothingEnabled = false;
    }
    const w = s.wind;
    if (w.richtung && (s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.BEREIT || s.zustand === ZUSTAND.PAUSE)) {
      // Vor der Böe blinkt das Schild, während der Böe leuchtet es
      const an = w.warnung ? (reduziert ? 1 : 0.45 + 0.55 * (Math.sin(s.zeit * 14) > -0.3 ? 1 : 0)) : 1;
      ctx.globalAlpha = an;
      ctx.drawImage(w.richtung < 0 ? sprites.windHoch : sprites.windRunter, Math.round(8 * skala), Math.round(52 * skala));
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Wetter und Wind ----------
  let feuerwerk = [];
  let feuerwerkUhr = 0.6;
  const FEST_FARBEN = ['#FFD35A', '#FF805B', '#24D6CD', '#FF9AD5', '#9BFF8A', '#FFF4DC'];
  function feuerwerkSchritt(dt) {
    if (THEMEN[thema].wetter !== 'feuerwerk' || reduziert) { feuerwerk.length = 0; return; }
    feuerwerkUhr -= dt;
    if (feuerwerkUhr <= 0) {
      feuerwerkUhr = 1.1 + Math.random() * 1.2;
      const x = 40 + Math.random() * (B - 80);
      const y = 70 + Math.random() * 170;
      const farbe = FEST_FARBEN[Math.floor(Math.random() * FEST_FARBEN.length)];
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const v = 50 + Math.random() * 25;
        feuerwerk.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: 0, max: 1.1 + Math.random() * 0.3, farbe });
      }
    }
    for (const f of feuerwerk) {
      f.leben += dt;
      f.vy += 30 * dt;
      f.vx *= 1 - dt * 0.8;
      f.vy *= 1 - dt * 0.8;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    feuerwerk = feuerwerk.filter(f => f.leben < f.max);
  }

  function zeichneWetter(s, strecke) {
    const art = THEMEN[thema].wetter;
    const e = ebenen.wetter;
    const t = reduziert ? 0 : s.zeit;
    const kachel = (ebene, ox, oy) => {
      const bw = ebene.c.width;
      const bh = ebene.c.height;
      const x = -(((Math.round(ox * skala) % bw) + bw) % bw);
      const y = -(((Math.round(oy * skala) % bh) + bh) % bh);
      ctx.drawImage(ebene.c, x, y);
      if (x + bw < canvas.width) ctx.drawImage(ebene.c, x + bw, y);
      if (y + bh < canvas.height) {
        ctx.drawImage(ebene.c, x, y + bh);
        if (x + bw < canvas.width) ctx.drawImage(ebene.c, x + bw, y + bh);
      }
    };
    if (art === 'nebel') {
      ctx.globalAlpha = 0.9;
      kachel(e, strecke * 0.4 + t * 9, 0);
      ctx.globalAlpha = 1;
    } else if (art === 'regen') {
      kachel(e, t * 70 + strecke * 0.6, -t * 520);
    } else if (art === 'schnee') {
      kachel(e, strecke * 0.5 + Math.sin(t * 0.7) * 16, -t * 38);
      ctx.globalAlpha = 0.6;
      kachel(e, strecke * 0.3 + 120 + Math.sin(t * 0.5 + 2) * 10, -t * 22 + 200);
      ctx.globalAlpha = 1;
    } else if (art === 'laternen') {
      kachel(e, strecke * 0.1, t * 10);
    } else if (art === 'sterne' || art === 'feuerwerk') {
      for (let i = 0; i < 10; i++) {
        const hell = reduziert ? 0.5 : 0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.17) + i * 2.1);
        if (hell < 0.55) continue;
        const x = (i * 83 + 17) % B;
        const y = 24 + ((i * 47) % 200);
        ctx.globalAlpha = hell;
        p.r(x - 1, y - 3, 2, 6, CREME);
        p.r(x - 3, y - 1, 6, 2, CREME);
      }
      ctx.globalAlpha = 1;
      for (const f of feuerwerk) {
        const rest = 1 - f.leben / f.max;
        ctx.globalAlpha = Math.min(1, rest * 1.6);
        p.r(f.x - 1.5, f.y - 1.5, 3, 3, f.farbe);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Windböe: helle Striche ziehen in Windrichtung über das Bild
  function zeichneWind(s) {
    const w = s.wind;
    if (!w.richtung || !(s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.BEREIT || s.zustand === ZUSTAND.PAUSE)) return;
    const staerke = w.warnung ? 0.18 : 0.25 + 0.5 * w.anteil;
    const e = ebenen.wind;
    const bh = e.c.height;
    const v = reduziert ? 0 : s.zeit * 460 * w.richtung;
    const y = (((Math.round(v * skala) % bh) + bh) % bh);
    ctx.globalAlpha = staerke;
    ctx.drawImage(e.c, 0, y);
    ctx.drawImage(e.c, 0, y - bh);
    ctx.globalAlpha = 1;
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
    const fliegt = s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.ZIEL;
    const strecke = fliegt ? s.vorher.strecke + (s.strecke - s.vorher.strecke) * alpha : s.strecke;
    if (!sprites || sprites.schrift !== (document.fonts ? document.fonts.status : 'loaded')) baueSprites();
    const par = reduziert ? 0 : 1;
    const drift = reduziert ? 0 : s.zeit * 4;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ebenen.himmel, 0, 0);
    if (ebenen.wolken) zeichneEbene(ebenen.wolken, strecke * 0.06 * par + drift);
    zeichneEbene(ebenen.fern, strecke * 0.15 * par);
    zeichneEbene(ebenen.mitte, strecke * 0.32 * par);
    zeichneEbene(ebenen.schiffe, strecke * 0.5 * par);
    zeichneGlitzern(s, strecke);
    zeichneVorderWasser(strecke);
    zeichneWetter(s, strecke);
    zeichneWind(s);
    const imSpiel = s.zustand !== ZUSTAND.START;
    if (imSpiel) {
      zeichneZiel(s, strecke);
      for (const h of s.hindernisse) zeichneHindernis(h, strecke);
    }
    zeichneKranbahn(strecke);
    if (imSpiel) {
      zeichneLaufkatzen(s, strecke);
      zeichneSterneWelt(s, strecke);
    }
    zeichnePartikel();
    zeichneFigur(s, alpha, dt);
    if (imSpiel) {
      zeichnePunkte(s);
      zeichneHud(s);
    }
  }

  // Anderes Gebiet: Hintergrund neu vorzeichnen (nur wenn es sich ändert)
  function setzeThema(n) {
    n = Math.max(0, Math.min(THEMEN.length - 1, n | 0));
    if (n === thema && ebenen) return;
    thema = n;
    feuerwerk = [];
    if (canvas && canvas.width > 1 && ebenen) baueEbenen();
    if (canvas) canvas.style.background = THEMEN[thema].kulisse;
  }

  // Stern eingesammelt: Funkenkranz an der Stelle, kleiner Hüpfer im Zähler
  function sternEffekt(e) {
    const n = reduziert ? 6 : 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      neuesTeilchen({
        art: 'funke', x: e.x, y: e.y,
        vx: Math.cos(a) * (90 + Math.random() * 60), vy: Math.sin(a) * (90 + Math.random() * 60),
        leben: 0, max: 0.4 + Math.random() * 0.2, g: 3, farbe: i % 2 ? GELB : '#FFF4B8', schwer: 120,
      });
    }
    if (e.sterne >= 1 && e.sterne <= 3) sternPop[e.sterne - 1] = 0.22;
  }

  function zielEffekt() {
    const n = reduziert ? 14 : 56;
    for (let i = 0; i < n; i++) {
      neuesTeilchen({
        art: 'funke', x: Math.random() * B, y: -10 - Math.random() * 140,
        vx: -30 + Math.random() * 60, vy: 60 + Math.random() * 90,
        leben: 0, max: 2.4 + Math.random() * 1.2, g: 4,
        farbe: CONTAINER_FARBEN[i % CONTAINER_FARBEN.length][0], schwer: 40, flattern: Math.random() * 6,
      });
    }
  }

  // Kleine animierte Figur im Startfenster
  function malStartFigur(ziel, t) {
    const g = ziel.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, ziel.width, ziel.height);
    const sk = (ziel.height * 0.86) / Figur.H;
    const zyklus = t % 1.2;
    const u = Math.min(1, zyklus / 0.4);
    const hub = reduziert ? 0.15 : glatt(zyklus < 0.06 ? zyklus / 0.06 : Math.max(0, 1 - (zyklus - 0.06) / 0.34));
    const bob = reduziert ? 0 : Math.sin(t * 2.6) * sk * 1.5;
    const cx = ziel.width / 2 - (Figur.W / 2 - Figur.ANKER.x) * sk;
    const cy = ziel.height / 2 - (Figur.H / 2 - Figur.ANKER.y) * sk - sk * 2 + bob;
    // Flämmchen aus der Düse
    const dx = cx + Figur.DUESE.x * sk;
    const dy = cy + Figur.DUESE.y * sk;
    const flamme = [['#FFD35A', 0], ['#FF805B', 1], ['#24D6CD', 2]];
    for (const [farbe, k] of flamme) {
      if (reduziert && k > 0) continue;
      const len = reduziert ? 1 : 1 + ((Math.floor(t * 12) + k) % 3);
      g.fillStyle = farbe;
      g.fillRect(dx - sk * 1.5 + k * sk * 0.5, dy + sk * (1 + k * 1.5), sk * 3 - k * sk, sk * 1.5 * len);
    }
    g.setTransform(sk, 0, 0, sk, cx, cy);
    Figur.zeichne(g, {
      hub, arm: hub, gesicht: 'ernst',
      kappe: reduziert ? 0 : -2.2 * Math.sin(Math.PI * u) * (1 - u * 0.5),
      schwung: reduziert ? 0 : Math.sin(t * 4) * 0.5 * (1 - hub),
      saum: reduziert ? 0 : Math.sin(t * 3.2) * 0.6,
    });
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
    init, groesse, zeichne, setzeReduziert, impulsEffekt, unfallEffekt, rekordEffekt, setzeThema, sternEffekt, zielEffekt,
    get thema() { return thema; },
    effekteSchritt, effekteLeeren, malStartFigur, malKulisse,
    get skala() { return skala; },
  };
})();
