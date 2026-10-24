import { ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { AGENTS_SECTION, BEGIN, END, applySection } from './agents.mjs';
import { STEWARD_RULES } from './rules.mjs';

test('no AGENTS.md gives the section alone', () => {
  strictEqual(applySection(null), `${AGENTS_SECTION}\n`);
});

test('without markers the section is appended after one blank line', () => {
  const before = '# Agents\n\nUse tabs.\n';

  strictEqual(applySection(before), `${before}\n${AGENTS_SECTION}\n`);
});

test('a file with no final newline still gets one blank line', () => {
  strictEqual(applySection('Use tabs.'), `Use tabs.\n\n${AGENTS_SECTION}\n`);
});

test('with markers only the text between them is replaced', () => {
  const before = '# Agents\n\n';
  const after = '\n\n## Later\n\nKeep this.\n';
  const text = `${before}${BEGIN}\nold flow\n${END}${after}`;

  strictEqual(applySection(text), `${before}${AGENTS_SECTION}${after}`);
});

test('the current section is returned unchanged', () => {
  const text = `# Agents\n\n${AGENTS_SECTION}\n`;

  strictEqual(applySection(text), text);
});

test('a begin marker with no end marker is not rewritten', () => {
  strictEqual(applySection(`# Agents\n\n${BEGIN}\nold flow\n`), null);
});

test('the section states the flow and its gate', () => {
  ok(AGENTS_SECTION.startsWith(BEGIN));
  ok(AGENTS_SECTION.endsWith(END));
  ok(AGENTS_SECTION.includes('explore -> propose -> apply'));
  ok(AGENTS_SECTION.includes('/start-change'));
  ok(AGENTS_SECTION.includes('/stop-change'));
  ok(AGENTS_SECTION.includes('only gate'));
});

test('the section does not repeat the rules', () => {
  const bullets = STEWARD_RULES.split('\n')
    .filter((line) => line.trimStart().startsWith('- '))
    .map((line) => line.trimStart().slice(2).replaceAll('"', ''));

  for (const bullet of bullets) ok(!AGENTS_SECTION.includes(bullet), bullet);
});
