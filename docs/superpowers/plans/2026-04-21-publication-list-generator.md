# Publication List Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Node.js script `scripts/generate-pubs.js` that reads structured publication/conference/mentee data and emits audience-filtered publication lists as `.md` and `.docx` into `exports/`.

**Architecture:** Pure-function pipeline split across focused lib modules (data → filter → group → sort → format → render → write). `formatCitation` returns an abstract array of runs (`{text, bold?, italic?, superscript?}`) that both the Markdown and DOCX renderers consume, so citation logic lives in one place. TDD with `node:test` and `node:assert/strict` (Node 22+ built-ins; no test framework dependency).

**Tech Stack:** Node.js 22+ (ESM), `docx` npm package for DOCX output, `node:test` for tests.

---

## File Structure

```
scripts/
  generate-pubs.js               # CLI entry: parses --audience, wires pipeline, writes exports
  lib/
    data.js                      # loadData, filterByAudience, groupByYear, sortWithinYear
    mentees.js                   # matchStudent — returns role/status for an author string or null
    citation.js                  # formatCitation — returns {runs: [...]} abstract citation
    render-md.js                 # renderMarkdown — assembles full MD doc from sections
    render-docx.js               # renderDocx — assembles DOCX Buffer via `docx` package
  test/
    data.test.js
    mentees.test.js
    citation.test.js
    render-md.test.js
    integration.test.js

src/data/
  mentees.json                   # NEW seed data file

exports/
  README.md                      # TRACKED — explains regeneration
  publications-*.md              # gitignored
  publications-*.docx            # gitignored
```

---

### Task 1: Scaffolding — gitignore, exports, dep, npm scripts

**Files:**
- Modify: `.gitignore`
- Create: `exports/README.md`
- Modify: `package.json`

- [ ] **Step 1: Add exports globs to .gitignore**

Append to `.gitignore`:

```
# generated publication lists
exports/*.md
exports/*.docx
!exports/README.md
```

- [ ] **Step 2: Create exports/README.md**

```markdown
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
```

- [ ] **Step 3: Install docx package**

Run from repo root:

```bash
npm install --save-dev docx
```

Expected: installs, updates `package.json` devDependencies, updates `package-lock.json`.

- [ ] **Step 4: Add npm scripts**

Modify `package.json` `"scripts"` block to:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "pubs": "node scripts/generate-pubs.js --audience=all",
    "pubs:academic": "node scripts/generate-pubs.js --audience=academic",
    "pubs:industry": "node scripts/generate-pubs.js --audience=industry",
    "pubs:all": "node scripts/generate-pubs.js --audience=all",
    "test:pubs": "node --test scripts/test/"
  },
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore exports/README.md package.json package-lock.json
git commit -m "Scaffold publication list generator: gitignore, exports/, docx dep, npm scripts"
```

---

### Task 2: Seed mentees.json

**Files:**
- Create: `src/data/mentees.json`

- [ ] **Step 1: Create the seed file**

Write `src/data/mentees.json`:

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

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/mentees.json','utf8')); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
git add src/data/mentees.json
git commit -m "Seed mentees.json with Izawa advisees (PhD/MSc)"
```

---

### Task 3: Data loading, filtering, grouping, sorting (`scripts/lib/data.js`)

**Files:**
- Create: `scripts/lib/data.js`
- Create: `scripts/test/data.test.js`

- [ ] **Step 1: Write failing tests**

