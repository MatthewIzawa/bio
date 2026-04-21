# Publication List Generator — Design Spec

## Goal

Generate audience-specific publication/presentation list documents (`.md` and `.docx`) from the bio repo's structured JSON data. The Word CV stays manually maintained for non-publication sections; the generator produces the publication list that gets pasted into it. Future audience subdivisions and a LaTeX output path are supported by the data model without re-work.

## Scope

**In scope:**
- A Node.js generator script at `scripts/generate-pubs.js`
- A new optional `audiences` field on each entry in `publications.json` and `conferences.json`
- A new structured data file `src/data/mentees.json` for student-coauthor flagging
- Markdown and DOCX output for each run
- `npm` scripts for the common audience modes (`academic`, `industry`, `all`)
- Unit tests on the pure functions using `node:test`

**Out of scope (future work, not this spec):**
- Full CV generation (employment, education, awards, service sections)
- LaTeX output (data model supports it; renderer added later)
- Website audience-variant views (academic/industry tabs on the live site)
- Abstract-ingestion pipeline (.docx/.pdf → JSON entry)
- Auto-tagging existing entries with `audiences` values (done manually over time)

## Architecture

Single Node.js script, pure-function pipeline, no web framework. Runs via `npm run pubs:<audience>` or direct `node` invocation. Reads three JSON files, filters, formats, writes two files to `exports/`.

```
scripts/generate-pubs.js
├── loadData()                       → { publications, conferences, mentees }
├── filterByAudience(entries, aud)   → entries whose audiences include aud (or untagged)
├── groupByYear(entries)             → { 2026: [...], 2025: [...], ... }
├── sortWithinYear(entries)          → first-author first, then alphabetical by first-author surname
├── matchStudent(authorString, mentees) → { role, status } | null
├── formatCitation(entry, mentees)   → markdown string / DOCX runs array
├── renderMarkdown(sections)         → string
├── renderDocx(sections)             → Buffer (via `docx` npm package)
└── writeExports(audience, md, docx) → writes to exports/publications-<audience>.{md,docx}
```

## Data Model

### Extended entry schema (publications.json + conferences.json)

Add one new optional field:

```json
{
  "key": "...",
  "year": 2026,
  "title": "...",
  "authors": ["F. Cao", "M. R. M. Izawa", ...],
  "audiences": ["academic"],    // NEW — optional, array of strings
  ...existing fields unchanged
}
```

**Filtering rules:**
- Missing `audiences` field → entry appears in **all** filters (backward-compatible default).
- `audiences` present → entry appears only in docs whose audience is in the array.
- `--audience=all` ignores the field entirely and lists everything.
- Future audience values are just new strings in the array; no schema change needed.

### New file: `src/data/mentees.json`

```json
[
  {
    "canonicalName": "F. Cao",
    "aliases": ["Fengke Cao"],
    "role": "PhD",
    "status": "completed",
    "year": 2023,
    "institution": "Western University"
  },
  {
    "canonicalName": "X. Tian",
    "aliases": ["Xinyi Tian"],
    "role": "PhD",
    "status": "in_progress",
    "institution": "Chengdu University of Technology"
  },
  {
    "canonicalName": "T. Luo",
    "aliases": ["Tingyao Luo"],
    "role": "PhD",
    "status": "in_progress",
    "institution": "Chengdu University of Technology"
  },
  {
    "canonicalName": "S. T. Saji",
    "aliases": ["Satheesh T. Saji"],
    "role": "PhD",
    "status": "in_progress",
    "institution": "Chengdu University of Technology"
  },
  {
    "canonicalName": "D. D. Uribe",
    "aliases": ["Diego Uribe", "D. Uribe"],
    "role": "MSc",
    "status": "completed",
    "year": 2018,
    "institution": "Western University"
  }
]
```

Additional entries (e.g., Chijiwa Takamu, undergraduate mentees by name) added as the user supplies names. Initial seed list drawn from `src/pages/cv.astro` lines 196–211.

**Matching logic:** author string from an entry is compared against each mentee's `canonicalName` and `aliases` using case-sensitive exact match. No fuzzy matching (avoids false positives on common surnames).

**Flagging typography in output:**
- `status: "in_progress"` → superscript `†` after the author's name in citations
- `status: "completed"` → superscript `‡` after the author's name in citations
- A footnote line appears at the bottom of each generated document:
  `† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.`

## Output Format

### Document structure

```
# Publication List — [Academic | Industry | Complete]
Generated: YYYY-MM-DD from https://github.com/MatthewIzawa/bio

## Peer-Reviewed Publications
### 2026
1. <citation>
2. <citation>
### 2025
1. <citation>
...

## Conference Presentations
### 2026
1. <citation>
2. <citation>
...

---
† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.
```

