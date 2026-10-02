import { shelfSections } from '@/lib/groups';
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