Create `scripts/test/data.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterByAudience,
  groupByYear,
  sortWithinYear,
} from '../lib/data.js';

const entries = [
  { key: 'a', year: 2025, firstAuthor: true,  authors: ['M. R. M. Izawa'], audiences: ['academic'] },
  { key: 'b', year: 2025, firstAuthor: false, authors: ['Z. Zed', 'M. R. M. Izawa'] }, // untagged
  { key: 'c', year: 2024, firstAuthor: false, authors: ['A. Alpha', 'M. R. M. Izawa'], audiences: ['industry'] },
  { key: 'd', year: 2025, firstAuthor: false, authors: ['B. Beta', 'M. R. M. Izawa'], audiences: ['academic', 'industry'] },
];

test('filterByAudience: "all" returns every entry', () => {
  assert.equal(filterByAudience(entries, 'all').length, 4);
});

test('filterByAudience: tagged audience returns tagged + untagged', () => {
  const result = filterByAudience(entries, 'academic').map(e => e.key).sort();
  assert.deepEqual(result, ['a', 'b', 'd']);
});

test('filterByAudience: entry with audiences=[] is treated as untagged (appears everywhere)', () => {
  const e = [{ key: 'x', year: 2025, authors: [], audiences: [] }];
  assert.equal(filterByAudience(e, 'academic').length, 1);
});

test('groupByYear: groups and returns descending years', () => {
  const groups = groupByYear(entries);
  assert.deepEqual(Object.keys(groups).map(Number), [2025, 2024]);
  assert.equal(groups[2025].length, 3);
});

test('sortWithinYear: first-author entries come first, then alphabetical by first author surname', () => {
  const year2025 = [
    { key: 'b', firstAuthor: false, authors: ['Z. Zed'] },
    { key: 'a', firstAuthor: true,  authors: ['M. R. M. Izawa'] },
    { key: 'd', firstAuthor: false, authors: ['B. Beta'] },
  ];
  const sorted = sortWithinYear(year2025).map(e => e.key);
  assert.deepEqual(sorted, ['a', 'd', 'b']);
});
```

- [ ] **Step 2: Run tests; verify they fail**

```bash
npm run test:pubs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/data.js`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../src/data');

export function loadData() {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
  return {
    publications: read('publications.json'),
    conferences:  read('conferences.json'),
    mentees:      read('mentees.json'),
  };
}

export function filterByAudience(entries, audience) {
  if (audience === 'all') return entries.slice();
  return entries.filter(e => {
    if (!Array.isArray(e.audiences) || e.audiences.length === 0) return true;
    return e.audiences.includes(audience);
  });
}

export function groupByYear(entries) {
  const map = {};
  for (const e of entries) {
    (map[e.year] ??= []).push(e);
  }
  // Return object with descending year keys (insertion order preserved in modern Node)
  const ordered = {};
  for (const year of Object.keys(map).map(Number).sort((a, b) => b - a)) {
    ordered[year] = map[year];
  }
  return ordered;
}

function surnameOf(authorString) {
  // "M. R. M. Izawa" → "Izawa"; handles hyphens/apostrophes.
  const tokens = authorString.trim().split(/\s+/);
  return tokens[tokens.length - 1];
}

