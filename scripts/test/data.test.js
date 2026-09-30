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
  // groupByYear returns an array of {year, entries} in descending year order
  assert.equal(groups.length, 2);
  assert.equal(groups[0].year, 2025);
  assert.equal(groups[1].year, 2024);
  assert.equal(groups[0].entries.length, 3);
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
