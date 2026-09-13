# Cellar

A mind dump for the things you are building. React Native / Expo app, Android-first, with
a web build on Firebase Hosting.

Sibling to [Radar](https://github.com/MichalDakowicz/radar) (movies & shows),
[Lidar](https://github.com/MichalDakowicz/lidar) (books),
[Sonar](https://github.com/MichalDakowicz/sonar) (music) and
[Pulsar](https://github.com/MichalDakowicz/pulsar) (habits) — all five share one Supabase
project, so the account, its profile and the theme are the same everywhere. The cellar
itself is private: owner-only at the database, with no sharing switch and nothing to turn
on (`docs/shared-database.md`).

## What it does

Three levels, and they are the whole idea: **shelf → project → entry.**

- **Dump** — the home screen is a field. Type the thought, hit return, it is caught. Pick
  a project inline and it files itself; pick nothing and it lands in the inbox. The nav
  bar switches the field into a raw dump, where one line in is one entry out.
- **Shelves** — the layer above projects. Apps on one, minecraft mods on another. Two
  kinds of work in one flat list is the exact thing this app exists to stop.
- **Projects, read two ways** — grouped by kind, so "what are the open glitches" is one
  glance; or one stream cut into days, so "what was I thinking about on Tuesday" is one
  glance. Same entries, same filter, one toggle.
- **Eight kinds** — idea, addition, removal, glitch, question, research, copy, design —
  shown as a monochrome mono code in a left gutter rather than eight colours. The codes
  are alignment first and information second; that is what makes a wall of one-liners
  scan.
- **An entry grows without being rewritten** — it stays one line forever, and coming back
  to dump more into it appends another. What you thought then and what you worked out
  later stay separate readings.
- **Nothing is deleted to clear it** — archive takes an entry out of the project and the
  inbox, search still finds it, and one tap brings it back. Delete exists, is small, red,
  and asks.

## Setup

1. Run Radar's `supabase/schema.sql` first — it owns the shared tables.
2. Run this repo's `supabase/schema.sql` (Dashboard → SQL Editor → paste → Run). It is
   idempotent and refuses to run before Radar's.
3. `.env` needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. `npm install`, then `npx expo run:android --device`.

## Commands

| Task           | Command                         |
| -------------- | ------------------------------- |
| Dev server     | `npm start`                     |
| Android device | `npx expo run:android --device` |
| Tests          | `npm test`                      |
| Lint           | `npm run lint`                  |
| Types          | `npx tsc --noEmit`              |
| Web build      | `npm run build:web`             |
| Deploy web     | `npm run deploy:web`            |
| App icons      | `npm run icons`                 |
