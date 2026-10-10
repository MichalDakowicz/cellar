import { deskLinkFor, DESK_LINKS, pinnedProjects } from './sidebar';

describe('deskLinkFor', () => {
  it('lights home, chat for any run, previews for any preview', () => {
    expect(deskLinkFor('/desk')).toBe('home');
    expect(deskLinkFor('/desk/run/abc')).toBe('chat');
    expect(deskLinkFor('/desk/chat')).toBe('chat');
    expect(deskLinkFor('/desk/preview/8081')).toBe('previews');
    expect(deskLinkFor('/desk/phone')).toBe('phone');
  });

  it('lights nothing elsewhere', () => {
    expect(deskLinkFor('/desk/new')).toBeNull();
    expect(deskLinkFor('/inbox')).toBeNull();
  });

  it('keeps the boards order', () => {
    expect(DESK_LINKS.map((link) => link.id)).toEqual(['home', 'chat', 'commands', 'previews', 'phone']);
  });
});

describe('pinnedProjects', () => {
  const projects = [
    { id: 'a', name: 'cellar', pinned: true, shelfId: 's1' },
    { id: 'b', name: 'solar', pinned: false, shelfId: 's1' },
    { id: 'c', name: 'mod', pinned: true, shelfId: 's2' },
  ];
  const entries = [
    { projectId: 'a', state: 'open', archived: false },
    { projectId: 'a', state: 'blocked', archived: false },
    { projectId: 'a', state: 'done', archived: false },
    { projectId: 'a', state: 'open', archived: true },
  ];

  it('lists the pinned ones on the shelf in view, with what is open', () => {
    expect(pinnedProjects(projects, entries, 's1')).toEqual([{ id: 'a', name: 'cellar', open: 2 }]);
  });

  it('lists every pinned one with no shelf picked', () => {
    expect(pinnedProjects(projects, entries, null).map((project) => project.name)).toEqual(['cellar', 'mod']);
  });
});
