import { useEffect, useState } from "react";
import { calls } from "./client";
import { navigate } from "./useRoute";
import { useHostQuery } from "./useHostQuery";
import type { Host } from "./useHost";

export function Previews({ host, port }: { host: Host; port?: string }) {
  const result = useHostQuery(
    host.live && host.can.pages,
    calls.ports,
    host.key,
  );
  const builds = useHostQuery(
    host.live && host.can.downloads,
    calls.apks,
    host.key,
    30_000,
  );
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState("desktop");
  const [screenUrl, setScreenUrl] = useState<string | null>(null);
  const listed = !!result.data?.some((row) => String(row.port) === port);
  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(null);
    if (port && host.live && host.can.pages && listed) {
      void calls
        .ticket({ kind: "view", port: Number(port) })
        .then((ticket) => {
          if (active) setUrl(ticket);
        })
        .catch((error) => {
          if (active) setError(String(error));
        });
    }
    return () => {
      active = false;
    };
  }, [port, host.live, host.can.pages, listed]);
  return (
    <div className="page stack">
      <h1>{port ? `localhost:${port}` : "previews"}</h1>
      <p className="muted">what this pc is serving</p>
      {result.error && <p role="status">{result.error}</p>}
      {!host.live && <p className="muted">reconnect to host</p>}
      {!port && (
        <>
          {result.data?.map((row) => (
            <button
              className="run-row row"
              key={row.port}
              onClick={() => navigate(`/desk/preview/${row.port}`)}
            >
              <strong className="mono">localhost:{row.port}</strong>
              <span className="muted">
                {row.process ?? `process ${row.pid}`}
              </span>
              <span>preview →</span>
            </button>
          ))}
          {result.data?.length === 0 && (
            <p className="empty muted">nothing listening on this pc</p>
          )}
        </>
      )}
      {port && (
        <>
          <div className="chips">
            {["phone", "tablet", "desktop"].map((value) => (
              <button
                key={value}
                className={size === value ? "selected" : ""}
                onClick={() => setSize(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {url && (
            <div className="preview-stage">
              <iframe
                title={`preview localhost:${port}`}
                src={url}
                style={{
                  width:
                    size === "phone" ? 390 : size === "tablet" ? 768 : "100%",
                }}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              />
            </div>
          )}
          {!url && <p>{error ?? "preview unavailable or connecting…"}</p>}
          <p className="muted">
            Managed checks and deploy unavailable until W12.
          </p>
        </>
      )}
      {!port && (
        <>
          <h2 className="overline">screen · view only</h2>
          <button
            disabled={!host.live || !host.can.screen}
            onClick={() =>
              void calls
                .ticket({ kind: "screen" })
                .then(setScreenUrl)
                .catch((error) => setError(String(error)))
            }
          >
            view screen
          </button>
          {screenUrl && (
            <iframe
              className="screen-frame"
              title="PC screen view only"
              src={screenUrl}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
          <h2 className="overline">builds</h2>
          {builds.error && <p role="status">{builds.error}</p>}
          {builds.data?.map((apk) => (
            <button
              className="run-row row"
              key={apk.app}
              onClick={() =>
                void calls
                  .ticket({ kind: "apk", app: apk.app })
                  .then((url) =>
                    window.open(url, "_blank", "noopener,noreferrer"),
                  )
                  .catch((error) => setError(String(error)))
              }
            >
              <span>
                {apk.app} · {apk.version}
              </span>
              <small className="mono">{apk.file}</small>
              <span>download</span>
            </button>
          ))}
        </>
      )}
      {error && !port && <p role="status">{error}</p>}
    </div>
  );
}
