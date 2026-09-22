# Update notes

## 1.10.0 — Unreleased

### Added

- Project detail: copy a prompt for the whole project, not just for one thought in it
- Project detail: tap a state or kind heading to fold its entries away, and again to show them
- Project detail: read a project as a board, with columns by state or by kind under a toggle
- Project, board, inbox, search: long press a thought to hold several, then file or copy them
- Agent tools: an agent can now list shelves, and create, rename or move a shelf or a project
- Entry: hold an option on a question to pick more than one, and answer with all of them
- Entry: a settled question keeps its options on show, with the ones the answer took ticked
- Entry, project, inbox: a link in a thought or a line is tappable and reads as the page title
- Entry: a link on the thought grows a card with the site, the title and what the page says

### Changed

- Dump: a new line becomes a note under the thought instead of running into one long line
- Entry: the reports section reads from agent rather than naming the tool that wrote them

## 1.9.0 — 2026-09-21

### Added

- Entry: long press one of your own lines to remove it, with a confirm and undo until you leave
- Dump: swipe across the file it block to step to the next shelf, and it moves as you drag
- Settings: one line sets an agent up, registering the server and installing the skill together

### Changed

- Entry, project, search, settings: back sits on the title row instead of a row of its own
- Project detail: the heading sits at the right, with back and the view toggle stacked left
- Stats: the shelf the figures count sits opposite the heading instead of under it

### Fixed

- Settings: signing out drops you straight on the login screen instead of leaving you sitting there
- Entry: backing out of delete leaves the thought alone instead of quietly archiving it
- Entry: a thought that is gone keeps the nav, so there is still a way off the screen
- Projects: a rename you backed out of is gone next time you open the sheet, not waiting
- Dump: return makes a new line on a phone, and the key hint names what your keyboard has
- Inbox: the file pill lines up with the thought it files instead of hanging below the row

## 1.8.0 — 2026-09-16

### Fixed

- Projects: a tile counts only glitches still open, so one you have fixed stops showing
- Projects: the count by a shelf name leaves out archived thoughts and matches the tiles
- Projects: the edit dot on a tile no longer vanishes as you reach for it on the web
- Projects: the edit dot sits inside the tile artwork, off the bottom edge it was stuck to
- Projects: the message on an empty shelf sits in the middle of the page, not up at the top

## 1.7.0 — 2026-09-15

### Added

- Project detail: the wheel scrolls the entries from anywhere on the page, not only over them

### Fixed

- Archived thoughts read greyed out wherever they are listed, heading included
- Project: the figures rail is separated by space, with no stray line beside the scrollbar
- Web: the scrollbar is the slim pill it was meant to be, with no arrow buttons
- Project detail: the repo name and the checkout path sit on one line, level with each other
- Stats and the project rail count the idea bar as idea/addition, so the bucket names itself
- Dump: the band under the field is now lately, and shows recent thoughts from a cold start
- The kind glyph beside an entry sits level with the first line of the thought, not above it

## 1.6.0 — 2026-09-15

### Added

- What you dump, file or answer on one device shows up on the other without a refresh
- An agent's line, question or claim lands on the screen you are on as it happens
- A quiet mark by the nav when live changes are not getting through

## 1.5.0 — 2026-09-15

### Added

- An agent finds out you answered its question without waiting for its next session

## 1.4.0 — 2026-09-15

### Changed

- Project detail: where it stands is a spread line, with each state's share next to its count

## 1.3.0 — 2026-09-14

### Added

- Stats: a spread line for where the cellar stands, open to dropped, with each state's share
- Project: the grouped view bands by state first — blocked, doing, open, done, dropped, then archived — with the kinds inside each

### Changed

- Web: the scrollbar matches the app instead of the browser default
- Kind chips lead with glitch and removal, then idea, everywhere a kind is offered

### Removed

- Project: the show archived toggle — the archive is always the last band of the list

## 1.2.0 — 2026-09-14

### Added

- Settings: copy a one-line install that puts the agent skill on the machine your agent runs on
- Three lookup commands for an agent — what is open, a search across thoughts, one entry in full

## 1.1.0 — 2026-09-14

### Added

- Entry: questions an agent asked live in their own section, tagged answered or unanswered
- Entry: answer a question by tapping one of its options, or type your own answer
- Entry: wave a question off if you would rather not answer it, and it stops holding the thought up
- Entry: answered questions stay on the entry, so why it went the way it did is still there
- Entry: answering the last question takes the thought off blocked on its own

### Changed

- An agent with several tasks now asks here and carries on, instead of stopping on the first question

## 1.0.0 — 2026-09-14

### Added

- A cellar scope for a mark, the same ring and blip radar, lidar, sonar and pulsar wear
- Sign in with google, or with the email and password you already use in the other four
- Dump: a big field on the home screen, return to drop, and nothing in the way
- Dump: switch to a raw dump from the nav bar — one line in, one entry out
- Dump: pick the shelf, the project and the kind before you drop, or drop straight to the inbox
- Shelves: the layer above projects, so apps and minecraft mods are never one list
- Shelves: rename or delete a shelf from the shelf picker
- Projects: rename one, move it to another shelf, or delete it
- Projects: give a project the folder it lives in and its remote, so an agent can find the code
- Entries: an agent can pick one up, and what it reports back sits in its own section under yours
- Entries: blocked is a new state — an agent asked something and nothing moves until you answer
- Inbox: anything an agent stopped to ask about waits at the top, named with the project it came from
- A banner on the phone when an agent stops to ask you something, with a switch in settings
- Settings: set a password for the account, so the agent tools can sign in without a browser
- Settings: mint a token so an agent can reach the cellar without a server on your machine
- Settings: see when each agent token was last used, and revoke one in a tap
- A copy button on every entry, for the one line that starts that thought in an agent
- Projects: read one two ways — grouped by kind, or one stream cut into days
- Projects: filter by kind and state from the funnel beside the view toggle
- Seven kinds, not eight — addition was the same thought as idea, so it is gone
- Kinds wear a glyph in the list gutter instead of a mono code, and on every chip
- Entries: one line, and you can dump more into it later without editing what you first thought
- Entries: archive takes something out of the way without losing it, and search still finds it
- Deleting a project or a shelf never destroys entries — they move back to the inbox
- Inbox: everything unfiled, with a count on the tab and a sort on the nav bar
- Stats: what you dump, by kind and by project, narrowed to one shelf from the nav bar
- Search: every shelf, every project and the inbox at once, archived included
- Settings: the gutter codes, the default kind and view, and the theme you share with the siblings
- Web: the nav bar follows you into a project, an entry, search and settings, with back on it
- Web: press 1 to 5 for the destinations, n for the capture field and / to search
- Web: rows, tiles, chips and the nav bar answer the mouse, and a tile shows its edit dot on hover
- Web: a sheet opens as a dialog in the middle of a wide window instead of off the bottom edge
- Web: a wide window gets a sidebar — the destinations by name with their keys, and the shelf
- Web: the capture screen shows what you have caught lately in a column beside the field
- Web: every screen uses the width of the window instead of a phone column down the middle
- Web: a project opens with its state, its kinds and the filter beside the entries, not behind a funnel
- Web: a project page wears its own mark, and back sits above the title
- Web: the screen's action sits beside the heading it acts on instead of across the window
