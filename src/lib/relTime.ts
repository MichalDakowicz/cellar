/**
 * Relative time, in the shortest honest form.
 *
 * Every clock is injectable, because a list that says "now" is exactly the sort
 * of thing that is only testable if `Date.now()` is an argument.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** `now` · `12m` · `5h` · `3d` · `6w`. Bare, for a list gutter. */
export function shortRel(iso: string, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  if (elapsed < 90_000) return 'now';
  if (elapsed < HOUR) return `${Math.round(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.round(elapsed / DAY)}d`;
  return `${Math.round(elapsed / WEEK)}w`;
}

/** The same value as a sentence: `just now` · `5h ago` · `3d ago`. */
export function longRel(iso: string, now: number = Date.now()): string {
  const short = shortRel(iso, now);
  return short === 'now' ? 'just now' : `${short} ago`;
}

/** `today` · `yesterday` · `4 days ago` · `12 Mar`. The heading over a day's dump. */
export function dayLabel(key: string, now: number = Date.now()): string {
  const [year, month, day] = key.split('-').map(Number);
  const then = new Date(year, (month ?? 1) - 1, day ?? 1);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - then.getTime()) / DAY);

  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** `dropped 5h ago · 12 Mar, 14:02`. The one stamp on an entry's own screen. */
export function dropStamp(iso: string, now: number = Date.now()): string {
  const when = new Date(iso);
  const exact = when.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return `dropped ${longRel(iso, now)} · ${exact}`;
}

/** How many of these landed in the last 24 hours. The cellar's own pulse. */
export function countToday(isoDates: string[], now: number = Date.now()): number {
  return isoDates.filter((iso) => now - new Date(iso).getTime() < DAY).length;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * `17:04 · 22 sep`, and the year only once it is not this one. The trail's
 * stamp — the one place in the app a thought's time is exact.
 *
 * Built by hand rather than with `toLocaleString`: the trail is a column of
 * these, and a locale that writes "22.09., 17:04" on one row and a 12-hour
 * clock on a device set differently turns a column into noise. Lowercase, the
 * way every other word in this app is.
 */
export function exactStamp(iso: string, now: number = Date.now()): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
  const day = `${when.getDate()} ${MONTHS[when.getMonth()]}`;
  const year = when.getFullYear() === new Date(now).getFullYear() ? '' : ` ${when.getFullYear()}`;
  return `${time} · ${day}${year}`;
}
