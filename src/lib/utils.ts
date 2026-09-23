import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** First letter of a name, uppercased — the monogram on a tile or an avatar. */
export function monogram(name: string | null | undefined): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || '?';
}

export { plural } from '@/lib/plural';

/**
 * Turns a Supabase read failure into a sentence.
 *
 * The one worth catching by hand is a missing table: `supabase/schema.sql` is
 * applied by hand, so a fresh project answers every query with "relation does
 * not exist" and the app would otherwise render as a user with no entries rather
 * than as a database with no tables.
 */
export function readError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/does not exist|PGRST205|schema cache/i.test(message)) {
    return 'cellar’s tables are not in the database yet. run supabase/schema.sql in the supabase dashboard, then pull to refresh.';
  }
  return message || 'the connection dropped somewhere between here and the server.';
}
