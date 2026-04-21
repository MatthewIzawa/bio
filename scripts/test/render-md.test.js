import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/render-md.js';

const sections = {
  audience: 'academic',
  generatedOn: '2026-04-21',
  publications: [
    { year: 2025, entries: [
      { key: 'p1', year: 2025, title: 'Paper One', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
    ]},
  ],
  conferences: [
    { year: 2024, entries: [
      { key: 'c1', year: 2024, title: 'Talk A', authors: ['A. B', 'M. R. M. Izawa'], firstAuthor: false, venue: 'Conf X' },
    ]},
  ],
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
    publications: [
      { year: 2025, entries: [
        { key: 'p1', year: 2025, title: 'A', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
        { key: 'p2', year: 2025, title: 'B', authors: ['M. R. M. Izawa'], firstAuthor: true, journal: 'J' },
      ]},
    ],
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
