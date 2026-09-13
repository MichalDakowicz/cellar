# Cellar — brand

The Ping mark, with Cellar's centre glyph and Cellar's accent. The ring and the blip are
frozen (PING.md §3.1) — they are what makes the five apps read as a set on a launcher.
Only the glyph and the colour change.

## The glyph

A vaulted niche — an arched alcove with an arched opening cut into it. A cellar is the room
you keep things in, and this is the wall of it: one opening, everything goes through it,
nothing ever has to come back out to stay findable.

It is a single `evenodd` path with no stroke. Two things about it are load-bearing:

- **The walls are ~7 units thick** on a 64-unit canvas, so the opening survives the 16px
  test. A thinner arch closes up and reads as a tombstone.
- **The opening stops 5 units short of the bottom.** An earlier draft ran it all the way
  down, which made the mark a doorway — and a doorway with those proportions reads as a
  lowercase **n**. The closed sill is what turns a letter back into a room.

| File | Contents | Use |
| --- | --- | --- |
| `logo.svg` | mark, accent-filled | `import Logo from '@/assets/brand/logo.svg'` |
| `logo-mono.svg` | same paths with `currentColor` | tintable — monochrome icon, inline glyph |
| `splash.svg` | same as `logo.svg` | splash / launch |
| `wordmark.svg` | mark + name, dark text | light backgrounds, README |
| `wordmark-dark.svg` | mark + name, light text | dark backgrounds, README dark mode |
| `google.svg` | Google's G | the OAuth button |

Every PNG under `assets/images/` is generated from `logo.svg` by `npm run icons`. Never
hand-edit them.

One flat colour, no gradients. `#64748B` — the `--primary` token from `src/theme/colors.ts`.
The backdrop everywhere is `#09090B`.
