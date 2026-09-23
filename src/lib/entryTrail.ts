import type { Entry, LineSource, Project } from '@/types/cellar';

/**
 * What happened to a thought, and exactly when.
 *
 * Half of it was already written down and only needed reading: the drop has a
 * stamp, every line has one, every question has one for being asked and one
 * for being settled. What nothing recorded was a *move* — open to doing, idea
 * to glitch, the inbox to a project, into the archive and out. Those are rows
 * in `cellar_entry_events`, written by whoever made the move.
 *
 * So the trail is derived from the stamps that exist and merged with the moves
 * that were logged, and nothing is written twice. It also means a thought
 * dumped before the events table existed still has a trail — its drop, its
 * lines and its questions — with only the moves missing.
 *
 * Exact times live here and nowhere else. Every other surface keeps saying
 * "2d"; the trail is the one place where "17:04, 22 sep" is the useful answer.
 */

/** A logged move, as the row reads. */
export type TrailEvent = {
  id: string;
  what: string;
  fromValue: string | null;
  toValue: string | null;
  source: LineSource;
  agent: string | null;
  at: string;
};

export type NewTrailEvent = Omit<TrailEvent, 'id' | 'at'>;

type Moveable = Pick<Entry, 'state' | 'kind' | 'projectId' | 'archived'> & { importance?: string };
type Move = Partial<Moveable>;

/**
 * The moves a patch makes, one row per field that actually changed.
 *
 * Compared against the entry as it was, so re-setting a state it already has
 * writes nothing — the trail is what happened, not what was pressed.
 */
export function patchEvents(before: Moveable, patch: Move, who: { source: LineSource; agent: string | null }): NewTrailEvent[] {
  const out: NewTrailEvent[] = [];
  const add = (what: string, fromValue: string | null, toValue: string | null) =>
    out.push({ what, fromValue, toValue, source: who.source, agent: who.agent });

  if (patch.state !== undefined && patch.state !== before.state) add('state', before.state, patch.state);
  if (patch.kind !== undefined && patch.kind !== before.kind) add('kind', before.kind, patch.kind);
  if (patch.importance !== undefined && patch.importance !== (before.importance ?? 'normal')) {
    add('importance', before.importance ?? 'normal', patch.importance);
  }
  if (patch.projectId !== undefined && patch.projectId !== before.projectId) {
    add('filed', before.projectId, patch.projectId);
  }
  if (patch.archived !== undefined && patch.archived !== before.archived) {
    add(patch.archived ? 'archived' : 'restored', null, null);
  }
  return out;
}

export type TrailItem = {
  key: string;
  at: string;
  text: string;
  source: LineSource;
  /** Named when an agent did it. */
  agent: string | null;
};

const CLIP = 70;

function clip(text: string): string {
  return text.length <= CLIP ? text : `${text.slice(0, CLIP - 1).trimEnd()}…`;
}

function placeName(id: string | null, projects: Pick<Project, 'id' | 'name'>[]): string {
  if (id === null) return 'the inbox';
  return projects.find((project) => project.id === id)?.name ?? 'a project since deleted';
}

function moveText(event: TrailEvent, projects: Pick<Project, 'id' | 'name'>[]): string {
  switch (event.what) {
    case 'state':
      return `${event.fromValue ?? '?'} → ${event.toValue ?? '?'}`;
    case 'claimed':
      return 'picked up';
    case 'released':
      return 'put back';
    case 'reopened':
      return `reopened from ${event.fromValue ?? 'settled'}`;
    case 'kind':
      return `kind ${event.fromValue ?? '?'} → ${event.toValue ?? '?'}`;
    case 'importance':
      return `importance ${event.fromValue ?? '?'} → ${event.toValue ?? '?'}`;
    case 'filed':
      return event.fromValue === null
        ? `filed into ${placeName(event.toValue, projects)}`
        : `moved from ${placeName(event.fromValue, projects)} to ${placeName(event.toValue, projects)}`;
    case 'archived':
      return 'archived';
    case 'restored':
      return 'unarchived';
    default:
      return event.what;
  }
}

/** Every stamp on the thought and every logged move, oldest first. */
export function entryTrail(
  entry: Pick<Entry, 'id' | 'createdAt' | 'projectId' | 'agent' | 'lines' | 'questions'>,
  events: TrailEvent[],
  projects: Pick<Project, 'id' | 'name'>[],
): TrailItem[] {
  // Where it was dropped is where it is now, unless a move says otherwise: the
  // first `filed` event's from-value is the place it started.
  const firstFiled = events.find((event) => event.what === 'filed');
  const droppedInto = firstFiled ? firstFiled.fromValue : entry.projectId;

  const items: TrailItem[] = [
    { key: 'dropped', at: entry.createdAt, text: `dropped into ${placeName(droppedInto, projects)}`, source: 'user', agent: null },
  ];

  for (const line of entry.lines) {
    items.push({
      key: `line:${line.id}`,
      at: line.createdAt,
      text: `${line.source === 'agent' ? 'reported' : 'added'} "${clip(line.text)}"`,
      source: line.source,
      agent: null,
    });
  }

  for (const question of entry.questions) {
    items.push({
      key: `asked:${question.id}`,
      at: question.createdAt,
      text: `asked "${clip(question.question)}"`,
      source: 'agent',
      agent: question.agent,
    });
    if (question.answeredAt) {
      items.push({
        key: `answered:${question.id}`,
        at: question.answeredAt,
        text: `answered${question.answeredVia === 'chat' ? ' in the chat' : ''} "${clip(question.answer ?? '')}"`,
        source: 'user',
        agent: null,
      });
    } else if (question.dismissedAt) {
      items.push({ key: `dismissed:${question.id}`, at: question.dismissedAt, text: 'waved a question off', source: 'user', agent: null });
    }
  }

  for (const event of events) {
    items.push({ key: `event:${event.id}`, at: event.at, text: moveText(event, projects), source: event.source, agent: event.agent });
  }

  // Stable on ties: a claim and the state move it makes share a stamp, and they
  // should read in the order they were written.
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.at.localeCompare(b.item.at) || a.index - b.index)
    .map(({ item }) => item);
}
