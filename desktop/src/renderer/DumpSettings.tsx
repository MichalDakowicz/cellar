import { KINDS } from "@/lib/kinds";
import { saved, save, useSaved } from "./preferences";
import { useAccountPreferences } from "./accountPreferences";

export function DumpSettings() {
  useSaved();
  const { settings, update } = useAccountPreferences();
  return (
    <div className="stack">
      <h2 className="overline">capture</h2>
      <label className="settings-row">
        raw by default
        <input
          type="checkbox"
          checked={settings.rawDefault}
          onChange={(event) => {
            save("cellar-prefs", "raw", event.target.checked);
            void update({ rawDefault: event.target.checked });
          }}
        />
      </label>
      <label className="settings-row">
        remember last project
        <input
          type="checkbox"
          checked={settings.rememberLast}
          onChange={(event) =>
            void update({ rememberLast: event.target.checked })
          }
        />
      </label>
      <h2 className="overline">default kind</h2>
      <div className="chips">
        {KINDS.map((row) => (
          <button
            key={row.value}
            aria-pressed={settings.defaultKind === row.value}
            className={settings.defaultKind === row.value ? "selected" : ""}
            onClick={() => {
              save("cellar-prefs", "draftKind", row.value);
              void update({ defaultKind: row.value });
            }}
          >
            {row.label}
          </button>
        ))}
      </div>
      <h2 className="overline">how a project opens</h2>
      <div className="chips">
        {(["grouped", "stream", "kanban"] as const).map((view) => (
          <button
            key={view}
            className={settings.defaultView === view ? "selected" : ""}
            onClick={() => {
              save("cellar-prefs", "view", view);
              void update({ defaultView: view });
            }}
          >
            {view === "grouped"
              ? "by kind"
              : view === "stream"
                ? "one stream"
                : "board"}
          </button>
        ))}
      </div>
      <small className="muted">
        current capture:{" "}
        {saved("cellar-prefs", "raw", settings.rawDefault)
          ? "one thought per line"
          : "one thought and notes"}
      </small>
    </div>
  );
}
