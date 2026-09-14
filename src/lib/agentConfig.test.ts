import { mcpConfig, mcpEndpoint } from '@/lib/agentConfig';

describe('mcpEndpoint', () => {
  it('appends the function path', () => {
    expect(mcpEndpoint('https://abc.supabase.co')).toBe('https://abc.supabase.co/functions/v1/mcp');
  });

  it('does not double the slash on a url that has one', () => {
    expect(mcpEndpoint('https://abc.supabase.co/')).toBe('https://abc.supabase.co/functions/v1/mcp');
  });

  it('ignores surrounding whitespace, which is what a pasted url has', () => {
    expect(mcpEndpoint('  https://abc.supabase.co  ')).toBe('https://abc.supabase.co/functions/v1/mcp');
  });
});

describe('mcpConfig', () => {
  const config = JSON.parse(mcpConfig('https://abc.supabase.co', 'clr_secret'));

  it('points at the function over http', () => {
    expect(config.mcpServers.cellar.type).toBe('http');
    expect(config.mcpServers.cellar.url).toBe('https://abc.supabase.co/functions/v1/mcp');
  });

  it('carries the token as a bearer header', () => {
    expect(config.mcpServers.cellar.headers.Authorization).toBe('Bearer clr_secret');
  });

  it('names the agent, so two of them are told apart on an entry', () => {
    const named = JSON.parse(mcpConfig('https://abc.supabase.co', 'clr_secret', 'codex'));
    expect(named.mcpServers.cellar.headers['x-cellar-agent']).toBe('codex');
  });
});
