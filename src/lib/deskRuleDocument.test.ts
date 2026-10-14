import { instructionDiff, renderedRules } from './deskRuleDocument';
import { managedRules, RULE_START, RULE_END } from './deskRecipes';

test('rendered rules hide block markers while preserving code examples', () => {
  const example = `\`\`\`html\n${RULE_START}\n${RULE_END}\n\`\`\``;
  expect(renderedRules(`${example}\n${RULE_START}\n- keep notes\n${RULE_END}\n`)).toBe(`${example}\n- keep notes\n`);
});
test('an appended block diff keeps only adjacent unchanged lines', () => {
  const before = Array.from({ length: 100 }, (_, i) => `instruction ${i}`).join('\n') + '\n';
  const diff = instructionDiff('CLAUDE.md', before, managedRules(before, ['keep notes']));
  expect(diff).toContain('--- CLAUDE.md'); expect(diff).toContain('instruction 99');
  expect(diff).not.toContain('instruction 0'); expect(diff).toContain('+ - keep notes');
  expect(diff.split('\n').length).toBeLessThan(15);
});
test('managed block replacement exposes removed and added rule with surrounding context', () => {
  const before = managedRules('unmanaged\n', ['old']) + 'tail\n';
  const diff = instructionDiff('AGENTS.md', before, managedRules(before, ['new']));
  expect(diff).toContain('- - old'); expect(diff).toContain('+ - new');
  expect(diff).toContain('  unmanaged'); expect(diff).toContain('  tail');
});
test('new, unchanged and CRLF files produce bounded truthful reviews', () => {
  expect(instructionDiff('AGENTS.md', '', '# rules\n')).toContain('+ # rules');
  expect(instructionDiff('AGENTS.md', 'same', 'same')).toBe('No changes to AGENTS.md.');
  expect(instructionDiff('CLAUDE.md', 'keep\r\nold\r\n', 'keep\r\nnew\r\n')).toContain('- old\n+ new');
});
