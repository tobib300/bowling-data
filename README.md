# bowling-data

Gemeinsame, öffentliche Ballliste für alle meine Bowling-Apps (Proshop-Bohrblatt, BK München, …).

- `balls.json` – Marke, Name, Release, Coverstock, Kernwerte (`rg`, `diff`, `mb`, `kern`, `sym` (symmetrisch/asymmetrisch), `finish`, `kernSrc`), Foto (`img`), Herstellerlayouts (`layouts`)
- Abruf: `https://tobib300.github.io/bowling-data/balls.json` (GitHub Pages, Branch `main`, Ordner `/`)
- Aktualisierung: dienstags per GitHub Action (USBC-Zulassungsliste → Gemini + Google-Suche → Foto-Suche), prüft jede Änderung mit `scripts/validate-balls.js`
- Secret `GEMINI_API_KEY` (kostenloser Schlüssel aus Google AI Studio) im Repo unter Settings → Secrets → Actions

**Nie hier ablegen:** Kundendaten, Schlüssel, Passwörter. Das Repo ist öffentlich.
