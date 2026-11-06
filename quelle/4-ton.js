// ===================================================================
// 4 · TON
// Kurze, selbst erzeugte Arcade-Geräusche mit der Web-Audio-Schnittstelle.
// Keine Audiodateien, keine Sprachausgabe. Der Ton startet erst nach einer
// Nutzeraktion (Browser-Regel). Ein Kompressor verhindert Übersteuern,
// und ein neues „Pffup!“ blendet das vorige sofort aus, damit schnelles
// Tippen nicht zu einem Klangbrei wird.
// ===================================================================

const Ton = (() => {
  let ctx = null;
  let haupt = null;
  let an = true;
  let rauschen = null;
  let letzterImpuls = null;

  function wecke() {
    if (!an) return;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const komp = ctx.createDynamicsCompressor();
        komp.threshold.value = -14;
        komp.knee.value = 10;
        komp.ratio.value = 6;
        haupt = ctx.createGain();
        haupt.gain.value = 0.55;
        haupt.connect(komp).connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { ctx = null; }
  }

  const bereit = () => an && ctx && ctx.state === 'running';

  function rauschBuffer() {
    if (!rauschen) {
      rauschen = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.8), ctx.sampleRate);
      const d = rauschen.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return rauschen;
  }

  // Lautstärke-Hülle: schneller Anstieg, weiches Ausklingen
  function huelle(g, t, laut, dauer, anstieg = 0.006) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + anstieg);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  }

  function ton(f1, f2, dauer, { typ = 'square', laut = 0.3, start = 0, ziel = haupt } = {}) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dauer);
    huelle(g, t, laut, dauer);
    osc.connect(g).connect(ziel);
    osc.start(t);
    osc.stop(t + dauer + 0.03);
    return osc;
  }

  function rauschStoss(dauer, { laut = 0.3, start = 0, typ = 'bandpass', f1 = 1800, f2 = 600, q = 0.9, ziel = haupt } = {}) {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = rauschBuffer();
    const fil = ctx.createBiquadFilter();
    fil.type = typ;
    fil.Q.value = q;
    fil.frequency.setValueAtTime(f1, t);
    fil.frequency.exponentialRampToValueAtTime(f2, t + dauer);
    const g = ctx.createGain();
    huelle(g, t, laut, dauer, 0.004);
    src.connect(fil).connect(g).connect(ziel);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dauer + 0.03);
  }

  return {
    wecke,
    istAn: () => an,
    setze(wert, wecken) {
      an = wert;
      if (an && wecken) wecke();
      else if (!an && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    },

    // „Pffup!“ – kurzes Rauschen plus ansteigender Ton, Tonhöhe leicht zufällig
    impuls() {
      if (!bereit()) return;
      const t = ctx.currentTime;
      if (letzterImpuls && letzterImpuls.ende > t) {
        const g = letzterImpuls.g.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(0, t + 0.012);
      }
      const bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(haupt);
      const v = 1 + (Math.random() * 2 - 1) * 0.08;
      rauschStoss(0.075, { laut: 0.32, f1: 2600 * v, f2: 900, q: 0.7, ziel: bus });
      ton(240 * v, 620 * v, 0.1, { typ: 'triangle', laut: 0.34, start: 0.018, ziel: bus });
      ton(480 * v, 1240 * v, 0.07, { typ: 'square', laut: 0.05, start: 0.02, ziel: bus });
      letzterImpuls = { g: bus, ende: t + 0.14 };
    },

    // „Pling!“
    punkt() {
      if (!bereit()) return;
      ton(1318, 1318, 0.09, { typ: 'square', laut: 0.09 });
      ton(1976, 1976, 0.22, { typ: 'triangle', laut: 0.22, start: 0.05 });
      ton(3952, 3952, 0.12, { typ: 'sine', laut: 0.05, start: 0.05 });
    },

    // „Boing-Prrrt“ – Feder-Boing und ein beleidigtes Knattern
    unfall() {
      if (!bereit()) return;
      const t = ctx.currentTime;
      // Boing: tiefer Ton mit schnellem Wackeln
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.32);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 17;
      const tiefe = ctx.createGain();
      tiefe.gain.value = 38;
      lfo.connect(tiefe).connect(osc.frequency);
      const g = ctx.createGain();
      huelle(g, t, 0.5, 0.34, 0.005);
      osc.connect(g).connect(haupt);
      osc.start(t); lfo.start(t);
      osc.stop(t + 0.36); lfo.stop(t + 0.36);

      // Prrrt: Sägezahn, der von einem schnellen Rechteck an- und ausgeschaltet wird
      const p0 = t + 0.24;
      const knatter = ctx.createOscillator();
      knatter.type = 'sawtooth';
      knatter.frequency.setValueAtTime(95, p0);
      knatter.frequency.exponentialRampToValueAtTime(62, p0 + 0.34);
      const fil = ctx.createBiquadFilter();
      fil.type = 'lowpass';
      fil.frequency.value = 700;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      const takt = ctx.createOscillator();
      takt.type = 'square';
      takt.frequency.setValueAtTime(30, p0);
      takt.frequency.linearRampToValueAtTime(22, p0 + 0.34);
      const takttiefe = ctx.createGain();
      takttiefe.gain.value = 0.5;
      takt.connect(takttiefe).connect(am.gain);
      const pg = ctx.createGain();
      huelle(pg, p0, 0.42, 0.36, 0.02);
      knatter.connect(fil).connect(am).connect(pg).connect(haupt);
      knatter.start(p0); takt.start(p0);
      knatter.stop(p0 + 0.4); takt.stop(p0 + 0.4);
    },

    // Kleines Platschen zusätzlich bei Wasserlandung
    platsch() {
      if (!bereit()) return;
      rauschStoss(0.28, { laut: 0.22, typ: 'lowpass', f1: 2400, f2: 300, q: 0.5 });
    },

    // Kleine fröhliche Hafenfanfare: Schiffshorn „Tuut“, dann ein Dur-Lauf
    rekord(verzoegerung = 0) {
      if (!bereit()) return;
      const s = verzoegerung;
      ton(196, 196, 0.26, { typ: 'sawtooth', laut: 0.08, start: s });
      ton(294, 294, 0.26, { typ: 'triangle', laut: 0.2, start: s });
      const noten = [[523, 0.32], [659, 0.42], [784, 0.52], [1047, 0.64], [784, 0.78], [1047, 0.88]];
      noten.forEach(([f, st], i) => {
        const lang = i === noten.length - 1 ? 0.42 : 0.12;
        ton(f, f, lang, { typ: 'triangle', laut: 0.26, start: s + st });
        ton(f / 2, f / 2, lang, { typ: 'square', laut: 0.05, start: s + st });
      });
    },
  };
})();
