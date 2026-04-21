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
