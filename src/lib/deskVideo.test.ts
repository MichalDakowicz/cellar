import { phoneVideoPacket, h264Codec } from './deskVideo';
test('phone video uses v4 session/config/key flags and bounded timestamps', () => {
  const session = new Uint8Array(12); const v = new DataView(session.buffer); session[0] = 128; v.setUint32(4, 576); v.setUint32(8, 1280);
  expect(phoneVideoPacket(session)).toEqual({ kind: 'session', width: 576, height: 1280 });
  const packet = new Uint8Array(20); const view = new DataView(packet.buffer); packet[0] = 64; view.setUint32(8, 8); packet.set([0,0,0,1,103,66,128,31], 12);
  expect(phoneVideoPacket(packet).kind).toBe('config'); expect(h264Codec(packet.subarray(12))).toBe('avc1.42801f');
  packet[0] = 32; expect(phoneVideoPacket(packet)).toMatchObject({ kind: 'frame', key: true });
  view.setUint32(8, 10000); expect(() => phoneVideoPacket(packet)).toThrow();
});
