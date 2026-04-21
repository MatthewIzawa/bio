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
  // Seed with built-in audiences that always have npm scripts defined.
  const set = new Set(['all', 'academic', 'industry']);
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

// Sort entries within each {year, entries} group, returns new array.
function sortGroups(yearGroups) {
  return yearGroups.map(g => ({ year: g.year, entries: sortWithinYear(g.entries) }));
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
