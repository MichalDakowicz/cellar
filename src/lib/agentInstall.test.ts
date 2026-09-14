import { SKILL_HOME, skillInstall } from './agentInstall';

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
