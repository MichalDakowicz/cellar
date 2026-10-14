import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScrcpyPackets } from './scrcpy.ts';
test('scrcpy parser handles split headers, rotation, packets and corrupt sizes without buffering unbounded frames', () => {
  const packets: Buffer[] = []; const parser = new ScrcpyPackets((p) => packets.push(p));
  const session = Buffer.alloc(12); session[0] = 128; session.writeUInt32BE(576, 4); session.writeUInt32BE(1280, 8);
  const config = Buffer.alloc(16); config[0] = 64; config.writeUInt32BE(4, 8); config.set([0,0,1,7], 12);
  const all = Buffer.concat([Buffer.from('h264'), session, config]);
  for (let i = 0; i < all.length; i += 3) parser.push(all.subarray(i, i + 3));
  assert.equal(packets.length, 2); assert.deepEqual(packets[0], session); assert.deepEqual(packets[1], config);
  const bad = Buffer.alloc(12); bad.writeUInt32BE(5_000_000, 8); assert.throws(() => parser.push(bad), /large/);
});
