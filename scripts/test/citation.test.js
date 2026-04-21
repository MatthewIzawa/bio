import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation, renderRunsAsMarkdown } from '../lib/citation.js';

const mentees = [
  { canonicalName: 'F. Cao', aliases: ['Fengke Cao'], relationship: 'student', role: 'PhD', status: 'completed' },
  { canonicalName: 'T. Luo', aliases: [], relationship: 'student', role: 'PhD', status: 'in_progress' },
  // A "mentee" (guidance without formal advisor role) must NOT be marked:
  { canonicalName: 'A. Mentee', aliases: [], relationship: 'mentee', role: 'PhD', status: 'completed' },
];

test('formatCitation: bolds Izawa, adds † for current student, ‡ for former', () => {
  const entry = {
    year: 2026,
    title: 'Test Title',
    authors: ['F. Cao', 'M. R. M. Izawa', 'T. Luo'],
    venue: 'Test Conf 2026',
  };
  const { runs } = formatCitation(entry, mentees);
  const izawa = runs.find(r => r.text === 'M. R. M. Izawa');
  assert.ok(izawa && izawa.bold === true, 'Izawa run must be bold');
  const supers = runs.filter(r => r.superscript).map(r => r.text);
  assert.deepEqual(supers, ['‡', '†']);  // Cao completed, Luo in_progress
});

test('formatCitation: relationship="mentee" authors do NOT receive a marker', () => {
  const entry = {
    year: 2026,
    title: 'T',
    authors: ['A. Mentee', 'M. R. M. Izawa'],
    venue: 'V',
  };
  const { runs } = formatCitation(entry, mentees);
  const supers = runs.filter(r => r.superscript).map(r => r.text);
  assert.deepEqual(supers, [], 'mentee (non-student) must not be flagged');
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
