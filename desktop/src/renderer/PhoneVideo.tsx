import { useEffect, useRef, useState, type PointerEventHandler } from 'react';
import { h264Codec, phoneVideoPacket } from '@/lib/deskVideo';
import { calls } from './client';

export function PhoneVideo({ serial, paused, onSize, onTaps, onPointerDown, onPointerUp }: { serial: string; paused: boolean; onSize: (size: { width: number; height: number }) => void; onTaps: (taps: { x: number; y: number; at: number }[]) => void; onPointerDown: PointerEventHandler<HTMLCanvasElement>; onPointerUp: PointerEventHandler<HTMLCanvasElement> }) {
  const canvas = useRef<HTMLCanvasElement>(null); const callbacks = useRef({ onSize, onTaps });
  callbacks.current = { onSize, onTaps };
  const [status, setStatus] = useState('connecting phone video…'); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; let socket: WebSocket | null = null; let decoder: VideoDecoder | null = null; let config = new Uint8Array(); let needKey = true; let shown = 0;
    setStatus(paused ? 'mirror paused' : 'connecting phone video…');
    if (paused) return;
    const close = () => { socket?.close(); if (decoder && decoder.state !== 'closed') decoder.close(); decoder = null; };
    const fail = (error: unknown) => { if (active) setStatus(String(error)); close(); };
    void (async () => {
      if (!('VideoDecoder' in window)) throw new Error('This desktop runtime cannot decode phone video. Update Cellar.');
      const url = await calls.phoneVideoTicket(serial); if (!active) return;
      socket = new WebSocket(url); socket.binaryType = 'arraybuffer';
      socket.onmessage = (event) => {
        if (!active) return;
        try {
          if (typeof event.data === 'string') { const message = JSON.parse(event.data); if (message.error) throw new Error(message.error); if (message.taps) callbacks.current.onTaps(message.taps); return; }
          const packet = phoneVideoPacket(new Uint8Array(event.data));
          if (packet.kind === 'session') { callbacks.current.onSize(packet); if (decoder && decoder.state !== 'closed') decoder.close(); decoder = null; needKey = true; return; }
          if (packet.kind === 'config') {
            config = new Uint8Array(packet.data); needKey = true;
            if (decoder && decoder.state !== 'closed') decoder.close();
            decoder = new VideoDecoder({ output: (frame) => {
              try { const surface = canvas.current; if (active && surface) { if (surface.width !== frame.displayWidth || surface.height !== frame.displayHeight) { surface.width = frame.displayWidth; surface.height = frame.displayHeight; callbacks.current.onSize({ width: frame.displayWidth, height: frame.displayHeight }); } surface.getContext('2d', { alpha: false })?.drawImage(frame, 0, 0); if (!shown++) setStatus(''); } } finally { frame.close(); }
            }, error: fail });
            decoder.configure({ codec: h264Codec(config), optimizeForLatency: true, hardwareAcceleration: 'prefer-hardware' }); return;
          }
          if (!decoder || decoder.state !== 'configured') return;
          if (decoder.decodeQueueSize > 2) { decoder.reset(); decoder.configure({ codec: h264Codec(config), optimizeForLatency: true, hardwareAcceleration: 'prefer-hardware' }); needKey = true; }
          if (needKey && !packet.key) return;
          const data = packet.key ? new Uint8Array(config.length + packet.data.length) : packet.data;
          if (packet.key) { data.set(config); data.set(packet.data, config.length); needKey = false; }
          decoder.decode(new EncodedVideoChunk({ type: packet.key ? 'key' : 'delta', timestamp: packet.timestamp, data }));
        } catch (e) { fail(e); }
      };
      socket.onerror = () => fail('Phone video disconnected. Reconnect the mirror.');
      socket.onclose = () => { if (active) setStatus('Phone video ended. Reconnect the mirror.'); };
    })().catch(fail);
    return () => { active = false; close(); };
  }, [serial, paused, revision]);
  return <div className="stack"><canvas ref={canvas} aria-label="live attached phone" style={{ display: paused ? 'none' : 'block', width: '100%', touchAction: 'none' }} onPointerDown={onPointerDown} onPointerUp={onPointerUp} />{status && <p role="status">{status}</p>}{!paused && status && <button onClick={() => setRevision((v) => v + 1)}>reconnect mirror</button>}</div>;
}