export function sortWithinYear(entries) {
  return entries.slice().sort((a, b) => {
    if (a.firstAuthor !== b.firstAuthor) return a.firstAuthor ? -1 : 1;
    const sa = surnameOf(a.authors?.[0] ?? '');
    const sb = surnameOf(b.authors?.[0] ?? '');
    return sa.localeCompare(sb);
  });
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npm run test:pubs
```

Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/data.js scripts/test/data.test.js
git commit -m "Add data.js: loadData, filterByAudience, groupByYear, sortWithinYear"
```

---

### Task 4: Student matching (`scripts/lib/mentees.js`)

**Files:**
- Create: `scripts/lib/mentees.js`
- Create: `scripts/test/mentees.test.js`

- [ ] **Step 1: Write failing tests**

Create `scripts/test/mentees.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchStudent } from '../lib/mentees.js';

const mentees = [
  { canonicalName: 'F. Cao', aliases: ['Fengke Cao'], role: 'PhD', status: 'completed' },
  { canonicalName: 'X. Tian', aliases: ['Xinyi Tian'], role: 'PhD', status: 'in_progress' },
  { canonicalName: 'D. D. Uribe', aliases: ['Diego Uribe', 'D. Uribe'], role: 'MSc', status: 'completed' },
];

test('matchStudent: canonical name match returns mentee record', () => {
  const r = matchStudent('F. Cao', mentees);
  assert.equal(r.status, 'completed');
  assert.equal(r.role, 'PhD');
});

test('matchStudent: alias match returns mentee record', () => {
  const r = matchStudent('Diego Uribe', mentees);
  assert.equal(r.status, 'completed');
});

test('matchStudent: non-student returns null', () => {
  assert.equal(matchStudent('M. R. M. Izawa', mentees), null);
});

test('matchStudent: missing aliases field is safe', () => {
  const noAliases = [{ canonicalName: 'A. B', role: 'PhD', status: 'in_progress' }];
  assert.equal(matchStudent('A. B', noAliases).role, 'PhD');
  assert.equal(matchStudent('X. Y', noAliases), null);
});

test('matchStudent: case-sensitive exact match (no fuzzy)', () => {
  assert.equal(matchStudent('f. cao', mentees), null);
});
```

- [ ] **Step 2: Run tests; verify they fail**

```bash
npm run test:pubs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/mentees.js`**

```js
export function matchStudent(authorString, mentees) {
  for (const m of mentees) {
    if (m.canonicalName === authorString) return m;
    if (Array.isArray(m.aliases) && m.aliases.includes(authorString)) return m;
  }
  return null;
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npm run test:pubs
```

Expected: PASS — all 5 tests plus the 5 from Task 3.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/mentees.js scripts/test/mentees.test.js
git commit -m "Add mentees.js: matchStudent with canonical+alias exact matching"
```

---

### Task 5: Citation formatting (`scripts/lib/citation.js`)

**Files:**
- Create: `scripts/lib/citation.js`
- Create: `scripts/test/citation.test.js`

**Interface:** `formatCitation(entry, mentees)` returns `{runs: Array<{text, bold?, italic?, superscript?}>}`. A run with `text: "\n"` is not used — a citation is a single line.

- [ ] **Step 1: Write failing tests**

Create `scripts/test/citation.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation, renderRunsAsMarkdown } from '../lib/citation.js';

const mentees = [
  { canonicalName: 'F. Cao', aliases: ['Fengke Cao'], role: 'PhD', status: 'completed' },
  { canonicalName: 'T. Luo', aliases: [], role: 'PhD', status: 'in_progress' },
];

function textOf(runs) {
  return runs.map(r => r.text + (r.superscript ? '' : '')).join('');
}

test('formatCitation: bolds Izawa, adds † for current student, ‡ for former', () => {
  const entry = {
    year: 2026,
    title: 'Test Title',
    authors: ['F. Cao', 'M. R. M. Izawa', 'T. Luo'],
    venue: 'Test Conf 2026',
  };
  const { runs } = formatCitation(entry, mentees);
  // Find the Izawa run — must be bold
  const izawa = runs.find(r => r.text === 'M. R. M. Izawa');
  assert.ok(izawa && izawa.bold === true, 'Izawa run must be bold');
  // Find superscript markers
  const supers = runs.filter(r => r.superscript).map(r => r.text);
  assert.deepEqual(supers, ['‡', '†']);  // Cao completed, Luo in_progress
});

test('formatCitation: venue is italicized', () => {
  const entry = { year: 2025, title: 'T', authors: ['A. B'], venue: 'Journal X' };
  const { runs } = formatCitation(entry, []);
  const venue = runs.find(r => r.text === 'Journal X');
  assert.ok(venue && venue.italic === true, 'venue must be italicized');
});

test('formatCitation: appends DOI when present', () => {
  const entry = { year: 2024, title: 'T', authors: ['A. B'], journal: 'J', doi: '10.1/xyz' };
  const { runs } = formatCitation(entry, []);
  const joined = runs.map(r => r.text).join('');
  assert.ok(joined.includes('doi:10.1/xyz'));
});

test('formatCitation: appends URL when DOI absent and url non-null', () => {
  const entry = { year: 2024, title: 'T', authors: ['A. B'], venue: 'V', url: 'https://example.com/x' };
  const { runs } = formatCitation(entry, []);
  const joined = runs.map(r => r.text).join('');
  assert.ok(joined.includes('https://example.com/x'));
});

