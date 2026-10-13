import { Monitor } from "lucide-react";
import { SAMPLE_FIGURES } from "@/lib/deskSample";
import type { Host } from "./useHost";
import { navigate } from "./useRoute";

export function DeviceCard({ host }: { host: Host }) {
  const sample = host.info?.id === "sample-pc";
  return (
    <section className="stack">
      <h2 className="overline">devices</h2>
      <div className="card stack">
        <div className="row">
          <span className="run-agent">
            <Monitor size={24} />
          </span>
          <div>
            <h3>{host.info?.name ?? "this pc"}</h3>
            <p className="muted">
              {sample
                ? "● on this network · sample desk"
                : host.live
                  ? "● local host · synchronized"
                  : "connecting"}
            </p>
          </div>
        </div>
        {sample ? (
          <div className="device-figures">
            {SAMPLE_FIGURES.map((row) => (
              <div className="stack" key={row.label}>
                <span className="overline">{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <>
            <small className="muted">
              {host.info?.agents
                .filter((agent) => agent.installed)
                .map((agent) => agent.id)
                .join(" · ") || "agent availability unavailable"}
            </small>
            <button onClick={() => navigate("/settings/devices")}>
              phones and pairing
            </button>
          </>
        )}
      </div>
    </section>
  );
}