- Top heading reflects the audience: "Academic", "Industry", or "Complete" for `--audience=all`.
- Generation timestamp and repo URL included for traceability.
- Two top-level sections in fixed order: Peer-Reviewed Publications, then Conference Presentations.
- Within each section, entries are grouped by year, descending.
- Within each year, sequential numbering (1, 2, 3, ...) restarts per year.
- Footnote line appears only if any `†` or `‡` markers are present in the document.

### Citation format (AGU/GSA-style, year after authors)

**Author list:**
- Comma-separated, no "and" before the final author.
- Each author rendered as `Surname, F. M.` with initials.
- The author string `M. R. M. Izawa` is rendered **bold** wherever it appears.
- Student markers (`†`, `‡`) follow the student's name, before any comma.

**Fields, in order:** `<authors>, <year>. <title>. <venue>. doi:<doi>` (or url if no DOI).

- Authors and year separated by a comma.
- Title rendered verbatim as stored in the JSON; not italicized.
- Venue italicized. For papers: journal name from `journal` field. For conferences: `venue` field. If `venue` contains an abstract number, it is included verbatim.
- DOI appended as `doi:<doi>` when present.
- If no DOI and `url` is non-null, append URL verbatim.
- If neither DOI nor URL, venue is the final element.

**Example rendering (conference entry):**

> 1. Cao, F.‡, **Izawa, M. R. M.**, Luo, T.†, Flemming, R. L., McCausland, P. J. A., Hall, B. J., Yokoyama, S., Zhao, Y.-Y. S., 2026. Mineralogy, petrography, and geochemistry of ungrouped achondrite Northwest Africa (NWA) 4587. *57th Lunar and Planetary Science Conference*, abstract 1880. https://www.hou.usra.edu/meetings/lpsc2026/pdf/1880.pdf

### Within-year ordering

1. First-author entries (`firstAuthor: true`) first.
2. Then co-authored entries.
3. Within each group, alphabetical by the first author's surname.

### Markdown vs DOCX rendering

Both outputs share the same structured data but different rendering layers:

- **Markdown** — plain string writes; headings as `#`/`##`/`###`; **bold** via `**...**`; italics via `*...*`; superscript markers as literal `†`/`‡`.
- **DOCX** — uses the `docx` npm package. Each citation becomes a `Paragraph` with mixed runs (bold run for Izawa's name, italic run for venue, normal runs for the rest). Headings as `HeadingLevel.HEADING_1` / `HEADING_2` / `HEADING_3`. Numbered lists via the library's numbering config.

## CLI and npm Scripts

```json
{
  "scripts": {
    "pubs":           "node scripts/generate-pubs.js --audience=all",
    "pubs:academic":  "node scripts/generate-pubs.js --audience=academic",
    "pubs:industry":  "node scripts/generate-pubs.js --audience=industry",
    "pubs:all":       "node scripts/generate-pubs.js --audience=all"
  }
}
```

**Direct invocation:** `node scripts/generate-pubs.js --audience=<name>`
- Unknown audience values fail with a non-zero exit code and an error message listing valid audiences (discovered by scanning the union of all `audiences` arrays across both data files, plus the reserved name `all`).

**Output files (per invocation):**
- `exports/publications-<audience>.md`
- `exports/publications-<audience>.docx`

## Repository Changes

- **New file:** `scripts/generate-pubs.js`
- **New file:** `src/data/mentees.json`
- **New directory:** `exports/` (gitignored; tracked `exports/README.md` explains regeneration)
- **Modified:** `package.json` — adds `docx` dependency and the four npm scripts
- **Modified:** `.gitignore` — adds `exports/*.md` and `exports/*.docx` (keeps `exports/README.md` tracked)
- **Modified:** `publications.json` / `conferences.json` — no immediate bulk change; the optional `audiences` field gets added to individual entries over time as the user curates the industry subset

## Testing

- Unit tests using `node:test` (no new framework dependency):
  - `filterByAudience` — tagged entries, untagged entries, `all` mode, unknown audience
  - `groupByYear` — correct grouping, descending order
  - `sortWithinYear` — first-author first, alphabetical tiebreaker
  - `matchStudent` — canonical match, alias match, no match, missing aliases field
  - `formatCitation` — paper with DOI, conference with URL, entry with no DOI/URL, bold Izawa rendering, student markers
- Integration smoke test: run all three npm scripts, assert each output file exists, is non-zero bytes, and the DOCX is a valid ZIP.

## Open Items (deferred, not blocking this spec)

- Final list of undergraduate mentees to seed `mentees.json` — user supplies names when available.
- Additional aliases (e.g., "Chijiwa Takamu" canonical form) to be confirmed.
- Decision on whether `exports/` contents should eventually be tracked in git (once the format stabilizes and you want diff-able change history of your CV list).