test('formatCitation: omits DOI and URL when both missing', () => {
  const entry = { year: 2024, title: 'T', authors: ['A. B'], venue: 'V' };
  const { runs } = formatCitation(entry, []);
  const joined = runs.map(r => r.text).join('');
  assert.ok(!joined.includes('doi:'));
  assert.ok(!joined.includes('http'));
});

test('renderRunsAsMarkdown: wraps bold with **, italic with *, keeps superscript literal', () => {
  const runs = [
    { text: 'Hello ' },
    { text: 'world', bold: true },
    { text: ' ' },
    { text: 'venue', italic: true },
    { text: '†', superscript: true },
  ];
  assert.equal(renderRunsAsMarkdown(runs), 'Hello **world** *venue*†');
});
```

- [ ] **Step 2: Run tests; verify they fail**

```bash
npm run test:pubs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/citation.js`**

```js
import { matchStudent } from './mentees.js';

const IZAWA = 'M. R. M. Izawa';

function studentMarker(mentee) {
  if (!mentee) return null;
  if (mentee.status === 'in_progress') return '†';
  if (mentee.status === 'completed')   return '‡';
  return null;
}

export function formatCitation(entry, mentees) {
  const runs = [];

  // Authors (comma-separated, no "and" before last)
  entry.authors.forEach((author, i) => {
    if (author === IZAWA) {
      runs.push({ text: author, bold: true });
    } else {
      runs.push({ text: author });
    }
    const marker = studentMarker(matchStudent(author, mentees));
    if (marker) runs.push({ text: marker, superscript: true });
    if (i < entry.authors.length - 1) runs.push({ text: ', ' });
  });

  // ", year. title. "
  runs.push({ text: `, ${entry.year}. ${entry.title}. ` });

  // Venue — journal name (paper) or venue string (conference) — italicized
  const venueText = entry.journal ?? entry.venue ?? '';
  if (venueText) runs.push({ text: venueText, italic: true });

  // DOI preferred, else URL, else nothing
  if (entry.doi) {
    runs.push({ text: `. doi:${entry.doi}` });
  } else if (entry.url) {
    runs.push({ text: `. ${entry.url}` });
  } else {
    runs.push({ text: '.' });
  }

  return { runs };
}

