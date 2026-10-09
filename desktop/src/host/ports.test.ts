import assert from 'node:assert/strict';
import { test } from 'node:test';

import { listeningPorts, parseNetstat, parseTasklist } from './ports.ts';

const NETSTAT = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1180
  TCP    0.0.0.0:8081           0.0.0.0:0              LISTENING       4242
  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       5555
  TCP    192.168.1.40:139       0.0.0.0:0              LISTENING       4
  TCP    127.0.0.1:5173         127.0.0.1:61000        ESTABLISHED     5555
  TCP    [::1]:3000             [::]:0                 LISTENING       7777
  TCP    0.0.0.0:47821          0.0.0.0:0              LISTENING       9000
  TCP    0.0.0.0:5040           0.0.0.0:0              LISTENING       1400
`;

const TASKS = `"node.exe","4242","Console","1","120,000 K"
"vite.exe","5555","Console","1","80,000 K"
"svchost.exe","1400","Services","0","10,000 K"
"electron.exe","9000","Console","1","1 K"`;

test('keeps listening sockets on loopback and any-address, from 1024 up', () => {
  const sockets = parseNetstat(NETSTAT);
  assert.deepEqual([...sockets.keys()].sort((a, b) => a - b), [3000, 5040, 5173, 8081, 47821]);
});

test('names each port and hides the system and this desk', () => {
  const ports = listeningPorts(parseNetstat(NETSTAT), parseTasklist(TASKS), new Set([47821]));
  assert.deepEqual(ports, [
    { port: 3000, pid: 7777, process: null },
    { port: 5173, pid: 5555, process: 'vite.exe' },
    { port: 8081, pid: 4242, process: 'node.exe' },
  ]);
});
