export type PhoneVideoPacket = { kind: 'session'; width: number; height: number } | { kind: 'config'; data: Uint8Array } | { kind: 'frame'; key: boolean; timestamp: number; data: Uint8Array };
/** ADB input uses the device's current full display, not its reduced encoder size. */
export function phoneInputPoint(x: number, y: number, frame: { width: number; height: number }, device: { width: number; height: number }) {
  for (const size of [frame, device]) if (!size || ![size.width, size.height].every((n) => Number.isInteger(n) && n >= 2 && n <= 16000)) throw new Error('Invalid phone display dimensions.');
  if (![x, y].every(Number.isInteger) || x < 0 || y < 0 || x >= frame.width || y >= frame.height) throw new Error('Phone point is outside the video frame.');
  const target = (frame.width > frame.height) === (device.width > device.height) ? device : { width: device.height, height: device.width };
  return { x: Math.round(x / (frame.width - 1) * (target.width - 1)), y: Math.round(y / (frame.height - 1) * (target.height - 1)) };
}
export function phoneVideoPacket(bytes: Uint8Array): PhoneVideoPacket {
  if (bytes.byteLength < 12) throw new Error('Incomplete phone video packet.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] & 128) { const width = view.getUint32(4); const height = view.getUint32(8); if (!width || !height || width * height > 16_000_000) throw new Error('Invalid phone video dimensions.'); return { kind: 'session', width, height }; }
  if (view.getUint32(8) !== bytes.byteLength - 12 || bytes.byteLength > 2 * 1024 * 1024) throw new Error('Invalid phone video frame size.');
  const data = bytes.subarray(12);
  if (bytes[0] & 64) return { kind: 'config', data };
  return { kind: 'frame', key: !!(bytes[0] & 32), timestamp: Number(view.getBigUint64(0) & ((1n << 61n) - 1n)), data };
}
/** H.264 profile from the SPS; Annex B stays Annex B when fed to WebCodecs. */
export function h264Codec(data: Uint8Array): string {
  for (let i = 0; i + 7 < data.length; i++) {
    const offset = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1 ? i + 3 : data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1 ? i + 4 : -1;
    if (offset >= 0 && (data[offset] & 31) === 7) return 'avc1.' + [...data.subarray(offset + 1, offset + 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Phone encoder did not provide H.264 configuration.');
}
