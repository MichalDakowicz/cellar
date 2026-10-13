import { useState } from "react";
import { SAMPLE_RECIPES, SAMPLE_RULES } from "@/lib/deskSample";
import { KINDS } from "@/lib/kinds";
import { defaultRecipe } from "@/lib/deskSettings";
import { saved } from "./preferences";
import type { DeskMode } from "@/lib/deskTask";

export function RecipeSettings({ sample }: { sample: boolean }) {
  const [kind, setKind] = useState("glitch");
  const recipe = sample
    ? SAMPLE_RECIPES[kind]
    : defaultRecipe(
        saved("cellar-desk-prefs", "defaultAgent", "claude"),
        saved<DeskMode>("cellar-desk-prefs", "defaultMode", "edits"),
      );
  return (
    <div className="stack">
      <p className="muted">
        {sample
          ? "sample recipes and rules"
          : "Custom recipes and managed rules unavailable. New tasks use your defaults."}
      </p>
      <div className="two-columns">
        <div className="stack">
          {KINDS.map((row) => (
            <button
              className={`settings-row ${row.value === kind ? "selected" : ""}`}
              onClick={() => setKind(row.value)}
              key={row.value}
            >
              {row.label}
              <small className="muted">
                {(sample ? SAMPLE_RECIPES[row.value] : recipe).agent} ·{" "}
                {(sample ? SAMPLE_RECIPES[row.value] : recipe).mode}
              </small>
            </button>
          ))}
        </div>
        <section className="card stack">
          <h2>{kind}</h2>
          <label>
            agent
            <input readOnly value={recipe.agent} />
          </label>
          <label>
            mode
            <input readOnly value={recipe.mode} />
          </label>
          <label>
            skills
            <input
              readOnly
              value={recipe.skills.join(" · ") || recipe.skillsNote}
            />
          </label>
          <label>
            prompt
            <textarea readOnly value={recipe.prompt} />
          </label>
          <label>
            after
            <input
              readOnly
              value={recipe.after.join(" · ") || recipe.afterNote}
            />
          </label>
          <label>
            then
            <input readOnly value={recipe.then} />
          </label>
        </section>
      </div>
      <h2 className="overline">rules</h2>
      {sample ? (
        SAMPLE_RULES.map((rule) => (
          <div className="settings-row" key={rule.text}>
            <span>{rule.text}</span>
            <small className="muted">{rule.scope} · sample</small>
          </div>
        ))
      ) : (
        <p className="muted">No managed rules yet.</p>
      )}
    </div>
  );
}
