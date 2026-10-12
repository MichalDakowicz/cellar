import { kindToFront, orderedKinds } from "@/lib/displayPrefs";
import { useAccountPreferences } from "./accountPreferences";

export function DisplaySettings() {
  const { settings, update, theme, setTheme } = useAccountPreferences();
  return (
    <div className="stack">
      <h2 className="overline">display</h2>
      <label className="settings-row">
        kind glyphs in gutter
        <input
          type="checkbox"
          checked={settings.showCodes}
          onChange={(event) => void update({ showCodes: event.target.checked })}
        />
      </label>
      <label>
        row density
        <select
          value={settings.rowDensity}
          onChange={(event) =>
            void update({
              rowDensity: event.target.value as typeof settings.rowDensity,
            })
          }
        >
          {["roomy", "compact"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        text size
        <select
          value={settings.textSize}
          onChange={(event) =>
            void update({
              textSize: event.target.value as typeof settings.textSize,
            })
          }
        >
          {["small", "normal", "large"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        project order
        <select
          value={settings.projectSort}
          onChange={(event) =>
            void update({
              projectSort: event.target.value as typeof settings.projectSort,
            })
          }
        >
          {["newest", "oldest", "manual"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="settings-row">
        fold done and dropped
        <input
          type="checkbox"
          checked={settings.hideSettled}
          onChange={(event) =>
            void update({ hideSettled: event.target.checked })
          }
        />
      </label>
      <label>
        opens on
        <select
          value={settings.startTab}
          onChange={(event) =>
            void update({
              startTab: event.target.value as typeof settings.startTab,
            })
          }
        >
          {["dump", "shelf", "inbox", "stats"].map((value) => (
            <option key={value} value={value}>
              {value === "shelf" ? "projects" : value}
            </option>
          ))}
        </select>
      </label>
      <h2 className="overline">kind order</h2>
      <div className="chips">
        {orderedKinds(settings.kindOrder).map((row) => (
          <button
            key={row.value}
            onClick={() =>
              void update({
                kindOrder: kindToFront(settings.kindOrder, row.value),
              })
            }
          >
            {row.label}
          </button>
        ))}
        <button
          disabled={!settings.kindOrder}
          onClick={() => void update({ kindOrder: null })}
        >
          reset
        </button>
      </div>
      <small className="muted">tap a kind to put it first</small>
      <h2 className="overline">theme</h2>
      <div className="chips">
        {(["dark", "light", "system"] as const).map((value) => (
          <button
            aria-pressed={theme === value}
            className={theme === value ? "selected" : ""}
            key={value}
            onClick={() => void setTheme(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <small className="muted">
        shared with radar, lidar, sonar and pulsar
      </small>
    </div>
  );
}
