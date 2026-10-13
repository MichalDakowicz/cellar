import { commandDefinitions, commandIcon, formatCommandSettings, leadingCommand, parseCommandSettings } from './deskCommands';

it('round trips per-project overrides and ordered chains', () => {
  const text = 'check = npm:lint + npm:test\napk = gradle:assembleRelease';
  expect(formatCommandSettings(parseCommandSettings(text))).toBe(text);
  expect(parseCommandSettings('')).toEqual([]);
  expect(commandIcon('build:web')).toBe('rebuild');
});

it.each(['bad = sh:rm', 'x = npm:test;echo', 'x = npm:--eval', 'x = npm:test + ', 'x = npm:test\nx = npm:lint'])('rejects shell text or invalid chains: %s', (text) => {
  expect(() => parseCommandSettings(text)).toThrow();
});

it('validates actual strings, not regex coercion of missing values', () => {
  expect(() => commandDefinitions([{ steps: [{ runner: 'npm' }] }])).toThrow();
  expect(() => commandDefinitions([{ id: 'check', steps: [{ runner: 'npm' }] }])).toThrow();
});

it('only routes a leading named command to jobs, leaving project/entry refs as task context', () => {
  expect(leadingCommand('  $test ')).toBe('test');
  expect(leadingCommand('$build:web')).toBe('build:web');
  expect(leadingCommand('$cellar/thing')).toBeNull();
  expect(leadingCommand('please $test')).toBeNull();
  expect(leadingCommand('$--eval')).toBeNull();
});
