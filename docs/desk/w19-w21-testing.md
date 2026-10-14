# W19–W21 verification — 2026-10-14

## W19 — screens both ways

User confirmed touch and keyboard control on the installed phone. User then
reported very large screen delay in both directions, while input delay was small.
Replaced repeated screenshot presentation with native video pipelines:

- PC: primary display capture shared by consented WebRTC peers, up to 1280×720,
  30 fps, 3 Mbps. Separate hidden capture renderer; no host/account preload.
- Phone: embedded Apache-2.0 scrcpy 4.0 encoder, pinned official SHA256 recorded
  in `desktop/vendor/README.md`; H.264 up to 1280 px, 30 fps, 4 Mbps. No external
  launcher. WebCodecs prefers hardware decoding; decoder/server queues are bounded.
- Windows input: persistent hidden worker, startup about 798 ms once; 100 protocol
  pings median 0.128 ms / p95 0.390 ms. Benchmark sends no actual user input.

Local pipeline checks: PC decoded 30 frames in four seconds on an idle display,
1280×720, average jitter-buffer delay 5.1 ms. Actual phone encoder emitted 108
frames in four seconds (27 fps), about 252 KB; renderer decoded 64 frames in
another idle-display check with zero errors and zero queued frames. Static
screens naturally yield fewer frames. These measurements do not establish LAN
end-to-end latency. Final installed package phone-video ticket/socket also
returned real packets. User confirmed smooth video but still reported PC delay
and a phone-mirror refresh after swipes. Fixed the latter: input no longer resets
device discovery or unmounts the video component; selected device stays pinned
during driver refresh. PC receiver now requests zero additional jitter buffering.
PC latency improvement from that tuning remains unconfirmed.

Added the requested display-switch button, visible when multiple monitors exist.
Each lease selects its display; video and input use that same monitor, including
its physical origin/DPI. Disconnecting a selected monitor refuses input. Real
capture/decode checks pass on both connected monitors (GO27Q24 and VG240Y), with
4.8/8.2 ms average local jitter-buffer delays. Consent and switching fixtures
cover invalid display IDs, video/input routing and unplugged displays.

Consent fixtures cover allow/deny/trust, account/pair-key revocation, sequence
replay, expiry and SDP access after release. Preview cookies cannot authorize
screen video. ADB fixtures cover driver/account gates, live-run token replay,
shell quoting and bounded protocol parsing. Agent secrets are redacted from logs.
User/agent driver selection is distinct from view-only video. Android system
authorization remains user-controlled.

Final Windows unpacked package replaces the original executable path while
preserving its profile/pairing. Final Android release APK installed successfully
and launched as `com.michaldakowicz.cellar`. No live Claude runs were performed.
Raw evidence and logs are local ignored files under `artifacts/qa/w19-w21/` and
`artifacts/qa/w19-w21-*.log`.

## W20 — race, night shift and group runs

Actual signed host race `db352882-bdb4-47d2-a221-0cdf146050bd` started Codex runs
`05c34e7a` and `870333f0` from the same pinned main commit
`af6989d5fb975cd74c38e6decf5a12c507e63e0b`. Both read README and finished with
`CELLAR_RACE_OK`, without project changes. Real comparison initially exposed raw
provider envelopes; fixed to use durable assistant messages. Installed final host
returned readable summaries. Winner pick confirmed; both clean QA checkouts were
removed through guarded cleanup/review APIs. Branches and chat remain recoverable.

Real Git fixtures advance main between starts and assert identical member bases.
They also cover restart/duplicate-ID recovery, pick/retention, sequential night
dispatch, time expiry, cap and Stop all cancelling queued members. Pure parser
tests bound windows, reserve, projects and agents; night rejects full-access mode.
Group and night scheduling are fixture-verified; no actual overnight run or live
Claude run was performed. Group shares the same verified start/rules/worktree path.

Phone race route and final desktop run-plan components were inspected. Existing
Night settings point to queue/digest; sample presenters remain behind sample mode.
Night scheduling requires an awake signed-in PC. Usage reserve applies only to
reported provider windows; the run cap always applies. No push digest scheduler
was added. No automatic shipping or recipe after-commands occur in night runs.
