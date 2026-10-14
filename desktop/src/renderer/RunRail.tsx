import { Smartphone } from "lucide-react";
import type { DeskRun } from "@/lib/deskProtocol";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { navigate } from "./useRoute";
import { SAMPLE_RAIL } from "@/lib/deskSample";
import { PhoneMirror } from "./PhoneMirror";

export function RunRail({
  run,
  cellar,
  host,
}: {
  run: DeskRun | null;
  cellar: Cellar;
  host: Host;
}) {
  const project = cellar.projects.find((row) => row.id === run?.projectId);
  const sample = run ? SAMPLE_RAIL[run.id] : null;
  return (
    <aside className="run-rail stack">
      <span className="overline">phone</span>
      {sample ? (
        <PhoneMirror width={150} />
      ) : (
        <div className="phone-placeholder stack">
          <Smartphone size={28} />
          <p className="muted">
            a phone on usb shows here, live, once the pc can reach it over adb
          </p>
          <button onClick={() => navigate("/desk/phone")}>phone tools</button>
        </div>
      )}
      <section className="stack">
        <span className="overline">this run</span>
        {project && (
          <button onClick={() => navigate(`/project/${project.id}`)}>
            {project.name}
          </button>
        )}
        <p className="mono muted">
          {run?.branch ?? run?.cwd ?? "no run selected"}
        </p>
        {sample ? (
          <>
            {sample.files.map((file) => (
              <div className="row" key={file.path}>
                <small className="mono">{file.path}</small>
                <small className="added mono">+{file.added}</small>
                <small className="removed mono">−{file.removed}</small>
              </div>
            ))}
            <small className="muted">
              {sample.checkpoints} checkpoints · sample
            </small>
          </>
        ) : (
          run && <small className="muted">Usage and checkpoints are in the run tools panel.</small>
        )}
      </section>
      <button
        disabled={!host.can.pages}
        onClick={() => navigate("/desk/previews")}
      >
        open preview
      </button>
    </aside>
  );
}
