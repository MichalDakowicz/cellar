import {
  normalizeRepoPath,
  normalizeRepoUrl,
  projectForPath,
  projectsUnderPath,
  repoKey,
  repoLabel,
  repoUrlLabel,
} from '@/lib/repoLink';

const project = (id: string, repoPath: string | null) => ({ id, repoPath });

describe('repoKey', () => {
  it('folds separators and case so one directory is one key', () => {
    expect(repoKey('C:\\ping\\Cellar')).toBe('c:/ping/cellar');
    expect(repoKey('c:/ping/cellar/')).toBe('c:/ping/cellar');
  });

  it('strips quotes, which is how a path arrives when it was copied', () => {
    expect(repoKey('"C:\\ping\\cellar"')).toBe('c:/ping/cellar');
  });

  it('is null for nothing at all', () => {
    expect(repoKey('   ')).toBeNull();
    expect(repoKey(null)).toBeNull();
  });
});

describe('normalizeRepoPath', () => {
  it('keeps the case it was given — only matching folds it', () => {
    expect(normalizeRepoPath('  C:\\ping\\Cellar\\ ')).toBe('C:\\ping\\Cellar');
  });
});

describe('normalizeRepoUrl', () => {
  it('adds a scheme so the app can open what was typed', () => {
    expect(normalizeRepoUrl('github.com/you/cellar')).toBe('https://github.com/you/cellar');
  });

  it('turns a pasted ssh remote into something openable', () => {
    expect(normalizeRepoUrl('git@github.com:you/cellar.git')).toBe('https://github.com/you/cellar');
  });

  it('leaves a real url alone but drops the .git', () => {
    expect(normalizeRepoUrl('https://github.com/you/cellar.git')).toBe('https://github.com/you/cellar');
  });
});

describe('labels', () => {
  it('reads a forge url as owner/repo', () => {
    expect(repoUrlLabel('https://github.com/you/cellar')).toBe('you/cellar');
  });

  it('falls back to the checkout folder when there is no remote', () => {
    expect(repoLabel({ repoPath: 'C:\\ping\\cellar', repoUrl: null })).toBe('cellar');
  });

  it('prefers the remote when there is one', () => {
    expect(repoLabel({ repoPath: 'C:\\ping\\cellar', repoUrl: 'https://github.com/you/cellar' })).toBe('you/cellar');
  });
});

describe('projectForPath', () => {
  const projects = [
    project('cellar', 'C:\\ping\\cellar'),
    project('radar', 'C:\\ping\\radar'),
    project('nested', 'C:\\ping\\cellar\\mcp'),
    project('unlinked', null),
  ];

  it('resolves a working directory inside a checkout', () => {
    expect(projectForPath('C:\\ping\\cellar\\src\\lib', projects)?.id).toBe('cellar');
  });

  it('matches the checkout itself', () => {
    expect(projectForPath('C:\\ping\\radar', projects)?.id).toBe('radar');
  });

  it('takes the longest match, so a repo inside a repo wins', () => {
    expect(projectForPath('C:\\ping\\cellar\\mcp\\tools', projects)?.id).toBe('nested');
  });

  // The bug this whole function exists to avoid: filing work under a project
  // that merely shares a name prefix with the one you are standing in.
  it('does not match across a path boundary', () => {
    expect(projectForPath('C:\\ping\\cellar-old\\src', projects)).toBeNull();
  });

  it('is null above every checkout rather than guessing one', () => {
    expect(projectForPath('C:\\ping', projects)).toBeNull();
  });
});

describe('projectsUnderPath', () => {
  it('lists the checkouts inside a workspace directory', () => {
    const projects = [project('cellar', 'C:\\ping\\cellar'), project('radar', 'C:\\ping\\radar')];
    expect(projectsUnderPath('C:\\ping', projects).map((p) => p.id)).toEqual(['cellar', 'radar']);
  });

  it('does not count the directory itself', () => {
    const projects = [project('cellar', 'C:\\ping\\cellar')];
    expect(projectsUnderPath('C:\\ping\\cellar', projects)).toEqual([]);
  });
});
