// ===================================================================
// 3 · SPEICHER
// Rekord und Ton-Einstellung im Browser, mit versionierter Kennung.
// Ist localStorage gesperrt (z. B. privater Modus), merkt sich das Spiel
// die Werte nur bis zum Neuladen – es läuft trotzdem.
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

  return {
    rekord() {
      const n = parseInt(lies('rekord', '0'), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    setzeRekord(n) { schreib('rekord', Math.floor(n)); },
    tonAn() { return lies('ton', '1') !== '0'; },
    setzeTon(an) { schreib('ton', an ? '1' : '0'); },
  };
})();
