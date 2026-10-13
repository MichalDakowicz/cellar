import { PING_RULES } from "@/lib/deskSettings";
import { PingPreferences } from './PingPreferences';
import { useAccountPreferences } from "./accountPreferences";
import { navigate } from "./useRoute";
export function NotificationsSettings() {
  const prefs = useAccountPreferences();
  return (
    <>
      <button onClick={() => navigate("/desk/notify")}>
        notification previews
      </button>
      <label className="settings-row">
        agent questions
        <input
          type="checkbox"
          checked={prefs.settings.notifyQuestions}
          onChange={(event) =>
            void prefs.update({ notifyQuestions: event.target.checked })
          }
        />
      </label>
      <label className="settings-row">
        nudges
        <input
          type="checkbox"
          checked={prefs.settings.notifyNudges}
          onChange={(event) =>
            void prefs.update({ notifyNudges: event.target.checked })
          }
        />
      </label>
      <label>
        untouched for days
        <input
          type="number"
          min={1}
          max={90}
          value={prefs.settings.nudgeDays}
          onChange={(event) =>
            void prefs.update({ nudgeDays: Number(event.target.value) })
          }
        />
      </label>
      <label>
        nudges per day
        <input
          type="number"
          min={1}
          max={5}
          value={prefs.settings.nudgesPerDay}
          onChange={(event) =>
            void prefs.update({
              nudgesPerDay: Number(event.target.value),
            })
          }
        />
      </label>
      <PingPreferences />
      {PING_RULES.map((row) => (
        <div className="settings-row" key={row.when}>
          {row.when}
          <small className="muted">{row.where}</small>
        </div>
      ))}
    </>
  );
}
