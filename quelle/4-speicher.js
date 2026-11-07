// ===================================================================
// 4 · SPEICHER
// Rekorde, Levelfortschritt, Schwierigkeit und Ton im Browser, mit
// versionierter Kennung. Ist localStorage gesperrt (z. B. privater Modus),
// merkt sich das Spiel die Werte nur bis zum Neuladen – es läuft trotzdem.
// ===================================================================

const Speicher = (() => {
  const PRAEFIX = 'pixelhafen.hafenhopser.v1.';
  const notfall = {};

  function lager() {
    try { return window.localStorage || null; } catch (e) { return null; }
  }

  function lies(name, standard) {
    const key = PRAEFIX + name;
    try {
      const l = lager();
      const wert = l ? l.getItem(key) : null;
      if (wert !== null && wert !== undefined) return wert;
    } catch (e) { /* gesperrt */ }
    return key in notfall ? notfall[key] : standard;
  }

  function schreib(name, wert) {
    const key = PRAEFIX + name;
    notfall[key] = String(wert);
    try { const l = lager(); if (l) l.setItem(key, String(wert)); } catch (e) { /* gesperrt oder voll */ }
  }

  // Der Endlos-Rekord der Stufe „Normal“ behält die alte Kennung, damit er erhalten bleibt
  const rekordName = stufe => (stufe && stufe !== 'normal' ? 'rekord.' + stufe : 'rekord');

  // Levelfortschritt: { geschafft: [Nummern], sterne: { Nummer: 0..3 } }
  function fortschritt() {
    let d = null;
    try { d = JSON.parse(lies('level', 'null')); } catch (e) { d = null; }
    const ok = { geschafft: [], sterne: {} };
    if (!d || typeof d !== 'object') return ok;
    if (Array.isArray(d.geschafft)) ok.geschafft = d.geschafft.filter(n => Number.isInteger(n) && n > 0 && n < 1000);
    if (d.sterne && typeof d.sterne === 'object') {
      for (const [k, v] of Object.entries(d.sterne)) {
        const n = parseInt(k, 10);
        if (n > 0 && Number.isInteger(v)) ok.sterne[n] = Math.max(0, Math.min(3, v));
      }
    }
    return ok;
  }

  return {
    rekord(stufe) {
      const n = parseInt(lies(rekordName(stufe), '0'), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    setzeRekord(n, stufe) { schreib(rekordName(stufe), Math.floor(n)); },
    tonAn() { return lies('ton', '1') !== '0'; },
    setzeTon(an) { schreib('ton', an ? '1' : '0'); },
    stufe() {
      const s = lies('stufe', 'normal');
      return s === 'leicht' || s === 'schwer' ? s : 'normal';
    },
    setzeStufe(s) { schreib('stufe', s); },
    fortschritt,
    // Level geschafft: merkt sich das beste Sternergebnis. Gibt zurück, was neu ist.
    levelGeschafft(nr, sterne) {
      const d = fortschritt();
      const erstmals = !d.geschafft.includes(nr);
      if (erstmals) d.geschafft.push(nr);
      const vorher = d.sterne[nr] || 0;
      d.sterne[nr] = Math.max(vorher, sterne);
      schreib('level', JSON.stringify(d));
      return { erstmals, mehrSterne: sterne > vorher };
    },
  };
})();
