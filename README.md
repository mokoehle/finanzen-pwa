# Finanzen

Persönliche Ausgaben-App als PWA: Ausgaben schnell erfassen, Monatsliste, Auswertung nach
Kategorie, Budgets, wiederkehrende Ausgaben. Alle Daten liegen lokal im Browser (IndexedDB),
es gibt kein Backend und keinen Login. Backup über JSON-Export in den Einstellungen.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ausliefern (inkl. Service Worker)
npm run lint
```

Stack: Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa.

## Veröffentlichen

```bash
npm run deploy   # baut und schiebt dist/ auf den Branch gh-pages (GitHub Pages)
```

`dist/` ist eine statische Seite mit relativen Pfaden und läuft auf jedem Static-Host
mit HTTPS, auch in einem Unterordner.
