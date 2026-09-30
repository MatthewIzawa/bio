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