export function renderRunsAsMarkdown(runs) {
  return runs.map(r => {
    if (r.bold)   return `**${r.text}**`;
    if (r.italic) return `*${r.text}*`;
    return r.text;
  }).join('');
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npm run test:pubs
```

Expected: PASS — 6 new tests plus prior 10.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/citation.js scripts/test/citation.test.js
git commit -m "Add citation.js: formatCitation returns abstract runs; renderRunsAsMarkdown"
```

---

### Task 6: Markdown document renderer (`scripts/lib/render-md.js`)

**Files:**
- Create: `scripts/lib/render-md.js`
- Create: `scripts/test/render-md.test.js`

- [ ] **Step 1: Write failing tests**

Create `scripts/test/render-md.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/render-md.js';

const sections = {
  audience: 'academic',
  generatedOn: '2026-04-21',
  publications: {
    2025: [
      { key: 'p1', year: 2025, title: 'Paper One', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
    ],
  },
  conferences: {
    2024: [
      { key: 'c1', year: 2024, title: 'Talk A', authors: ['A. B', 'M. R. M. Izawa'], firstAuthor: false, venue: 'Conf X' },
    ],
  },
  mentees: [],
  hasStudents: false,
};

test('renderMarkdown: produces top heading reflecting audience', () => {
  const md = renderMarkdown(sections);
  assert.match(md, /^# Publication List — Academic/);
});

test('renderMarkdown: includes Peer-Reviewed and Conference section headings', () => {
  const md = renderMarkdown(sections);
  assert.match(md, /## Peer-Reviewed Publications/);
  assert.match(md, /## Conference Presentations/);
});

test('renderMarkdown: numbers entries sequentially within each year', () => {
  const md = renderMarkdown({
    ...sections,
    publications: {
      2025: [
        { key: 'p1', year: 2025, title: 'A', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
        { key: 'p2', year: 2025, title: 'B', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
      ],
    },
  });
  assert.match(md, /1\. \*\*M\. R\. M\. Izawa\*\*/);
  assert.match(md, /2\. \*\*M\. R\. M\. Izawa\*\*/);
});

test('renderMarkdown: shows footnote only when hasStudents is true', () => {
  assert.ok(!renderMarkdown(sections).includes('Current graduate'));
  const withStudents = renderMarkdown({ ...sections, hasStudents: true });
  assert.match(withStudents, /† Current graduate\/MSc student mentee\. ‡ Former graduate\/MSc student mentee\./);
});

test('renderMarkdown: "all" audience renders as "Complete"', () => {
  const md = renderMarkdown({ ...sections, audience: 'all' });
  assert.match(md, /^# Publication List — Complete/);
});
```

- [ ] **Step 2: Run tests; verify they fail**

```bash
npm run test:pubs
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/render-md.js`**

```js
import { formatCitation, renderRunsAsMarkdown } from './citation.js';

const AUDIENCE_LABEL = {
  academic: 'Academic',
  industry: 'Industry',
  all: 'Complete',
};

function renderYearBlock(year, entries, mentees) {
  const lines = [`### ${year}`];
  entries.forEach((entry, i) => {
    const { runs } = formatCitation(entry, mentees);
    lines.push(`${i + 1}. ${renderRunsAsMarkdown(runs)}`);
  });
  return lines.join('\n');
}

function renderSection(heading, groups, mentees) {
  const years = Object.keys(groups);
  if (years.length === 0) return `## ${heading}\n\n_(none)_\n`;
  const parts = [`## ${heading}`];
  for (const y of years) parts.push(renderYearBlock(y, groups[y], mentees));
  return parts.join('\n\n') + '\n';
}

export function renderMarkdown(sections) {
  const label = AUDIENCE_LABEL[sections.audience] ?? sections.audience;
  const header = [
    `# Publication List — ${label}`,
    `Generated: ${sections.generatedOn} from https://github.com/MatthewIzawa/bio`,
  ].join('\n');

  const pubs  = renderSection('Peer-Reviewed Publications', sections.publications, sections.mentees);
  const confs = renderSection('Conference Presentations',   sections.conferences,  sections.mentees);

  const parts = [header, pubs, confs];
  if (sections.hasStudents) {
    parts.push('---\n† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.\n');
  }
  return parts.join('\n\n');
}
```

- [ ] **Step 4: Run tests; verify they pass**

```bash
npm run test:pubs
```

Expected: PASS — 5 new tests plus prior 16.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/render-md.js scripts/test/render-md.test.js
git commit -m "Add render-md.js: renderMarkdown assembles full MD doc from sections"
```

---

### Task 7: DOCX document renderer (`scripts/lib/render-docx.js`)

**Files:**
- Create: `scripts/lib/render-docx.js`

(No unit tests — covered by Task 9 integration smoke test. The `docx` library output is hard to assert on beyond "is a valid ZIP with non-zero size," which the integration test handles.)

- [ ] **Step 1: Implement `scripts/lib/render-docx.js`**

