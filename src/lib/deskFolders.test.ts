import { commonParent, deskFolderFor, deskFolders, folderAllowed, groupRoots } from '@/lib/deskFolders';

const PROJECTS = [
  { id: 'ping', name: 'ping', repoPath: null, groupId: 'g', groupHome: true },
  { id: 'radar', name: 'radar', repoPath: 'C:/ping/radar', groupId: 'g' },
  { id: 'cellar', name: 'cellar', repoPath: 'C:\\ping\\cellar', groupId: 'g' },
  { id: 'solar', name: 'solar', repoPath: null, groupId: 'g' },
  { id: 'jot', name: 'jot.', repoPath: 'C:\\stuff\\jot', groupId: null },
  { id: 'loose', name: 'loose', repoPath: null, groupId: null },
];

describe('commonParent', () => {
  it('finds the folder the checkouts share, whatever the slashes', () => {
    expect(commonParent(['C:/ping/radar', 'C:\\ping\\cellar'])).toBe('C:\\ping');
    expect(commonParent(['/home/m/ping/a', '/home/m/ping/b'])).toBe('/home/m/ping');
  });

  it('refuses a bare drive, a single path, or one path inside another', () => {
    expect(commonParent(['C:\\ping\\radar', 'D:\\mods\\x'])).toBeNull();
    expect(commonParent(['C:\\a\\x', 'C:\\b\\y'])).toBeNull();
    expect(commonParent(['C:\\ping\\radar'])).toBeNull();
    expect(commonParent(['C:\\ping', 'C:\\ping\\radar'])).toBeNull();
  });
});

describe('groupRoots / deskFolderFor', () => {
  it('gives a group home its members root and every other project its own checkout', () => {
    expect(groupRoots(PROJECTS).get('g')).toBe('C:\\ping');
    expect(deskFolderFor(PROJECTS[0], PROJECTS)).toBe('C:\\ping');
    expect(deskFolderFor(PROJECTS[1], PROJECTS)).toBe('C:/ping/radar');
    expect(deskFolderFor(PROJECTS[3], PROJECTS)).toBeNull();
    expect(deskFolderFor(PROJECTS[5], PROJECTS)).toBeNull();
    expect(deskFolderFor(null, PROJECTS)).toBeNull();
  });

  it('lists roots first and leaves out what has nowhere to run', () => {
    expect(deskFolders(PROJECTS).map((folder) => [folder.name, folder.root])).toEqual([
      ['ping', true],
      ['radar', false],
      ['cellar', false],
      ['jot.', false],
    ]);
  });
});

describe('a group with its own folder', () => {
  const GROUPS = [{ id: 'g', repoPath: 'D:\\work\\ping\\' }];

  it('runs its home there instead of the derived root', () => {
    expect(groupRoots(PROJECTS, GROUPS).get('g')).toBe('D:\\work\\ping');
    expect(deskFolderFor(PROJECTS[0], PROJECTS, GROUPS)).toBe('D:\\work\\ping');
    expect(folderAllowed('D:\\work\\ping', PROJECTS, GROUPS)).toBe(true);
    expect(folderAllowed('C:\\ping', PROJECTS, GROUPS)).toBe(false);
  });

  it('gives a group with one checkout a root once it is told one', () => {
    const one = [
      { id: 'home', name: 'mods', repoPath: null, groupId: 'm', groupHome: true },
      { id: 'a', name: 'a', repoPath: 'C:\\mods\\a', groupId: 'm' },
    ];
    expect(deskFolderFor(one[0], one)).toBeNull();
    expect(deskFolderFor(one[0], one, [{ id: 'm', repoPath: 'C:\\mods' }])).toBe('C:\\mods');
  });
});

describe('folderAllowed', () => {
  it('allows a checkout, anything inside one, and exactly a group root', () => {
    expect(folderAllowed('C:\\ping\\cellar', PROJECTS)).toBe(true);
    expect(folderAllowed('C:\\ping\\cellar\\src', PROJECTS)).toBe(true);
    expect(folderAllowed('C:\\ping', PROJECTS)).toBe(true);
  });

  it('refuses the rest of the root and anything outside', () => {
    expect(folderAllowed('C:\\ping\\notes', PROJECTS)).toBe(false);
    expect(folderAllowed('C:\\', PROJECTS)).toBe(false);
    expect(folderAllowed('C:\\Users\\MSI', PROJECTS)).toBe(false);
  });
});
