// ===================================================================
// 7 · EINGABE
// Leertaste, Pfeil hoch, W, Mausklick und Tippen geben einen Schub.
// P oder Esc pausiert. Gehaltene Tasten (automatische Wiederholung) zählen nicht.
// Scrollen und Zoomgesten werden nur auf der Spielfläche verhindert.
// Jede Berührung löst über pointerdown genau eine Eingabe aus; Knöpfe
// (Pause, Ton, Menü) lösen nie einen Flugimpuls aus.
// ===================================================================

const Eingabe = (() => {
  const SCHUB_CODES = new Set(['Space', 'ArrowUp', 'KeyW']);
  let eingerichtet = false;

  const istKnopf = el => !!(el && el.closest && el.closest('button, a, input, select, textarea, [role="button"]'));

  function init({ buehne, canvas, fenster, beiSchub, beiPause, darfFensterStarten, beiTouch }) {
    if (eingerichtet) return;   // nie doppelte Listener
    eingerichtet = true;

    // ---------- Tastatur ----------
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ziel = e.target;
      if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)) return;

      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (e.repeat) return;
        if (beiPause()) e.preventDefault();
        return;
      }

      const schub = SCHUB_CODES.has(e.code) || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
      if (!schub) return;
      // Leertaste auf einem fokussierten Knopf: der Knopf übernimmt (sonst doppelter Start)
      const aufKnopf = istKnopf(ziel) && (e.code === 'Space' || e.key === ' ');
      if (aufKnopf && !fenster.hidden) return;
      e.preventDefault();               // kein Seitenscrollen durch Spieltasten
      if (e.repeat) return;             // gehaltene Taste = nur ein Schub
      beiSchub('taste');
    });

    // ---------- Browsergesten nur auf der Spielfläche blockieren ----------
    const blockiere = e => { if (e.cancelable && !istKnopf(e.target)) e.preventDefault(); };
    buehne.addEventListener('touchstart', blockiere, { passive: false });
    buehne.addEventListener('touchmove', blockiere, { passive: false });
    buehne.addEventListener('touchend', blockiere, { passive: false });
    buehne.addEventListener('dblclick', blockiere);
    buehne.addEventListener('contextmenu', blockiere);

    // ---------- Klick und Tipp auf die Spielfläche ----------
    buehne.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') beiTouch();
      if (istKnopf(e.target)) return;
      if (e.button > 0) return;
      // Mit der Maus zählt nur das Spielfeld selbst; mit dem Finger die ganze Fläche
      if (e.pointerType === 'mouse' && e.target !== canvas) return;
      e.preventDefault();
      if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
      beiSchub('zeiger');
    });

    // ---------- Tippen neben die Tafel im Start- oder Endefenster ----------
    // Löst wie eine Spieltaste den Start aus (nicht in der Pause: dort nur „Weiter“).
    fenster.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') beiTouch();
      if (istKnopf(e.target) || e.button > 0) return;
      if (!darfFensterStarten()) return;
      e.preventDefault();
      beiSchub('zeiger');
    });
  }

  return { init };
})();
