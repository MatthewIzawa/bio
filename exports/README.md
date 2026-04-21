# Publication List Exports

This directory holds generated publication-list documents. Individual
`.md` and `.docx` files are gitignored; regenerate them from the repo data:

```
npm run pubs:academic     # exports/publications-academic.{md,docx}
npm run pubs:industry     # exports/publications-industry.{md,docx}
npm run pubs:all          # exports/publications-all.{md,docx}
npm run pubs              # alias for pubs:all
```

Source data: `src/data/publications.json`, `src/data/conferences.json`, `src/data/mentees.json`.
Generator: `scripts/generate-pubs.js`.
