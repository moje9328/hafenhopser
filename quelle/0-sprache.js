// ===================================================================
// 0 · SPRACHE (Deutsch / Englisch)
// Alle Texte stehen im Code auf Deutsch. T('deutscher Text') liefert im
// englischen Modus die Übersetzung aus EN (unten), sonst den Text selbst.
// Platzhalter: T('Level {nr}', { nr: 3 }).
// Die Sprache kommt aus der gespeicherten Wahl, sonst aus dem Browser:
// Deutsch für deutschsprachige Browser, für alle anderen Englisch.
// PORTAL ist nur in der Version für Spieleportale (CrazyGames, Poki) wahr:
// dort fehlen Links nach außen, Teilen und der Offline-Speicher.
// ===================================================================

const PORTAL = /*PORTAL*/false;

const Sprache = (() => {
  const SCHLUESSEL = 'pixelhafen.sprache';
  function gespeichert() {
    // ?lang=en in der Adresse geht vor (falls der Browser den Speicher sperrt)
    try { const u = new URLSearchParams(location.search).get('lang'); if (u === 'de' || u === 'en') return u; } catch (e) { /* weiter */ }
    try { const w = window.localStorage.getItem(SCHLUESSEL); return w === 'de' || w === 'en' ? w : ''; } catch (e) { return ''; }
  }
  function ausBrowser() {
    try {
      const liste = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
      return String(liste[0] || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
    } catch (e) { return 'de'; }
  }
  // Ohne Browser (automatische Tests) immer Deutsch
  const aktuell = typeof document === 'undefined' ? 'de' : (gespeichert() || ausBrowser());
  return {
    aktuell,
    wechsle() {
      const neu = aktuell === 'de' ? 'en' : 'de';
      try { window.localStorage.setItem(SCHLUESSEL, neu); } catch (e) { /* dann nur über die Adresse */ }
      const u = new URL(location.href);
      u.searchParams.set('lang', neu);
      location.replace(u.href);
    },
  };
})();

function T(de, werte) {
  let text = (Sprache.aktuell === 'en' && Object.prototype.hasOwnProperty.call(EN, de)) ? EN[de] : de;
  if (werte) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in werte ? werte[k] : m));
  return text;
}

// Zweiter Name für T, wo im Spielcode eine Variable T (der Tisch) die Funktion verdeckt
const uebersetze = T;

