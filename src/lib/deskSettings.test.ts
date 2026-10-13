import { defaultRecipe, EXTRA_KEYS, PING_KINDS, recipeLine, startingAgent } from './deskSettings';

describe('recipeLine', () => {
  it('names the agent and the mode in words', () => {
    expect(recipeLine({ agent: 'claude', mode: 'edits' })).toBe('claude · edits ok');
    expect(recipeLine({ agent: 'default', mode: 'ask' })).toBe('project default · ask first');
  });
});

describe('startingAgent', () => {
  it('keeps the default when the pc has it', () => {
    expect(startingAgent('codex', ['claude', 'codex'])).toBe('codex');
  });

  it('falls back to what the pc offers', () => {
    expect(startingAgent('codex', ['claude'])).toBe('claude');
  });

  it('keeps the default when the pc has said nothing yet', () => {
    expect(startingAgent('codex', [])).toBe('codex');
  });
});

describe('tables', () => {
  it('leaves @ $ / and # out of the free keys', () => {
    expect(EXTRA_KEYS.map((key) => key.key).filter((key) => '@$/#'.includes(key))).toEqual([]);
  });

  it('does not ping every turn out of the box', () => {
    expect(PING_KINDS.find((kind) => kind.label === 'every turn')?.on).toBe(false);
  });
});

describe('defaultRecipe', () => {
  it('is your defaults, the pick-up line, and nothing after', () => {
    const recipe = defaultRecipe('codex', 'ask');
    expect(recipeLine(recipe)).toBe('codex · ask first');
    expect(recipe.prompt).toContain('{entry}');
    expect(recipe.after).toEqual([]);
  });
});
