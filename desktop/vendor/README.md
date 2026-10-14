# Embedded scrcpy server

Cellar uses the unmodified Android server from Genymobile scrcpy 4.0 to stream
H.264 directly into its own phone panel. No separate scrcpy window or executable.

- Release: https://github.com/Genymobile/scrcpy/releases/tag/v4.0
- Asset: `scrcpy-server-v4.0`
- SHA-256: `84924bd564a1eb6089c872c7521f968058977f91f5ff02514a8c74aff3210f3a`
- License: Apache 2.0, reproduced in `scrcpy-LICENSE`.
- Protocol: https://github.com/Genymobile/scrcpy/blob/v4.0/doc/develop.md

The protocol is version-specific. Upgrade the binary, hash and parser together.
The server runs only while the phone panel is watching an authorized ADB device;
closing the panel closes its socket/process and removes its own ADB forward.