// Übersetzt die festen Texte im HTML: Elemente mit data-en bekommen deren Inhalt
// (für Texte mit Fettdruck darin), sonst werden einzelne Textstücke und die
// Attribute aria-label, title und content (Beschreibung) über EN ersetzt.
function uebersetzeSeite() {
  document.documentElement.lang = Sprache.aktuell;
  if (Sprache.aktuell !== 'en') return;
  for (const el of document.querySelectorAll('[data-en]')) el.innerHTML = el.dataset.en;
  const gang = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const stuecke = [];
  while (gang.nextNode()) stuecke.push(gang.currentNode);
  for (const n of stuecke) {
    const roh = n.nodeValue;
    const kern = roh.trim();
    if (kern && Object.prototype.hasOwnProperty.call(EN, kern)) n.nodeValue = roh.replace(kern, EN[kern]);
  }
  for (const el of document.querySelectorAll('[aria-label], [title], [placeholder], meta[name="description"]')) {
    for (const a of ['aria-label', 'title', 'placeholder', 'content']) {
      const w = el.getAttribute(a);
      if (w && Object.prototype.hasOwnProperty.call(EN, w)) el.setAttribute(a, EN[w]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(EN, document.title)) document.title = EN[document.title];
}

const EN = {
  // ---------- Seite ----------
  'Hafenhopser – Pixelhafen': 'Harbor Hopper – Pixelhafen',
  'Ein Tipp, ein Schub: Flieg mit dem hustenden Jetpack durch den Pixelhafen und zwischen den Containern hindurch. Kostenlos, ohne Anmeldung, ohne Werbung.':
    'One tap, one boost: fly your coughing jetpack through the pixel harbor and between the shipping containers.',
  'Spielfeld von Hafenhopser: Die Figur fliegt mit einem Raketenrucksack zwischen hängenden Containern und Containerstapeln hindurch. Leertaste, Pfeil hoch, W, Klick oder Tippen gibt einen Schub.':
    'Harbor Hopper playfield: the character flies a jetpack between hanging containers and container stacks. Space, Up arrow, W, click or tap gives a boost.',
  'Ton ausschalten': 'Mute sound',
  'Ton einschalten': 'Unmute sound',
  'Pause': 'Pause',
  'Der Hafen ruft. Dein Jetpack hustet.': 'The harbor calls. Your jetpack coughs.',
  'SCHWIERIGKEIT': 'DIFFICULTY',
  'Level spielen': 'Play levels',
  'Endlos fliegen': 'Endless flight',
  'ENDLOS-REKORD': 'ENDLESS BEST',
  '· STERNE': '· STARS',
  'Freunde herausfordern': 'Challenge friends',
  'Zur Pixelhafen-Seite': 'More Pixelhafen games',
  'Levelauswahl': 'Select level',
  'Zurück': 'Back',
  'Verschnaufpause': 'Catch your breath',
  'PUNKTE': 'SCORE',
  'Weiter': 'Continue',
  'Neu starten': 'Restart',
  'Das war wohl eine Bruchlandung.': 'Well, that was a crash landing.',
  'NEUER REKORD!': 'NEW BEST!',
  'Punkte': 'Score',
  'Persönlicher Rekord': 'Personal best',
  'Noch einmal': 'Try again',
  'Geschafft!': 'Level complete!',
  'Nächstes Level': 'Next level',
  'Sprache: Englisch': 'Language: German',
  // ---------- Gebiete ----------
  'Sonnenhafen': 'Sunny Harbor',
  'Blauer Himmel, frische Brise. Zum Warmfliegen.': 'Blue skies, a fresh breeze. Time to warm up.',
  'Werft im Nebel': 'Foggy Shipyard',
  'Die Kräne heben und senken ihre Lasten.': 'The cranes raise and lower their loads.',
  'Schwebende Container': 'Swinging containers',
  'Abendmarkt': 'Evening Market',
  'Lange Container: Höhe halten!': 'Long containers: hold your height!',
  'Container-Tunnel': 'Container tunnels',
  'Nachthafen': 'Night Harbor',
  'Schneller, enger, dunkler.': 'Faster, tighter, darker.',
  'Alles zusammen': 'Everything combined',
  'Sturmküste': 'Storm Coast',
  'Windböen drücken dich hoch oder runter.': 'Gusts of wind push you up or down.',
  'Windböen': 'Wind gusts',
  'Eishafen': 'Ice Harbor',
  'Kalte Luft, dichter Verkehr.': 'Cold air, heavy traffic.',
  'Enge Abstände': 'Tight spacing',
  'Hafenfest': 'Harbor Festival',
  'Das große Finale unterm Feuerwerk.': 'The grand finale under the fireworks.',
  'Alles auf einmal': 'Everything at once',
  // ---------- Level ----------
  'Erster Hopser': 'First Hop',
  'Kistenslalom': 'Crate Slalom',
  'Hafenrundflug': 'Harbor Tour',
  'Möwenkurs': 'Seagull Course',
  'Großer Kai': 'Grand Quay',
  'Schwebende Last': 'Hanging Load',
  'Hoch und runter': 'Up and Down',
  'Nebelkräne': 'Cranes in the Fog',
  'Helling': 'Slipway',
  'Stapellauf': 'Launch Day',
  'Lange Kisten': 'Long Crates',
  'Tunnelblick': 'Tunnel Vision',
  'Markthallen': 'Market Halls',
  'Lampionkette': 'Lantern Chain',
  'Fischauktion': 'Fish Auction',
  'Laternenlicht': 'Lamplight',
  'Mondschein': 'Moonlight',
  'Nachtschicht': 'Night Shift',
  'Leuchtfeuer': 'Beacon',
  'Mitternacht': 'Midnight',
  'Erste Böe': 'First Gust',
  'Gegenwind': 'Headwind',
  'Brandung': 'Surf',
  'Sturmflut': 'Storm Surge',
  'Frostflug': 'Frost Flight',
  'Eisschollen': 'Ice Floes',
  'Schneegestöber': 'Snow Flurry',
  'Polarnacht': 'Polar Night',
  'Lampionflug': 'Lantern Flight',
  'Feuerwerk': 'Fireworks',
  'Festumzug': 'Parade',
  'Großes Finale': 'Grand Finale',
  // ---------- Schwierigkeit ----------
  'Gemütlich': 'Relaxed',
  'Normal': 'Normal',
  'Profi': 'Pro',
  'große Lücken': 'wide gaps',
  'wie gedacht': 'as intended',
  'eng und flott': 'tight and fast',
  // ---------- Sprüche nach dem Absturz ----------
  'Die Mütze ist noch da.': 'At least the cap survived.',
  'Fast bis zur Mittagspause.': 'Almost made it to lunch break.',
  'Der TÜV hat Fragen.': 'The safety inspector has questions.',
  'Die Möwen applaudieren höflich.': 'The seagulls applaud politely.',
  'Das Jetpack hustet beleidigt.': 'The jetpack coughs, offended.',
  'Der Hafenmeister notiert: „Kreativ“.': 'The harbor master writes down: “creative”.',
  'Die Gummistiefel sind jetzt voller Ehrgeiz.': 'The rubber boots are now full of ambition.',
  'Ein Kran hat kurz weggeschaut.': 'A crane looked away for a second.',
  // ---------- Meldungen im Spiel ----------
  'Gebiet {nr}: {name}': 'Area {nr}: {name}',
  'Neu:': 'New:',
  'Level {nr}: {name}, {sterne} von 3 Sternen': 'Level {nr}: {name}, {sterne} of 3 stars',
  'Level {nr}: noch gesperrt': 'Level {nr}: locked',
  'Hauptmenü': 'Main menu',
  'BEREIT?': 'READY?',
  'Tippen – dann geht es weiter': 'Tap to continue',
  'Leertaste oder Klick – dann geht es weiter': 'Space or click to continue',
  ' (Modus: Endlos fliegen)': ' (mode: Endless flight)',
  'Ziel erreicht! Sammle beim nächsten Mal die Sterne in den Lücken.': 'You made it! Next time, collect the stars in the gaps.',
  'Ein Stern! Zwei weitere warten noch.': 'One star! Two more are waiting.',
  'Zwei Sterne – fast perfekt!': 'Two stars – almost perfect!',
  'Alle drei Sterne. Meisterhaft!': 'All three stars. Masterful!',
  ' (Bestwert: {n} Sterne)': ' (best: {n} stars)',
  'Großes Finale geschafft!': 'Grand finale complete!',
  'ALLE 32 LEVEL GESCHAFFT!': 'ALL 32 LEVELS COMPLETE!',
  'NEUES GEBIET: {name}': 'NEW AREA: {name}',
  'Zur Levelauswahl': 'Back to levels',
  'Geschafft! Level {nr}, {name}. {sterne} von 3 Sternen.': 'Level complete! Level {nr}, {name}. {sterne} of 3 stars.',
  ' Neues Gebiet: {name}.': ' New area: {name}.',
  'Geschafft': 'Cleared',
  'Sterne': 'Stars',
  'Rekord ({stufe})': 'Best ({stufe})',
  'Bruchlandung. {punkte} von {anzahl} geschafft.': 'Crash landing. {punkte} of {anzahl} cleared.',
  'Bruchlandung. {punkte} Punkte. Rekord {rekord}.': 'Crash landing. {punkte} points. Best {rekord}.',
  ' Neuer Rekord!': ' New best!',
  // ---------- Wörter auf dem Spielfeld ----------
  'ZIEL': 'GOAL',
  'WIND': 'WIND',
  'PLATSCH!': 'SPLASH!',
  'BONK!': 'BONK!',
  'BOING!': 'BOING!',
};
