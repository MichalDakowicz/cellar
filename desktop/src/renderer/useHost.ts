import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DeskInfo } from "@/lib/deskProtocol";
import { DeskStream } from "@/lib/deskStream";
import { EMPTY_STREAM, type EventSnapshot } from "@/lib/deskEvents";
import { appCapabilities } from "@/lib/deskAppRole";
import { desktopStreamKey } from "@/lib/deskStorage";
import { calls, APP_ROLE } from "./client";
import { save, saved } from "./preferences";

const empty = () => EMPTY_STREAM;
const noop = () => () => {};
export function useHost(ownerId: string, runId: string | null) {
  const [info, setInfo] = useState<DeskInfo | null>(null);
  const [knownId, setKnownId] = useState(
    () =>
      saved<Record<string, string>>("desktop-host-identities", "ids", {})[
        ownerId
      ],
  );
  const [reachable, setReachable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => {
      void calls
        .info()
        .then((value) => {
          if (active) {
            setInfo(value);
            setKnownId(value.id);
            setReachable(true);
            setError(null);
            const ids = saved<Record<string, string>>(
              "desktop-host-identities",
              "ids",
              {},
            );
            if (ids[ownerId] !== value.id)
              save("desktop-host-identities", "ids", {
                ...ids,
                [ownerId]: value.id,
              });
          }
        })
        .catch((error: Error) => {
          if (active) {
            setReachable(false);
            setError(error.message);
          }
        });
    };
    load();
    const timer = setInterval(load, 20_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ownerId]);
  const key = `${ownerId}:${knownId}`;
  const historyKey = desktopStreamKey(ownerId, knownId ?? "");
  const stream = useMemo(
    () =>
      info?.eventProtocol === 1
        ? new DeskStream(
            calls.eventTicket,
            saved<Record<string, { epoch: string; sequence: number }>>(
              "cellar-desk-history",
              "cursors",
              {},
            )[historyKey] ?? { epoch: "", sequence: 0 },
            (state) => {
              save("cellar-desk-history", "cursors", {
                ...saved("cellar-desk-history", "cursors", {}),
                [historyKey]: { epoch: state.epoch, sequence: state.sequence },
              });
              if (state.runId) {
                const all = {
                  ...saved<Record<string, EventSnapshot>>(
                    "cellar-desk-history",
                    "snapshots",
                    {},
                  ),
                  [`${historyKey}:${state.runId}`]: state,
                };
                save(
                  "cellar-desk-history",
                  "snapshots",
                  Object.fromEntries(
                    Object.entries(all)
                      .sort(([, a], [, b]) => b.at - a.at)
                      .slice(0, 12),
                  ),
                );
              }
            },
          )
        : null,
    [historyKey, info?.eventProtocol],
  );
  const state = useSyncExternalStore(
    stream?.subscribe ?? noop,
    stream?.snapshot ?? empty,
  );
  // Catalogue keeps the socket alive while the selected-run subscription changes.
  useEffect(() => stream?.acquire({}, null), [stream]);
  useEffect(() => stream?.acquire({}, runId), [stream, runId]);
  const live = reachable && !!info && state.phase === "live";
  return {
    info,
    state,
    live,
    key,
    historyKey,
    error: error ?? state.error,
    can: appCapabilities(APP_ROLE, info ? "bridge" : "none", info),
    reconnect: () => stream?.reconnect(),
  };
}
export type Host = ReturnType<typeof useHost>;
