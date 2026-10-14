/** Dedicated hidden renderer: capture/encode once, with no account or host bridge. */
type Offer = { type: 'offer'; sdp: string };
const peers = new Map<string, RTCPeerConnection>();
const streams = new Map<string, MediaStream>();
const pending = new Map<string, Promise<MediaStream>>();
const displays = new Map<string, string>();
async function capture(display: string) {
  if (streams.get(display)?.active) return streams.get(display)!;
  if (pending.has(display)) return pending.get(display)!;
  const request = (async () => {
    const source = await (window as unknown as { cellarCapture: { source: (display: string) => Promise<string> } }).cellarCapture.source(display);
    const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source, maxWidth: 1280, maxHeight: 720, maxFrameRate: 30 } } as MediaTrackConstraints });
    for (const track of media.getVideoTracks()) track.contentHint = 'motion';
    streams.set(display, media); return media;
  })().finally(() => pending.delete(display));
  pending.set(display, request); return request;
}
function release(id: string) {
  const peer = peers.get(id); peers.delete(id); displays.delete(id); peer?.close();
  for (const [display, stream] of streams) if (![...displays.values()].includes(display)) { stream.getTracks().forEach((track) => track.stop()); streams.delete(display); }
}
(window as unknown as { cellarVideo: unknown }).cellarVideo = {
  release,
  async answer(id: string, offer: Offer, display = '') {
    release(id); displays.set(id, display);
    const stream = await capture(display);
    const peer = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle' }); peers.set(id, peer);
    for (const track of stream.getVideoTracks()) {
      const sender = peer.addTrack(track, stream); const parameters = sender.getParameters();
      parameters.encodings = [{ maxBitrate: 3_000_000, maxFramerate: 30 }]; parameters.degradationPreference = 'maintain-framerate';
      await sender.setParameters(parameters);
    }
    peer.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(peer.connectionState) && peers.get(id) === peer) release(id); };
    await peer.setRemoteDescription(offer); await peer.setLocalDescription(await peer.createAnswer());
    if (peer.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { release(id); reject(new Error('PC video ICE gathering timed out.')); }, 5000);
      peer.addEventListener('icegatheringstatechange', () => { if (peer.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); } });
    });
    return { type: 'answer', sdp: peer.localDescription!.sdp };
  },
};
