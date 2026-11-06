// ===================================================================
// 8 · APP
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

  const s = erstelleSpiel();
  let rekord = Speicher.rekord();
  let endeGezeigt = false;

  // ---------- Grafik und Bewegung ----------
  Grafik.init(canvas);
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

  // ---------- Fenster (Start, Pause, Ende) ----------
  function zeigeFenster(id) {
    for (const sec of fenster.querySelectorAll('section')) sec.hidden = sec.id !== id;
    fenster.hidden = !id;
    app.inert = !!id;
    if (id) {
      const sec = $(id);
      fenster.querySelectorAll('[data-titel]').forEach(t => t.removeAttribute('id'));
      sec.querySelector('[data-titel]').id = 'fensterTitel';
      const knopf = sec.querySelector('.btn.main');
      if (knopf) knopf.focus({ preventScroll: true });
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
    meldung.replaceChildren(gross);
    if (klein) {
      const k = document.createElement('small');
      k.textContent = klein;
      meldung.append(k);
    }
    meldung.hidden = false;
  }
  function versteckeMeldung() { meldung.hidden = true; }

  // ---------- Spieleingabe (Taste, Klick, Tipp, Start-Knöpfe) ----------
  function schub() {
    Ton.wecke();
    const ergebnis = eingabe(s);
    if (ergebnis === 'start') neuerVersuch();
    else if (ergebnis === 'weiter') versteckeMeldung();
    return ergebnis;
  }

  function neuerVersuch() {
    endeGezeigt = false;
    Grafik.effekteLeeren();
    versteckeMeldung();
    $('ansage').textContent = '';
    zeigeFenster(null);
  }

  function pause() {
    if (!pausiere(s)) return false;
    $('pausePunkte').textContent = s.punkte;
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

  $('losKnopf').addEventListener('click', schub);
  $('nochmalKnopf').addEventListener('click', schub);
  $('neuKnopf').addEventListener('click', () => {
    Ton.wecke();
    starte(s);
    neuerVersuch();
  });
  $('weiterKnopf').addEventListener('click', weiter);
  $('pauseKnopf').addEventListener('click', pause);

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
      return pause();
    },
    darfFensterStarten: () => !fenster.hidden && kannStarten(s),
    beiTouch: aufTouch,
  });

  // ---------- Ereignisse aus der Logik ----------
  function verarbeiteEreignisse() {
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
        case 'unfall':
          Ton.unfall();
          if (e.art === 'wasser') Ton.platsch();
          Grafik.unfallEffekt(s, e.art);
          break;
      }
    }
  }

  function zeigeEnde() {
    endeGezeigt = true;
    const neu = s.punkte > rekord;
    if (neu) {
      rekord = s.punkte;
      Speicher.setzeRekord(rekord);
      Ton.rekord(0.05);
      Grafik.rekordEffekt();
    }
    $('ePunkte').textContent = s.punkte;
    $('eRekord').textContent = rekord;
    $('neuerRekord').hidden = !neu;
    const spruch = $('spruch');
    // Gelegentlich ein kurzer Spruch (nicht bei einem neuen Rekord, der wird gefeiert)
    if (!neu && Math.random() < 0.55) {
      spruch.textContent = SPRUECHE[Math.floor(Math.random() * SPRUECHE.length)];
      spruch.hidden = false;
    } else {
      spruch.hidden = true;
    }
    for (const el of document.querySelectorAll('.js-rekord')) el.textContent = rekord;
    $('ansage').textContent = `Bruchlandung. ${s.punkte} Punkte. Rekord ${rekord}.${neu ? ' Neuer Rekord!' : ''}`;
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
    setzeZustandsKlasse();
    Grafik.zeichne(s, s.zustand === ZUSTAND.SPIELEN ? rest / K.SCHRITT : 1);
    if (!fenster.hidden && !$('fStart').hidden) Grafik.malStartFigur(startFigur, jetzt / 1000);
  }

  for (const el of document.querySelectorAll('.js-rekord')) el.textContent = rekord;
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
      s, K, ZUSTAND, eingabe, schritt, starte, pausiere, setzeFort, Speicher,
      get rekord() { return rekord; },
    };
  }
})();
