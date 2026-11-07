#!/usr/bin/env python3
# Baut aus den Teilen in diesem Ordner die fertige index.html. Aufruf: python3 quelle/baue.py
import pathlib
q = pathlib.Path(__file__).parent
TEILE = ['1-einstellungen.js', '2-level.js', '3-logik.js', '4-speicher.js', '5-ton.js', '6-figur.js',
         '7-grafik.js', '8-eingabe.js', '9-app.js']
kopf = (q / 'kopf.html').read_text()
spiel = '\n'.join((q / n).read_text() for n in TEILE)
fertig = kopf.replace('%%SCHRIFT%%', (q / 'schrift.txt').read_text().strip()).replace('%%SPIEL%%', spiel)
(q.parent / 'index.html').write_text(fertig)
print('index.html:', len(fertig) // 1024, 'KB')
