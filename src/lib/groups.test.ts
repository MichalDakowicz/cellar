import { groupsFirst, shelfSections } from '@/lib/groups';
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

describe('groupsFirst', () => {
  const pin = (id: string, groupId: string | null = null, groupHome = false, pinned = false) => ({
    id,
    groupId,
    groupHome,
    pinned,
  });

  it('leads with the general project of each group, ahead of a pinned project', () => {
    const projects = [pin('jot'), pin('radar', 'ping'), pin('quick', null, false, true), pin('ping', 'ping', true)];
    expect(groupsFirst(projects, [group('ping')]).map((p) => p.id)).toEqual(['ping', 'quick', 'jot', 'radar']);
  });

  it('puts the general project of a pinned group first, then the other groups in their order', () => {
    const projects = [pin('mods', 'mods', true), pin('ping', 'ping', true)];
    expect(groupsFirst(projects, [group('mods'), group('ping', true)]).map((p) => p.id)).toEqual(['ping', 'mods']);
  });

  it('keeps pinned then the rest in the order they came', () => {
    const projects = [pin('a'), pin('b', null, false, true), pin('c'), pin('d', null, false, true)];
    expect(groupsFirst(projects, []).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('treats a general project whose group is gone as an ordinary project', () => {
    const projects = [pin('a'), pin('gone', 'deleted', true)];
    expect(groupsFirst(projects, []).map((p) => p.id)).toEqual(['a', 'gone']);
  });
});
