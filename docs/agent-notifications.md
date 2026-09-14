# Telling you an agent is waiting

A blocked entry reaches you three ways: a badge on the inbox destination, a *waiting on
you* section at the top of the inbox, and a banner on the phone.

**The banner needs no FCM, no push token and nothing of Radar's.** It is a *local*
notification, presented by the handset — the same mechanism as Pulsar's habit reminders,
woken on a schedule the way Radar's metadata sweep is.

## How it works

```
agent calls cellar_ask
      ↓
question row written, entry.state = 'blocked'
      ↓
  ┌── app in the foreground ──────── useCellar already has it ──┐
  │                                                              ├─▶ notifyBlockedQuestions
  └── app closed ── WorkManager wakes it hourly, headless ───────┘         (local banner)
```

| File                               | Does                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| `lib/entryQuestions.ts`            | **Pure.** What a question is, and when it is settled            |
| `lib/questionNotices.ts`           | **Pure.** Which questions still owe a banner. The tested part  |
| `lib/questionNotifier.ts`          | Presents them, remembers what it has shown (MMKV, per device)  |
| `lib/blockedWatchTask.ts`          | The headless wake: its own small query, then the notifier      |
| `lib/notificationChannels.ts`      | One Android channel, `questions`                               |
| `features/notifications/QuestionSync.tsx` | Mounted in the root layout: channels, registration, foreground check, taps |
| `cellar_settings.notify_questions` | The switch, on the account rather than the handset             |

A notice is identified by the entry **and the newest question outstanding on it**, not by the
entry. Asking something new on an already-blocked thought notifies again; re-blocking with
nothing added stays quiet.

One banner per entry even when several questions are waiting — two truncated questions in a
notification body read as one incoherent sentence, so the body becomes a count. All of them
are then remembered as shown, not just the newest: a banner that said "2 questions waiting on
you" has told you about both, and answering one must not make the other look like something
new to announce.

That distinction is the whole of `questionNotices.test.ts`, because the failure worth
preventing is not a missing banner — it is the same question arriving on every wake, which is
how an app gets its notifications switched off for good.

Entries blocked before questions were rows fall back to the last line an agent appended,
which is what asking used to mean. Without that they would go quiet forever.

## The trade

Latency. Android's WorkManager floor is 15 minutes and it ignores anything shorter; Cellar
asks for 60, and Doze can stretch that to hours on a phone in a pocket overnight. A push
would arrive in seconds.

That is the right trade here. The question is a thing to answer today, not a message to
reply to, and opening the app surfaces it instantly regardless. What it buys is the absence
of: an EAS project id, a Firebase Android app, an FCM V1 service account key, a
`device_tokens` row, an edge function, a `pg_cron` schedule, and a cross-repo PR against
Radar.

## What a real push would still cost

Only worth reading if the hourly wake ever proves too slow.

Radar owns the whole push system (`radar/supabase/notifications.sql`) and none of it knows
which app a row belongs to — as it stands a Cellar push would be delivered to Radar. It
would need, in Radar's repo and run first: an `app` column on `public.device_tokens` and
`public.notifications`, `pending_push_notifications` joining on it, a `cellar_question`
value on the `notification_kind` enum, a `notify_cellar` column on `user_settings`, and a
`public.enqueue_app_notification` wrapper so Cellar can enqueue without reaching into
`private`. Then, here: a trigger on `cellar_entries`, `expo-notifications` push
registration, and the three credentials above — `eas init`, a Firebase Android app for
`com.michaldakowicz.cellar` with its `google-services.json`, and the FCM key uploaded to
Cellar's Expo project.
