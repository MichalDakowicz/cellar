import { phoneVideoPacket, h264Codec, phoneInputPoint } from './deskVideo';
test('phone video uses v4 session/config/key flags and bounded timestamps', () => {
  const session = new Uint8Array(12); const v = new DataView(session.buffer); session[0] = 128; v.setUint32(4, 576); v.setUint32(8, 1280);
  expect(phoneVideoPacket(session)).toEqual({ kind: 'session', width: 576, height: 1280 });
  const packet = new Uint8Array(20); const view = new DataView(packet.buffer); packet[0] = 64; view.setUint32(8, 8); packet.set([0,0,0,1,103,66,128,31], 12);
  expect(phoneVideoPacket(packet).kind).toBe('config'); expect(h264Codec(packet.subarray(12))).toBe('avc1.42801f');
  packet[0] = 32; expect(phoneVideoPacket(packet)).toMatchObject({ kind: 'frame', key: true });
  view.setUint32(8, 10000); expect(() => phoneVideoPacket(packet)).toThrow();
});

test('reduced phone video maps to the entire Android touch surface in either orientation', () => {
  const portrait = { width: 576, height: 1280 }; const device = { width: 1080, height: 2392 };
  expect(phoneInputPoint(575, 1279, portrait, device)).toEqual({ x: 1079, y: 2391 });
  expect(phoneInputPoint(0, 0, portrait, device)).toEqual({ x: 0, y: 0 });
  expect(phoneInputPoint(288, 640, portrait, device)).toEqual({ x: 540, y: 1196 });
  expect(phoneInputPoint(1279, 575, { width: 1280, height: 576 }, device)).toEqual({ x: 2391, y: 1079 });
  expect(() => phoneInputPoint(576, 0, portrait, device)).toThrow();
  expect(() => phoneInputPoint(0, 0, { width: 0, height: 0 }, device)).toThrow();
});