```js
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
} from 'docx';
import { formatCitation } from './citation.js';

const AUDIENCE_LABEL = {
  academic: 'Academic',
  industry: 'Industry',
  all: 'Complete',
};

function runsToTextRuns(runs) {
  return runs.map(r => new TextRun({
    text: r.text,
    bold: !!r.bold,
    italics: !!r.italic,
    superScript: !!r.superscript,
  }));
}

// Numbering is rendered as a literal text prefix ("1. ", "2. ", ...) so it
// restarts per year without the complexity of dynamic docx numbering refs.
function yearParagraphs(year, entries, mentees) {
  const out = [
    new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(String(year))] }),
  ];
  entries.forEach((entry, i) => {
    const { runs } = formatCitation(entry, mentees);
    const prefix = new TextRun(`${i + 1}. `);
    out.push(new Paragraph({ children: [prefix, ...runsToTextRuns(runs)] }));
  });
  return out;
}

function sectionParagraphs(heading, groups, mentees) {
  const out = [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(heading)] }),
  ];
  const years = Object.keys(groups);
  if (years.length === 0) {
    out.push(new Paragraph({ children: [new TextRun({ text: '(none)', italics: true })] }));
    return out;
  }
  for (const y of years) out.push(...yearParagraphs(y, groups[y], mentees));
  return out;
}

export async function renderDocx(sections) {
  const label = AUDIENCE_LABEL[sections.audience] ?? sections.audience;

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`Publication List — ${label}`)] }),
    new Paragraph({ children: [new TextRun({
      text: `Generated: ${sections.generatedOn} from https://github.com/MatthewIzawa/bio`,
      italics: true,
    })] }),
    ...sectionParagraphs('Peer-Reviewed Publications', sections.publications, sections.mentees),
    ...sectionParagraphs('Conference Presentations',   sections.conferences,  sections.mentees),
  ];

  if (sections.hasStudents) {
    children.push(new Paragraph({ children: [new TextRun('')] }));
    children.push(new Paragraph({ children: [new TextRun('† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.')] }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/render-docx.js
git commit -m "Add render-docx.js: renderDocx emits Buffer via docx package"
```

---

### Task 8: CLI entry point (`scripts/generate-pubs.js`)

**Files:**
- Create: `scripts/generate-pubs.js`

- [ ] **Step 1: Implement CLI**

```js
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData, filterByAudience, groupByYear, sortWithinYear } from './lib/data.js';
import { matchStudent } from './lib/mentees.js';
import { renderMarkdown } from './lib/render-md.js';
import { renderDocx } from './lib/render-docx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = path.resolve(__dirname, '../exports');

function parseArgs(argv) {
  for (const a of argv) {
    if (a.startsWith('--audience=')) return a.slice('--audience='.length);
  }
  return null;
}

function validAudiences(publications, conferences) {
  const set = new Set(['all']);
  for (const e of [...publications, ...conferences]) {
    if (Array.isArray(e.audiences)) for (const a of e.audiences) set.add(a);
  }
  return set;
}

function detectStudents(entries, mentees) {
  for (const e of entries) {
    for (const author of e.authors ?? []) {
      if (matchStudent(author, mentees)) return true;
    }
  }
  return false;
}

function sortGroups(groups) {
  const out = {};
  for (const y of Object.keys(groups)) out[y] = sortWithinYear(groups[y]);
  return out;
}

async function main() {
  const audience = parseArgs(process.argv.slice(2));
  if (!audience) {
    console.error('Usage: node scripts/generate-pubs.js --audience=<name>');
    process.exit(2);
  }

  const { publications, conferences, mentees } = loadData();
  const valid = validAudiences(publications, conferences);
  if (!valid.has(audience)) {
    console.error(`Unknown audience "${audience}". Valid: ${[...valid].sort().join(', ')}`);
    process.exit(2);
  }

  const pubsFiltered  = filterByAudience(publications, audience);
  const confsFiltered = filterByAudience(conferences,  audience);

  const sections = {
    audience,
    generatedOn: new Date().toISOString().slice(0, 10),
    publications: sortGroups(groupByYear(pubsFiltered)),
    conferences:  sortGroups(groupByYear(confsFiltered)),
    mentees,
    hasStudents: detectStudents([...pubsFiltered, ...confsFiltered], mentees),
  };

  fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  const mdPath   = path.join(EXPORTS_DIR, `publications-${audience}.md`);
  const docxPath = path.join(EXPORTS_DIR, `publications-${audience}.docx`);

  fs.writeFileSync(mdPath, renderMarkdown(sections), 'utf8');
  fs.writeFileSync(docxPath, await renderDocx(sections));

  console.log(`Wrote ${path.relative(process.cwd(), mdPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), docxPath)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke-run the CLI**

```bash
npm run pubs:all
```

Expected output (paths):

```
Wrote exports/publications-all.md
Wrote exports/publications-all.docx
```

- [ ] **Step 3: Verify outputs are non-empty and DOCX is a valid ZIP**

```bash
node -e "const s = require('fs').statSync('exports/publications-all.md'); if (s.size === 0) { process.exit(1); } console.log('md size:', s.size)"
node -e "const b = require('fs').readFileSync('exports/publications-all.docx'); if (b[0] !== 0x50 || b[1] !== 0x4B) { console.error('not a zip'); process.exit(1); } console.log('docx size:', b.length, 'zip signature OK')"
```

Expected: both commands print a size and exit 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-pubs.js
git commit -m "Add generate-pubs.js CLI: wires pipeline, writes MD and DOCX to exports/"
```

---

### Task 9: Integration smoke test

**Files:**
- Create: `scripts/test/integration.test.js`

- [ ] **Step 1: Write integration test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(audience) {
  execFileSync('node', ['scripts/generate-pubs.js', `--audience=${audience}`], { cwd: root, stdio: 'pipe' });
}

function isZip(buf) {
  return buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4B;
}

for (const audience of ['all', 'academic', 'industry']) {
  test(`generate-pubs produces non-empty MD and valid DOCX for --audience=${audience}`, () => {
    run(audience);
    const md   = fs.readFileSync(path.join(root, `exports/publications-${audience}.md`), 'utf8');
    const docx = fs.readFileSync(path.join(root, `exports/publications-${audience}.docx`));
    assert.ok(md.length > 0, 'MD is empty');
    assert.match(md, /^# Publication List — /);
    assert.ok(docx.length > 0, 'DOCX is empty');
    assert.ok(isZip(docx), 'DOCX is not a valid ZIP');
  });
}

test('generate-pubs exits with code 2 for unknown audience', () => {
  assert.throws(() => {
    execFileSync('node', ['scripts/generate-pubs.js', '--audience=bogus'], { cwd: root, stdio: 'pipe' });
  }, /Command failed/);
});
```

- [ ] **Step 2: Run tests; verify all pass**

```bash
npm run test:pubs
```

Expected: PASS — all prior tests plus 4 new integration tests.

- [ ] **Step 3: Commit**

```bash
git add scripts/test/integration.test.js
git commit -m "Add integration smoke test: all three audiences + bogus audience"
```

---

## Self-Review Notes

**Spec coverage:**
- `audiences` field semantics → Task 3 (`filterByAudience`) + Task 9 (integration across audiences)
- mentees.json schema & matching → Task 2 (seed) + Task 4 (matcher)
- Citation format (bold Izawa, †/‡ markers, year after authors, italic venue, DOI/URL fallback) → Task 5
- Document structure (top heading with audience label, two sections, year groups, numbered entries, conditional footnote) → Task 6 + Task 7
- npm scripts & CLI (--audience validation, unknown-audience error) → Task 1 + Task 8 + Task 9
- Both MD and DOCX outputs → Task 6 + Task 7 + Task 8
- Tests with node:test → Tasks 3, 4, 5, 6, 9

**Placeholder scan:** No TBDs, no "handle edge cases" hand-waves. All code blocks are complete and runnable.

**Type consistency:** `{runs: [...]}` return shape of `formatCitation` is used identically by `renderRunsAsMarkdown` (Task 5) and `runsToTextRuns` (Task 7). `sections` shape (`audience, generatedOn, publications, conferences, mentees, hasStudents`) is produced by `main()` (Task 8) and consumed identically by `renderMarkdown` (Task 6) and `renderDocx` (Task 7).

**Out-of-scope reminders (per spec):** no auto-tagging of existing entries, no full CV sections, no LaTeX, no Astro changes. Plan respects these.
