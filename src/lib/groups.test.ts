import { folderEdges, folderWidth, shelfSections } from '@/lib/groups';
import type { Group } from '@/types/cellar';

const group = (id: string, pinned = false): Group => ({
  id,
  shelfId: 's1',
  name: id,
  position: 0,
  pinned,
  createdAt: '2026-09-23T00:00:00.000Z',
});

const project = (id: string, groupId: string | null = null, groupHome = false) => ({ id, groupId, groupHome });

describe('shelfSections', () => {
  it('draws each group as a folder with its general project first, then the loose projects', () => {
    const sections = shelfSections(
      [project('radar', 'ping'), project('ping', 'ping', true), project('jot'), project('lidar', 'ping')],
      [group('ping')],
    );
    expect(sections).toEqual([
      { type: 'group', group: group('ping'), projects: [project('ping', 'ping', true), project('radar', 'ping'), project('lidar', 'ping')] },
      { type: 'loose', projects: [project('jot')] },
    ]);
  });

  it('puts pinned groups first', () => {
    const sections = shelfSections([], [group('mods'), group('ping', true)]);
    expect(sections.map((section) => (section.type === 'group' ? section.group.id : 'loose'))).toEqual(['ping', 'mods']);
  });

  it('keeps an empty folder, and leaves out an empty loose band', () => {
    expect(shelfSections([], [group('new')])).toEqual([{ type: 'group', group: group('new'), projects: [] }]);
  });

  it('reads a project whose group is gone as loose rather than losing it', () => {
    expect(shelfSections([project('radar', 'deleted')], [])).toEqual([{ type: 'loose', projects: [project('radar', 'deleted')] }]);
  });
});

describe('folderEdges', () => {
  // Three tiles in two columns, under a header: an L, not a box.
  //   [ header      ]
  //   [ 0 ] [ 1 ]
  //   [ 2 ]
  it('traces an L around three tiles in two columns', () => {
    expect(folderEdges(0, 3, 2)).toMatchObject({ top: false, left: true, right: false, bottom: false });
    expect(folderEdges(1, 3, 2)).toMatchObject({ top: false, left: false, right: true, bottom: true, bottomRight: true });
    expect(folderEdges(2, 3, 2)).toMatchObject({ left: true, right: true, bottom: true, bottomLeft: true, bottomRight: true });
  });

  it('never rounds the concave corner where the short row meets the long one', () => {
    expect(folderEdges(1, 3, 2).bottomLeft).toBe(false);
    expect(folderEdges(2, 3, 2).topRight).toBe(false);
  });

  it('is a plain rectangle when the last row is full', () => {
    const edges = [0, 1, 2, 3].map((index) => folderEdges(index, 4, 2));
    expect(edges.filter((edge) => edge.bottom)).toHaveLength(2);
    expect(edges.filter((edge) => edge.right)).toHaveLength(2);
  });

  it('closes the top of the first row when there is no header above it', () => {
    expect(folderEdges(0, 2, 2, false)).toMatchObject({ top: true, topLeft: true });
  });
});

describe('folderWidth', () => {
  it('is as wide as the first row and never wider', () => {
    expect(folderWidth(1, 3)).toBe(1);
    expect(folderWidth(5, 3)).toBe(3);
    expect(folderWidth(0, 3)).toBe(1);
  });
});
