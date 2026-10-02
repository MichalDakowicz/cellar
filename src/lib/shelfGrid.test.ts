import { shelfSections } from '@/lib/groups';
import { columnsFor, folderOutline, folderRun, shelfCells, type Rect } from '@/lib/shelfGrid';
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

const sections = (open: boolean) =>
  shelfSections(
    [project('radar', 'ping'), project('ping', 'ping', true), project('jot'), project('drinking')],
    [group('ping')],
  ).map((section) => ({ ...section, open }));

describe('shelfCells', () => {
  it('draws a closed folder as one tile, then the loose projects', () => {
    expect(shelfCells(sections(false)).map((cell) => cell.key)).toEqual(['f:ping', 'p:jot', 'p:drinking']);
  });

  it('puts an open folder\'s projects straight after it, general project first', () => {
    expect(shelfCells(sections(true)).map((cell) => cell.key)).toEqual(['f:ping', 'p:ping', 'p:radar', 'p:jot', 'p:drinking']);
  });

  it('tells an inside project where it lives and leaves loose ones alone', () => {
    const cells = shelfCells(sections(true));
    expect(cells.map((cell) => (cell.kind === 'project' ? cell.crumb : 'folder'))).toEqual(['folder', 'ping', 'ping', null, null]);
  });

  it('marks a folder as a run only while it is open', () => {
    expect(shelfCells(sections(false))[0].folderId).toBeNull();
    expect(shelfCells(sections(true))[0].folderId).toBe('ping');
  });

  it('keeps an empty folder as its own tile', () => {
    const cells = shelfCells(shelfSections([], [group('new')]).map((section) => ({ ...section, open: true })));
    expect(cells.map((cell) => cell.key)).toEqual(['f:new']);
  });
});

describe('folderRun', () => {
  it('lists the folder tile and what is drawn inside it, nothing else', () => {
    expect(folderRun(shelfCells(sections(true)), 'ping')).toEqual(['f:ping', 'p:ping', 'p:radar']);
  });

  it('is empty for a closed folder', () => {
    expect(folderRun(shelfCells(sections(false)), 'ping')).toEqual([]);
  });
});

describe('columnsFor', () => {
  it('climbs a step per breakpoint and floors at two', () => {
    expect([360, 768, 1024, 1280, 1536].map(columnsFor)).toEqual([2, 3, 4, 5, 6]);
  });
});

describe('folderOutline', () => {
  const cell = (col: number, row: number): Rect => ({ left: col * 100, top: row * 80, right: col * 100 + 100, bottom: row * 80 + 80 });
  const vertices = (path: string) => (path.match(/Q/g) ?? []).length;

  it('is nothing for no cells', () => {
    expect(folderOutline([], 2, 10)).toBe('');
  });

  it('is a four-cornered box round one cell', () => {
    const path = folderOutline([cell(0, 0)], 2, 10);
    expect(vertices(path)).toBe(4);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('stays a box round a full block', () => {
    expect(vertices(folderOutline([cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)], 2, 10))).toBe(4);
  });

  it('traces an L round three cells in two columns', () => {
    expect(vertices(folderOutline([cell(0, 0), cell(1, 0), cell(0, 1)], 2, 10))).toBe(6);
  });

  it('follows a run that starts mid-row and wraps', () => {
    // [   ][ a ][ b ]
    // [ c ][   ][   ]
    expect(vertices(folderOutline([cell(1, 0), cell(2, 0), cell(0, 1)], 2, 10))).toBe(8);
  });

  it('pulls the line in from the cells\' outer edges by the inset', () => {
    const path = folderOutline([cell(0, 0)], 4, 0);
    expect(path).toContain('M4 4');
    expect(path).toContain('96 4');
    expect(path).toContain('96 76');
  });

  it('never rounds a corner by more than half of the edge it sits on', () => {
    // 100 wide and 80 tall, radius 80: a bend is capped at 50 along the top and 40 down the side.
    expect(folderOutline([cell(0, 0)], 0, 80).startsWith('M0 40Q0 0 50 0')).toBe(true);
  });
});
