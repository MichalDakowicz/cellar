import { create } from 'zustand';

/**
 * Whether the cellar is currently being pushed changes, as one bit the chrome
 * can read.
 *
 * Not persisted and not a preference — it is the state of a socket, and a
 * remembered "live" from last launch would be a claim the app has no grounds
 * for. It sits in a store rather than in the subscribing hook because the hook
 * mounts once at the root and the thing that shows it is the nav bar, which is
 * nowhere near it.
 *
 * `connecting` is its own value so a cold start does not flash "reconnecting"
 * at someone in the half second before the channel joins. Only `down` is ever
 * drawn.
 */
export type LiveStatus = 'connecting' | 'live' | 'down';

type LiveState = {
  status: LiveStatus;
  setStatus: (status: LiveStatus) => void;
};

export const useLiveStatus = create<LiveState>((set) => ({
  status: 'connecting',
  setStatus: (status) => set({ status }),
}));
