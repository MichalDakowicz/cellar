# Pushing an agent's question to the phone

**Status: not built.** A blocked entry reaches you in the app — it badges the inbox
destination, sits at the top of the inbox under *waiting on you*, and shows the question on
the entry itself. It does **not** yet raise a banner on a phone that is in your pocket.

This is what that would take, written down while it was worked out, because the cost is
mostly in someone else's repo and in credentials no one but you can create.

## Why it is not a small change

Cellar has no notification code at all — no `expo-notifications`, no EAS project id in
`app.json`, no `google-services.json`. Radar has a whole system (`radar/supabase/notifications.sql`,
~1000 lines), and **Radar owns it**: `public.notifications`, `public.device_tokens`, the
`notification_kind` enum, `private.enqueue_notification`, `public.pending_push_notifications`,
and the `send-push` edge function that drains the queue into Expo's push service every
minute via `pg_cron`.

Cellar may not write any of that. Per `docs/shared-database.md` and the workspace rule,
Radar owns the shared core and a sibling never writes a table it owns.

## The three pieces

### 1. Radar, first — one PR in `../radar`

None of the shared notification tables know which app a row belongs to, so as they stand a
Cellar push would be delivered to Radar.

- `public.device_tokens` gets `app text not null default 'radar'`. The primary key stays the
  token; one phone with both apps installed holds two Expo tokens, one per Expo project.
- `public.notifications` gets the same column.
- `public.pending_push_notifications` joins `d.app = n.app` so a row only goes to tokens for
  its own app.
- `notification_kind` gets `cellar_question` (`alter type ... add value if not exists`, the
  pattern already used there).
- `private.notification_allowed` has to let the new kind through; that means a
  `notify_cellar boolean not null default true` on `user_settings` — Radar's column, in
  Radar's file.
- A `public.enqueue_app_notification(...)` wrapper, security definer, granted to
  `authenticated`, so Cellar can enqueue without reaching into `private`.

Run Radar's file in the SQL Editor before Cellar's, as always.

### 2. Cellar's own side

- `supabase/schema.sql`: a trigger on `cellar_entries` that fires when `state` becomes
  `blocked` and calls the wrapper with the entry's text as the title and the question as the
  body. Idempotent, dedupe key `cellar_question:<entry_id>:<blocked_at>`.
- `npm i expo-notifications expo-device`, the plugin in `app.json`, a `cellar` Android
  channel, permission prompt, `pushRegistration` writing `app = 'cellar'`, and tap routing
  to `/entry/<id>`. Radar's `src/lib/notificationChannels.ts`, `src/lib/pushRegistration.ts`
  and `src/features/notifications/useNotificationTaps.ts` are the working reference.
- A settings toggle, because a notification the user cannot turn off is a notification they
  uninstall the app over.

### 3. Credentials — only you can do these

- `eas init` for Cellar, so `app.json` has an EAS project id. Without it
  `getExpoPushTokenAsync` has nothing to ask for and returns null.
- An Android app for `com.michaldakowicz.cellar` in a Firebase project, its
  `google-services.json` in the repo root and named in `app.json`, then
  `npx expo prebuild -p android`.
- The FCM V1 service account key uploaded to Cellar's Expo project.

Until all three exist, `fetchPushToken()` returns null and the inbox is the whole story —
which is exactly how Radar behaves before its own credentials are in place, and is why that
code is written to treat a missing token as normal rather than as an error.

## Worth knowing

The in-app half already works and is most of the value: the entry is badged, it is at the
top of the inbox, and the question is on the entry. The banner only matters for the case
where an agent asks something while you are away from the app — real, but it is the last
10% and it costs a cross-repo PR plus three credential setups.
