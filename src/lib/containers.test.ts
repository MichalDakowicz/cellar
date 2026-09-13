import {
  canDeleteShelf,
  checkName,
  deleteProjectCost,
  deleteShelfCost,
  nameErrorText,
} from '@/lib/containers';
import type { Entry, Project, Shelf } from '@/types/cellar';

const shelf = (id: string): Shelf => ({ id, name: id, position: 0, createdAt: '' });
const project = (id: string, shelfId: string): Project => ({
  id,
  shelfId,
  name: id,
  position: 0,
  createdAt: '',
});

let seq = 0;
const entry = (projectId: string | null): Entry => ({
  id: `e${seq++}`,
  projectId,
  text: 't',
  kind: 'idea',
  state: 'open',
  archived: false,
  createdAt: '',
  lines: [],
});

describe('checkName', () => {
  it('rejects a blank or whitespace-only name', () => {
    expect(checkName('   ', [])).toBe('empty');
  });

  it('rejects a duplicate regardless of case or padding', () => {
    expect(checkName('  Radar ', ['radar'])).toBe('taken');
  });

  it('lets a rename keep its own name, so saving without changing it is not an error', () => {
    expect(checkName('radar', ['radar'], 'radar')).toBeNull();
  });

  it('allows a name no sibling holds', () => {
    expect(checkName('quasar', ['radar', 'lidar'])).toBeNull();
  });

  it('names the noun it is complaining about', () => {
    expect(nameErrorText('taken', 'shelf')).toContain('shelf');
    expect(nameErrorText('taken', 'project')).toContain('project');
    expect(nameErrorText(null, 'shelf')).toBeNull();
  });
});

describe('deleteProjectCost', () => {
  it('counts what falls back to the inbox rather than what is destroyed', () => {
    const cost = deleteProjectCost('p1', [entry('p1'), entry('p1'), entry('p2'), entry(null)]);
    expect(cost.toInbox).toBe(2);
    expect(cost.body).toBe('2 entries move back to the inbox.');
  });

  it('says so plainly when the project is empty', () => {
    expect(deleteProjectCost('p1', [entry('p2')]).body).toBe('nothing is in it.');
  });

  it('agrees the verb with the count', () => {
    expect(deleteProjectCost('p1', [entry('p1')]).body).toBe('1 entry moves back to the inbox.');
  });

  it('counts archived entries too — they come back with the rest', () => {
    const archived = { ...entry('p1'), archived: true };
    expect(deleteProjectCost('p1', [archived]).toInbox).toBe(1);
  });
});

describe('deleteShelfCost', () => {
  const projects = [project('p1', 's1'), project('p2', 's1'), project('p3', 's2')];

  it('counts the projects that cascade and the entries that survive', () => {
    const cost = deleteShelfCost('s1', projects, [entry('p1'), entry('p2'), entry('p3'), entry(null)]);
    expect(cost).toMatchObject({ projects: 2, toInbox: 2 });
    expect(cost.body).toBe('2 projects go with it, and 2 entries move back to the inbox.');
  });

  it('leaves the inbox clause out when nothing is filed there', () => {
    expect(deleteShelfCost('s2', projects, [entry(null)]).body).toBe('1 project goes with it.');
  });

  it('never counts an entry already in the inbox as something it moves', () => {
    expect(deleteShelfCost('s1', projects, [entry(null), entry(null)]).toInbox).toBe(0);
  });
});

describe('canDeleteShelf', () => {
  it('refuses the last shelf — the capture screen has to file onto one', () => {
    expect(canDeleteShelf([shelf('s1')])).toBe(false);
    expect(canDeleteShelf([])).toBe(false);
  });

  it('allows it once there is somewhere else to stand', () => {
    expect(canDeleteShelf([shelf('s1'), shelf('s2')])).toBe(true);
  });
});
