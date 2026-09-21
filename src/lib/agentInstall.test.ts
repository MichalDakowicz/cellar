import { fullSetup, SKILL_HOME, skillInstall } from './agentInstall';

describe('skillInstall', () => {
  it('runs the powershell installer on windows', () => {
    expect(skillInstall('powershell')).toBe(`irm ${SKILL_HOME}/install.ps1 | iex`);
  });

  it('pipes the shell installer everywhere else', () => {
    expect(skillInstall('sh')).toBe(`curl -fsSL ${SKILL_HOME}/install.sh | sh`);
  });

  it('forgives a trailing slash on the base, so the url never doubles up', () => {
    expect(skillInstall('sh', 'https://example.test/skill/')).toBe(
      'curl -fsSL https://example.test/skill/install.sh | sh',
    );
  });
});

describe('fullSetup', () => {
  const supabase = 'https://abc.supabase.co';

  it('carries the token and the function url into the powershell line', () => {
    expect(fullSetup('powershell', supabase, 'clr_abc')).toBe(
      `$env:CELLAR_TOKEN='clr_abc'; $env:CELLAR_MCP_URL='https://abc.supabase.co/functions/v1/mcp'; irm ${SKILL_HOME}/install.ps1 | iex`,
    );
  });

  it('puts the variables in front of sh, where a piped script can read them', () => {
    expect(fullSetup('sh', supabase, 'clr_abc')).toBe(
      `curl -fsSL ${SKILL_HOME}/install.sh | CELLAR_TOKEN='clr_abc' CELLAR_MCP_URL='https://abc.supabase.co/functions/v1/mcp' sh`,
    );
  });

  it('points at the function, never at the project root', () => {
    expect(fullSetup('sh', 'https://abc.supabase.co/', 'clr_abc')).toContain('/functions/v1/mcp');
  });

  it('forgives a trailing slash on the skill base too', () => {
    expect(fullSetup('sh', supabase, 'clr_abc', 'https://example.test/skill/')).toContain(
      'https://example.test/skill/install.sh',
    );
  });

  it('trims a token that came in with whitespace around it', () => {
    expect(fullSetup('sh', supabase, '  clr_abc\n')).toContain("CELLAR_TOKEN='clr_abc'");
  });
});
