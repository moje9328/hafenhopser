// ===================================================================
// 9 · APP
// Verbindet Logik, Grafik, Ton, Eingabe und Speicher. Eine einzige
// Spielschleife; alle Listener werden genau einmal eingerichtet.
// ===================================================================

(() => {
  const $ = id => document.getElementById(id);
  const wurzel = document.documentElement;
  const app = $('app');
  const canvas = $('bild');
  const rahmen = $('rahmen');
  const buehne = $('buehne');
  const fenster = $('fenster');
  const meldung = $('meldung');
  const kulisse = $('kulisse');
  const startFigur = $('startFigur');

  const SPRUECHE = [
    'Die Mütze ist noch da.',
    'Fast bis zur Mittagspause.',
    'Der TÜV hat Fragen.',
    'Die Möwen applaudieren höflich.',
    'Das Jetpack hustet beleidigt.',
    'Der Hafenmeister notiert: „Kreativ“.',
    'Die Gummistiefel sind jetzt voller Ehrgeiz.',
    'Ein Kran hat kurz weggeschaut.',
  ];
  const STUFEN_TEXT = { leicht: 'große Lücken', normal: 'wie gedacht', schwer: 'eng und flott' };
  // Farben der Gebietsköpfe in der Levelauswahl (passend zu den Hintergründen)
  const GEBIET_FARBEN = [
    'linear-gradient(90deg, #3A92C3, #80D3F4)',
    'linear-gradient(90deg, #5F8794, #C8D4DC)',
    'linear-gradient(90deg, #734396, #F7907E)',
    'linear-gradient(90deg, #0F1D3D, #2A477B)',
    'linear-gradient(90deg, #364F57, #77828C)',
    'linear-gradient(90deg, #337896, #B6E2F3)',
    'linear-gradient(90deg, #22184F, #C04A6A)',
  ];

  let stufe = Speicher.stufe();
  let fortschritt = Speicher.fortschritt();
  let rekord = Speicher.rekord(stufe);
  const s = erstelleSpiel(erstelleKonfig('endlos', 0, stufe));

  // ---------- Freunde herausfordern (Endlos-Rekord je Stufe, per Link) ----------
  const duell = PixelDuell.erstelle({
    spiel: 'Hafenhopser',
    adresse: 'https://moje9328.github.io/hafenhopser/',
    schluessel: 'pixelhafen.hafenhopser.v1.freunde',
    stufen: Object.fromEntries(STUFEN_REIHE.map(st => [st, STUFEN[st].name])),
    stufe: () => stufe,
    stand: st => ({ punkte: Speicher.rekord(st) }),
    levelWort: '',
    beiStufe: st => { if (STUFEN[st]) { stufe = st; Speicher.setzeStufe(st); rekord = Speicher.rekord(st); s.konfig = erstelleKonfig(s.konfig.modus, s.konfig.nr, st); } },
  });
  let endeGezeigt = false;
  let zielGezeigt = false;
  let offenesFenster = null;
  let introUhr = null;

  // ---------- Grafik und Bewegung ----------
  Grafik.init(canvas);
  Grafik.setzeThema(0);
  const wenigBewegung = window.matchMedia('(prefers-reduced-motion: reduce)');
  Grafik.setzeReduziert(wenigBewegung.matches);
  wenigBewegung.addEventListener?.('change', e => Grafik.setzeReduziert(e.matches));

  // ---------- Ton ----------
  Ton.setze(Speicher.tonAn(), false);
  function zeigeTon() {
    const an = Ton.istAn();
    wurzel.classList.toggle('stumm', !an);
    $('tonKnopf').setAttribute('aria-pressed', String(an));
    $('tonKnopf').setAttribute('aria-label', an ? 'Ton ausschalten' : 'Ton einschalten');
  }
  zeigeTon();
  $('tonKnopf').addEventListener('click', () => {
    Ton.setze(!Ton.istAn(), true);
    Speicher.setzeTon(Ton.istAn());
    zeigeTon();
  });
  // Beim Finger zählt erst das Loslassen als Nutzeraktion, die Audio freischalten darf
  window.addEventListener('pointerup', () => Ton.wecke(), true);
  window.addEventListener('touchend', () => Ton.wecke(), { capture: true, passive: true });
  // Kleine Knöpfe holen sich per Maus keinen Fokus, damit die Leertaste nicht auf ihnen landet
  for (const k of rahmen.querySelectorAll('.rund')) k.addEventListener('mousedown', e => e.preventDefault());

  // ---------- Touch erkennen (passende Hinweise) ----------
  if (window.matchMedia('(any-pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches) wurzel.classList.add('touch');
  function aufTouch() { wurzel.classList.add('touch'); }

  // ---------- Größe ----------
  let groesseGeplant = false;
  function passeGroesseAn() {
    groesseGeplant = false;
    const stil = getComputedStyle(buehne);
    const w = buehne.clientWidth - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight);
    const h = buehne.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
    if (w > 0 && h > 0) {
      const { cssW, cssH } = Grafik.groesse(w, h, window.devicePixelRatio || 1);
      rahmen.style.width = cssW + 'px';
      rahmen.style.height = cssH + 'px';
      rahmen.style.setProperty('--zoom', String(cssW / K.BREITE));
    }
    Grafik.malKulisse(kulisse, window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
    const dpr = window.devicePixelRatio || 1;
    startFigur.width = Math.round(startFigur.clientWidth * dpr) || 80;
    startFigur.height = Math.round(startFigur.clientHeight * dpr) || 96;
    Grafik.zeichne(s, 1);
  }
  function planeGroesse() {
    if (groesseGeplant) return;
    groesseGeplant = true;
    requestAnimationFrame(passeGroesseAn);
  }
  if ('ResizeObserver' in window) new ResizeObserver(planeGroesse).observe(buehne);
  window.addEventListener('resize', planeGroesse);
  window.addEventListener('orientationchange', planeGroesse);

  // ---------- Fenster ----------
  function zeigeFenster(id, fokus) {
    offenesFenster = id;
    for (const sec of fenster.querySelectorAll('.tafel > section')) sec.hidden = sec.id !== id;
    fenster.hidden = !id;
    app.inert = !!id;
    if (id) {
      const sec = $(id);
      fenster.querySelectorAll('[data-titel]').forEach(t => t.removeAttribute('id'));
      sec.querySelector('[data-titel]').id = 'fensterTitel';
      const knopf = fokus || sec.querySelector('.btn.main') || sec.querySelector('.lvl.naechstes') || sec.querySelector('.btn');
      if (knopf) knopf.focus({ preventScroll: true });
      if (id === 'fLevel') {
        const ziel = sec.querySelector('.lvl.naechstes');
        fenster.scrollTop = 0;
        if (ziel) ziel.scrollIntoView({ block: 'center' });
      } else {
        fenster.scrollTop = 0;
      }
      if (id === 'fStart' || id === 'fEnde') planeGroesse();
    } else {
      canvas.focus({ preventScroll: true });
    }
  }

  function setzeZustandsKlasse() {
    if (wurzel.dataset.zustand !== s.zustand) wurzel.dataset.zustand = s.zustand;
  }

  // ---------- Meldung auf dem Spielfeld ----------
  function zeigeMeldung(gross, klein) {
    clearTimeout(introUhr);
    meldung.replaceChildren(gross);
    if (klein) {
      const k = document.createElement('small');
      k.textContent = klein;
      meldung.append(k);
    }
    meldung.hidden = false;
  }
  function versteckeMeldung() { clearTimeout(introUhr); meldung.hidden = true; }

  // ---------- Schwierigkeit ----------
  function zeigeStufen() {
    for (const box of document.querySelectorAll('[data-stufen]')) {
      if (!box.children.length) {
        for (const st of STUFEN_REIHE) {
          const k = document.createElement('button');
          k.type = 'button';
          k.className = 'stufe';
          k.dataset.stufe = st;
          k.innerHTML = `${STUFEN[st].name}<small>${STUFEN_TEXT[st]}</small>`;
          k.addEventListener('click', () => setzeStufe(st));
          box.append(k);
        }
      }
      for (const k of box.children) k.setAttribute('aria-pressed', String(k.dataset.stufe === stufe));
    }
  }
  function setzeStufe(st) {
    if (!STUFEN[st]) return;
    stufe = st;
    Speicher.setzeStufe(st);
    rekord = Speicher.rekord(st);
    s.konfig = erstelleKonfig(s.konfig.modus, s.konfig.nr, st);
    zeigeStufen();
    zeigeZahlen();
  }

  // ---------- Levelauswahl ----------
  const istFrei = nr => nr === 1 || fortschritt.geschafft.includes(nr) || fortschritt.geschafft.includes(nr - 1);
  const sterneVon = nr => fortschritt.sterne[nr] || 0;
  function sterneGesamt() { return LEVEL.reduce((n, l) => n + sterneVon(l.nr), 0); }
  function naechstesLevel() {
    const offen = LEVEL.find(l => !fortschritt.geschafft.includes(l.nr) && istFrei(l.nr));
    return offen ? offen.nr : 0;
  }

  function zeigeZahlen() {
    for (const el of document.querySelectorAll('.js-rekord')) el.textContent = rekord;
    for (const el of document.querySelectorAll('.js-sterne')) el.textContent = sterneGesamt();
    $('sterneMax').textContent = LEVEL.length * 3;
  }

  function baueLevelListe() {
    const liste = $('levelListe');
    liste.replaceChildren();
    const naechstes = naechstesLevel();
    GEBIETE.forEach((g, gi) => {
      const level = LEVEL.filter(l => l.g === gi);
      const box = document.createElement('div');
      box.setAttribute('role', 'group');
      box.className = 'gebiet';
      box.setAttribute('aria-label', `Gebiet ${gi + 1}: ${g.name}`);
      const kopf = document.createElement('h3');
      kopf.className = 'gebiet-kopf';
      kopf.style.background = GEBIET_FARBEN[gi];
      const summe = level.reduce((n, l) => n + sterneVon(l.nr), 0);
      kopf.innerHTML = `<span>${gi + 1} · ${g.name.toUpperCase()}</span><span>${summe}/${level.length * 3}</span>`;
      const info = document.createElement('p');
      info.className = 'gebiet-info';
      info.innerHTML = g.neu ? `<b>Neu: ${g.neu}.</b> ${g.text}` : g.text;
      const gitter = document.createElement('div');
      gitter.className = 'levelgitter';
      for (const l of level) {
        const k = document.createElement('button');
        k.type = 'button';
        k.className = 'lvl';
        const frei = istFrei(l.nr);
        const st = sterneVon(l.nr);
        if (fortschritt.geschafft.includes(l.nr)) k.classList.add('geschafft');
        if (l.nr === naechstes) k.classList.add('naechstes');
        k.disabled = !frei;
        k.dataset.level = l.nr;
        if (frei) {
          k.innerHTML = `<span>${l.nr}</span><span class="mini">${[0, 1, 2].map(i => `<svg class="${i < st ? 'an' : ''}" aria-hidden="true"><use href="#stern"/></svg>`).join('')}</span>`;
          k.setAttribute('aria-label', `Level ${l.nr}: ${l.name}, ${st} von 3 Sternen`);
          k.title = l.name;
          k.addEventListener('click', () => starteLevel(l.nr));
        } else {
          k.innerHTML = `<span>${l.nr}</span><svg class="schloss" aria-hidden="true"><use href="#schloss"/></svg>`;
          k.setAttribute('aria-label', `Level ${l.nr}: noch gesperrt`);
        }
        gitter.append(k);
      }
      box.append(kopf, info, gitter);
      liste.append(box);
    });
  }

  function zeigeLevelauswahl() {
    zuruecksetzen();
    Grafik.setzeThema(0);
    fortschritt = Speicher.fortschritt();
    baueLevelListe();
    zeigeStufen();
    zeigeZahlen();
    zeigeFenster('fLevel');
  }
  function zeigeHauptmenue() {
    zuruecksetzen();
    Grafik.setzeThema(0);
    zeigeStufen();
    zeigeZahlen();
    zeigeFenster('fStart');
  }
  // Laufenden Versuch verwerfen und die Welt in den Startzustand bringen
  function zuruecksetzen() {
    waehle(s, s.konfig);
    Grafik.effekteLeeren();
    versteckeMeldung();
    $('ansage').textContent = '';
  }

  // ---------- Starten ----------
  function starteLevel(nr) {
    if (!levelEbene(nr) || !istFrei(nr)) return;
    Ton.wecke();
    const k = erstelleKonfig('level', nr, stufe);
    Grafik.setzeThema(k.gebiet);
    waehle(s, k);
    starte(s);
    neuerVersuch();
    const l = levelEbene(nr);
    zeigeMeldung(`LEVEL ${nr}`, `${l.name} · ${GEBIETE[l.g].name}`);
    introUhr = setTimeout(() => { if (s.zustand === ZUSTAND.SPIELEN) meldung.hidden = true; }, 2200);
  }
  function starteEndlos() {
    Ton.wecke();
    const k = erstelleKonfig('endlos', 0, stufe);
    Grafik.setzeThema(0);
    waehle(s, k);
    starte(s);
    neuerVersuch();
  }

  // ---------- Spieleingabe (Taste, Klick, Tipp) ----------
  function schub() {
    Ton.wecke();
    // In Menüs startet eine Spieltaste nichts (dort entscheiden die Knöpfe)
    if (!fenster.hidden && offenesFenster !== 'fEnde' && offenesFenster !== 'fPause') return null;
    const ergebnis = eingabe(s);
    if (ergebnis === 'start') neuerVersuch();
    else if (ergebnis === 'weiter') versteckeMeldung();
    return ergebnis;
  }

  function neuerVersuch() {
    endeGezeigt = false;
    zielGezeigt = false;
    Grafik.effekteLeeren();
    versteckeMeldung();
    $('ansage').textContent = '';
    zeigeFenster(null);
  }

  const menueText = () => (s.konfig.modus === 'level' ? 'Levelauswahl' : 'Hauptmenü');
  const zumMenue = () => (s.konfig.modus === 'level' ? zeigeLevelauswahl() : zeigeHauptmenue());
  const levelTitel = () => {
    const l = levelEbene(s.konfig.nr);
    return l ? `LEVEL ${l.nr} · ${l.name.toUpperCase()}` : '';
  };

  function pause() {
    if (!pausiere(s)) return false;
    $('pausePunkte').textContent = s.konfig.modus === 'level' ? `${s.punkte}/${s.konfig.anzahl}` : s.punkte;
    $('pauseLevel').hidden = s.konfig.modus !== 'level';
    $('pauseLevel').textContent = levelTitel();
    $('pauseMenueKnopf').textContent = menueText();
    versteckeMeldung();
    zeigeFenster('fPause');
    return true;
  }

  function weiter() {
    Ton.wecke();
    if (!setzeFort(s)) return;
    zeigeFenster(null);
    zeigeMeldung('BEREIT?', wurzel.classList.contains('touch') ? 'Tippen – dann geht es weiter' : 'Leertaste oder Klick – dann geht es weiter');
  }

  $('abenteuerKnopf').addEventListener('click', () => { Ton.wecke(); zeigeLevelauswahl(); });
  $('endlosKnopf').addEventListener('click', starteEndlos);
  $('freundeKnopf').addEventListener('click', () => duell.oeffne());
  $('endeFreunde').addEventListener('click', () => duell.oeffne());
  if (duell.offen) {
    $('startDuell').textContent = duell.startText() + ' (Modus: Endlos fliegen)';
    $('startDuell').hidden = false;
  }
  $('zurueckKnopf').addEventListener('click', zeigeHauptmenue);
  $('nochmalKnopf').addEventListener('click', schub);
  $('neuKnopf').addEventListener('click', () => {
    Ton.wecke();
    starte(s);
    neuerVersuch();
  });
  $('weiterKnopf').addEventListener('click', weiter);
  $('pauseKnopf').addEventListener('click', pause);
  $('pauseMenueKnopf').addEventListener('click', zumMenue);
  $('endeMenueKnopf').addEventListener('click', zumMenue);
  $('geschafftMenueKnopf').addEventListener('click', zeigeLevelauswahl);
  $('wiederholenKnopf').addEventListener('click', () => starteLevel(s.konfig.nr));
  $('naechstesKnopf').addEventListener('click', () => {
    const n = s.konfig.nr + 1;
    if (levelEbene(n)) starteLevel(n); else zeigeLevelauswahl();
  });

  // Anderer Tab, App im Hintergrund oder Fenster verliert den Fokus: automatisch pausieren.
  // Weiter geht es nur bewusst über „Weiter“.
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => pause());
  window.addEventListener('pagehide', () => { pause(); });

  Eingabe.init({
    buehne,
    canvas,
    fenster,
    beiSchub: schub,
    beiPause: () => {
      if (s.zustand === ZUSTAND.PAUSE) { weiter(); return true; }
      if (offenesFenster === 'fLevel') { zeigeHauptmenue(); return true; }
      return pause();
    },
    darfFensterStarten: () => !fenster.hidden && offenesFenster === 'fEnde' && kannStarten(s),
    beiTouch: aufTouch,
  });

  // ---------- Ereignisse aus der Logik ----------
  let windVorher = 0;
  function verarbeiteEreignisse() {
    // Böe beginnt: kurzes Rauschen
    const windJetzt = s.zustand === ZUSTAND.SPIELEN && s.wind.anteil > 0 ? s.wind.richtung : 0;
    if (windJetzt && !windVorher) Ton.wind(windJetzt);
    windVorher = windJetzt;
    if (!s.ereignisse.length) return;
    for (const e of s.ereignisse.splice(0)) {
      switch (e.typ) {
        case 'impuls':
          Ton.impuls();
          Grafik.impulsEffekt(s);
          break;
        case 'punkt':
          Ton.punkt();
          break;
        case 'stern':
          Ton.stern(e.sterne);
          Grafik.sternEffekt(e);
          break;
        case 'unfall':
          Ton.unfall();
          if (e.art === 'wasser') Ton.platsch();
          Grafik.unfallEffekt(s, e.art);
          break;
        case 'ziel':
          Ton.rekord(0.05);
          Grafik.zielEffekt();
          zielSpeichern(e.sterne);
          break;
      }
    }
  }

  let zielErgebnis = null;
  function zielSpeichern(sterne) {
    const nr = s.konfig.nr;
    const vorherFrei = GEBIETE.map((g, gi) => istFrei(erstesLevelImGebiet(gi)));
    zielErgebnis = Speicher.levelGeschafft(nr, sterne);
    fortschritt = Speicher.fortschritt();
    // Wurde dadurch ein neues Gebiet frei?
    zielErgebnis.neuesGebiet = GEBIETE.findIndex((g, gi) => !vorherFrei[gi] && istFrei(erstesLevelImGebiet(gi)));
  }

  function zeigeGeschafft() {
    zielGezeigt = true;
    const nr = s.konfig.nr;
    const l = levelEbene(nr);
    $('geschafftLevel').textContent = levelTitel();
    const sterne = s.sterne;
    $('grossSterne').querySelectorAll('svg').forEach((el, i) => el.classList.toggle('an', i < sterne));
    const texte = ['Ziel erreicht! Sammle beim nächsten Mal die Sterne in den Lücken.', 'Ein Stern! Zwei weitere warten noch.', 'Zwei Sterne – fast perfekt!', 'Alle drei Sterne. Meisterhaft!'];
    let text = texte[sterne];
    if (zielErgebnis && !zielErgebnis.mehrSterne && sterne < sterneVon(nr)) text += ` (Bestwert: ${sterneVon(nr)} Sterne)`;
    $('geschafftText').textContent = text;
    const letztes = nr === LEVEL.length;
    $('geschafftTitel').textContent = letztes ? 'Großes Finale geschafft!' : 'Geschafft!';
    const neu = zielErgebnis && zielErgebnis.neuesGebiet > 0 ? GEBIETE[zielErgebnis.neuesGebiet] : null;
    $('neuesGebiet').hidden = !neu && !letztes;
    $('neuesGebiet').textContent = letztes ? 'ALLE 32 LEVEL GESCHAFFT!' : neu ? `NEUES GEBIET: ${neu.name.toUpperCase()}` : '';
    $('naechstesKnopf').textContent = letztes ? 'Zur Levelauswahl' : 'Nächstes Level';
    $('ansage').textContent = `Geschafft! Level ${nr}, ${l.name}. ${sterne} von 3 Sternen.${neu ? ' Neues Gebiet: ' + neu.name + '.' : ''}`;
    zeigeFenster('fGeschafft');
  }

  function zeigeEnde() {
    endeGezeigt = true;
    const level = s.konfig.modus === 'level';
    let neu = false;
    if (!level && s.punkte > rekord) {
      neu = true;
      rekord = s.punkte;
      Speicher.setzeRekord(rekord, stufe);
      Ton.rekord(0.05);
      Grafik.rekordEffekt();
    }
    $('endeLevel').hidden = !level;
    $('endeLevel').textContent = levelTitel();
    $('ePunkteText').textContent = level ? 'Geschafft' : 'Punkte';
    $('ePunkte').textContent = level ? `${s.punkte}/${s.konfig.anzahl}` : s.punkte;
    $('eRekordText').textContent = level ? 'Sterne' : `Rekord (${STUFEN[stufe].name})`;
    $('eRekord').textContent = level ? `${s.sterne}/3` : rekord;
    $('neuerRekord').hidden = !neu;
    $('eDuell').hidden = level;
    $('eDuell').textContent = level ? '' : duell.endText(s.punkte);
    $('endeFreunde').hidden = level;
    $('endeMenueKnopf').textContent = menueText();
    const spruch = $('spruch');
    // Gelegentlich ein kurzer Spruch (nicht bei einem neuen Rekord, der wird gefeiert)
    if (!neu && Math.random() < 0.55) {
      spruch.textContent = SPRUECHE[Math.floor(Math.random() * SPRUECHE.length)];
      spruch.hidden = false;
    } else {
      spruch.hidden = true;
    }
    zeigeZahlen();
    $('ansage').textContent = level
      ? `Bruchlandung. ${s.punkte} von ${s.konfig.anzahl} geschafft.`
      : `Bruchlandung. ${s.punkte} Punkte. Rekord ${rekord}.${neu ? ' Neuer Rekord!' : ''}`;
    zeigeFenster('fEnde');
  }

  // ---------- Die eine Spielschleife ----------
  let letzte = null;
  let rest = 0;
  function bild(jetzt) {
    requestAnimationFrame(bild);
    let dt = letzte === null ? 0 : (jetzt - letzte) / 1000;
    letzte = jetzt;
    if (!(dt >= 0)) dt = 0;
    if (dt > K.MAX_FRAME) dt = K.MAX_FRAME;   // nach Tabwechsel oder Ruckler kein Riesensprung

    if (s.zustand !== ZUSTAND.PAUSE) {
      rest += dt;
      let n = 0;
      while (rest >= K.SCHRITT && n < K.MAX_SCHRITTE) {
        schritt(s, K.SCHRITT);
        rest -= K.SCHRITT;
        n++;
      }
      if (n >= K.MAX_SCHRITTE) rest = 0;
      Grafik.effekteSchritt(dt, s);
    } else {
      rest = 0;
    }
    verarbeiteEreignisse();
    if (s.zustand === ZUSTAND.ENDE && !endeGezeigt && s.unfall.zeit >= K.SPERRE_NACH_UNFALL) zeigeEnde();
    if (s.zustand === ZUSTAND.ZIEL && !zielGezeigt && s.ziel.zeit >= K.ZIEL_ZEIT) zeigeGeschafft();
    setzeZustandsKlasse();
    const fliegt = s.zustand === ZUSTAND.SPIELEN || s.zustand === ZUSTAND.ZIEL;
    Grafik.zeichne(s, fliegt ? rest / K.SCHRITT : 1);
    if (offenesFenster === 'fStart') Grafik.malStartFigur(startFigur, jetzt / 1000);
  }

  zeigeStufen();
  zeigeZahlen();
  zeigeFenster('fStart');
  setzeZustandsKlasse();
  passeGroesseAn();
  if (document.fonts && document.fonts.load) document.fonts.load('28px "Press Start 2P"').catch(() => {});
  requestAnimationFrame(bild);

  // Offline-Fähigkeit wie bei den anderen Pixelhafen-Spielen
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Für automatische Tests (nur mit ?test in der Adresse)
  if (/[?&]test\b/.test(location.search)) {
    window.hafenhopser = {
      s, K, ZUSTAND, LEVEL, GEBIETE, eingabe, schritt, starte, pausiere, setzeFort, Speicher, Grafik,
      starteLevel, starteEndlos, setzeStufe, zeigeLevelauswahl, zeigeHauptmenue,
      get rekord() { return rekord; },
      get stufe() { return stufe; },
      get fenster() { return offenesFenster; },
    };
  }
})();
