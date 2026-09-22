import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveShelf } from './structure.ts';
import type { Shelf } from '@/types/cellar';

/**
 * A shelf argument has to behave like a project one, because they arrive the
 * same way: copied out of a tool result, or typed as the name the user calls it.
 * An ambiguous prefix is refused rather than guessed — picking the wrong shelf
 * puts a project in the wrong list and nothing says so.
 */

const shelf = (id: string, name: string): Shelf => ({
  id,
  name,
  position: 0,
  createdAt: '2026-09-14T12:00:00.000Z',
});

const apps = shelf('aaaaaaaa-0000-4000-8000-000000000000', 'apps');
const mods = shelf('bbbbbbbb-0000-4000-8000-000000000000', 'minecraft mods');

describe('resolveShelf', () => {
  it('finds one by its full id', () => {
    assert.equal(resolveShelf(apps.id, [apps, mods]).name, 'apps');
  });

  it('finds one by the short id a listing prints', () => {
    assert.equal(resolveShelf('bbbbbbbb', [apps, mods]).name, 'minecraft mods');
  });

  it('finds one by name, and by part of one', () => {
    assert.equal(resolveShelf('apps', [apps, mods]).id, apps.id);
    assert.equal(resolveShelf('minecraft', [apps, mods]).id, mods.id);
  });

  it('is case insensitive, because the name is typed from memory', () => {
    assert.equal(resolveShelf('APPS', [apps, mods]).id, apps.id);
  });

  it('prefers an exact name over a partial one it is inside of', () => {
    const modded = shelf('cccccccc-0000-4000-8000-000000000000', 'mods');
    assert.equal(resolveShelf('mods', [mods, modded]).id, modded.id);
  });

  it('refuses a partial that matches two rather than picking one', () => {
    const more = shelf('cccccccc-0000-4000-8000-000000000000', 'appliances');
    assert.throws(() => resolveShelf('app', [apps, more]), /Be exact/);
  });

  it('says so when nothing matches', () => {
    assert.throws(() => resolveShelf('nothing', [apps]), /No shelf called/);
  });

  it('refuses an empty argument instead of picking the first shelf', () => {
    assert.throws(() => resolveShelf('  ', [apps]), /No shelf given/);
  });
});
