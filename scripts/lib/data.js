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
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.year)) map.set(e.year, []);
    map.get(e.year).push(e);
  }
  // Return array of {year, entries} in descending year order
  return [...map.keys()]
    .sort((a, b) => b - a)
    .map(year => ({ year, entries: map.get(year) }));
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
