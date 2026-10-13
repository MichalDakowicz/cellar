import { useState } from "react";
import { countLive } from "@/lib/entryGroups";
import { countToday } from "@/lib/relTime";
import app from "../../../app.json";
import { DisplaySettings } from "./DisplaySettings";
import type { Cellar } from "./useCellar";
import { supabase } from "./auth";
import { VISUAL_PREVIEW } from "./appMode";

export function AccountSettings({
  email,
  cellar,
}: {
  email: string;
  cellar: Cellar;
}) {
  const [signOut, setSignOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const figures = [
    ["entries", cellar.entries.length],
    ["open", countLive(cellar.entries)],
    ["projects", cellar.projects.length],
    ["shelves", cellar.shelves.length],
  ];
  async function leave(scope: "local" | "global") {
    if (busy || VISUAL_PREVIEW) return;
    setBusy(true);
    try {
      const result = await supabase.auth.signOut({ scope });
      if (result.error) throw result.error;
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <h2>{email}</h2>
      <p className="muted">
        one ping account · radar · lidar · sonar · pulsar · cellar
      </p>
      <div className="figures">
        {figures.map(([label, value]) => (
          <div key={label}>
            <span className="overline">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        {countToday(cellar.entries.map((entry) => entry.createdAt))} thoughts in
        the last day. Archived thoughts stay searchable and can be restored.
      </p>
      <DisplaySettings />
      <h2 className="overline">about</h2>
      <p>cellar {app.expo.version}</p>
      <a
        href="https://github.com/MichalDakowicz/cellar/releases/latest"
        target="_blank"
        rel="noreferrer"
      >
        check published releases
      </a>
      <p className="muted">
        Your cellar is private. Signing out can leave this Cellar window or
        every Ping app.
      </p>
      <button disabled={VISUAL_PREVIEW} onClick={() => setSignOut(true)}>
        sign out
      </button>
      {signOut && (
        <section className="card stack">
          <h3>where do you want to sign out?</h3>
          <button disabled={busy} onClick={() => void leave("local")}>
            cellar here
          </button>
          <button disabled={busy} onClick={() => void leave("global")}>
            every ping app, everywhere
          </button>
          <button onClick={() => setSignOut(false)}>cancel</button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
