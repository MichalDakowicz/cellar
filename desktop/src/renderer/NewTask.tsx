import { DESK_MODES } from "@/lib/deskTask";
import { save } from "./preferences";
import { navigate } from "./useRoute";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { EntryList } from "./EntryList";
import { useNewTask } from "./useNewTask";
import { useKeys } from './useKeys';
import { KeyResults } from './KeyResults';
import { ComposerColors } from './ComposerColors';
import { useDictation } from './useDictation';
import { insertVoice } from '@/lib/deskVoice';

export function NewTask({ cellar, host }: { cellar: Cellar; host: Host }) {
  const {
    text,
    projectId,
    folders,
    folder,
    agent,
    mode,
    where,
    entryIds,
    attached,
    split,
    jobBusy,
    jobError,
    task,
    invalid,
    start,
  } = useNewTask(cellar, host);
  const write = (value: string) => save('desktop-new-task', 'text', value);
  const keys = useKeys(text, write, host, cellar, projectId, agent);
  const voice = useDictation((speech) => { if (!task.pending && !task.busy) write(insertVoice(text, speech, keys.field.current ? { start: keys.field.current.selectionStart, end: keys.field.current.selectionEnd } : undefined)); });
  return (
    <section className="page task-page stack">
      <header className="row">
        <div>
          <h1>new task</h1>
          <p className="muted">send to {host.info?.name ?? "this pc"}</p>
        </div>
        <button onClick={() => navigate("/desk")}>close</button>
      </header>
      <textarea
        ref={keys.field}
        className="task-input"
        aria-label="task prompt"
        placeholder="what should it do?"
        value={text}
        readOnly={task.pending || task.busy}
        onChange={(event) => keys.edit(event.target.value)}
        onSelect={(event) => keys.select(event.currentTarget.selectionEnd)}
        onKeyDown={(event) => { if (!event.nativeEvent.isComposing && keys.keyboard(event.key)) event.preventDefault(); }}
      />
      <KeyResults list={keys.list} />
      <button disabled={task.pending || task.busy} onClick={() => void voice.toggle()}>{voice.listening ? 'stop dictation' : 'dictate task'}</button>
      {voice.error && <p role="status">{voice.error}</p>}
      <ComposerColors text={text} write={write} />
      <div className="chips">
        {folders.map((row) => (
          <button
            key={row.projectId}
            disabled={task.pending}
            className={projectId === row.projectId ? "selected" : ""}
            onClick={() => save("desktop-new-task", "projectId", row.projectId)}
          >
            {row.name}
          </button>
        ))}
      </div>
      <span className="overline">where it works</span>
      <div className="chips">
        {(["worktree", "main"] as const).map((value) => (
          <button
            disabled={task.pending}
            className={where === value ? "selected" : ""}
            key={value}
            onClick={() => save("desktop-new-task", "where", value)}
          >
            {value === "worktree" ? "new worktree" : "main checkout"}
          </button>
        ))}
      </div>
      <small className="mono muted">
        {folder?.path ?? "link project folder first"}
      </small>
      <span className="overline">agent</span>
      <div className="chips">
        {host.info?.agents
          .filter((row) => row.installed)
          .map((row) => (
            <button
              disabled={task.pending}
              className={agent === row.id ? "selected" : ""}
              key={row.id}
              onClick={() => save("desktop-new-task", "agent", row.id)}
            >
              {row.id}
            </button>
          ))}
      </div>
      <span className="overline">permissions</span>
      <div className="chips">
        {DESK_MODES.map((row) => (
          <button
            disabled={task.pending}
            key={row.id}
            className={mode === row.id ? "selected" : ""}
            onClick={() => save("desktop-new-task", "mode", row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>
      <p className="muted">
        {mode === "full"
          ? "Full access to PC for this run in selected workspace."
          : mode === "ask"
            ? "Agent must request approval for protected actions."
            : "Edits permitted; protected actions require host approval."}
      </p>
      {!!attached.length && (
        <section className="stack">
          <h2 className="overline">attached thoughts</h2>
          <EntryList
            entries={attached}
            selected={entryIds}
            onSelect={
              task.pending
                ? undefined
                : (id) =>
                    save(
                      "desktop-new-task",
                      "entryIds",
                      entryIds.filter((one) => one !== id),
                    )
            }
          />
          {attached.length > 1 && (
            <div className="chips">
              {(["one", "each"] as const).map((value) => (
                <button
                  disabled={task.pending}
                  className={split === value ? "selected" : ""}
                  key={value}
                  onClick={() => save("desktop-new-task", "split", value)}
                >
                  {value === "one" ? "one run together" : "one run each"}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <details>
        <summary>from your cellar</summary>
        <EntryList
          entries={cellar.entries.filter(
            (entry) => entry.projectId === projectId && !entry.archived,
          )}
          selected={entryIds}
          onSelect={
            task.pending
              ? undefined
              : (id) =>
                  save(
                    "desktop-new-task",
                    "entryIds",
                    entryIds.includes(id)
                      ? entryIds.filter((one) => one !== id)
                      : [...entryIds, id],
                  )
          }
        />
      </details>
      {task.pending && (
        <p className="muted">
          {task.failed
            ? "PC confirmed task did not start. Retry saved choices or edit remaining tasks."
            : "Saved task awaiting confirmation. Recover original choices before starting another."}
        </p>
      )}
      {(task.error || jobError) && (
        <p role="status">{task.error ?? jobError}</p>
      )}
      {task.untrusted && (
        <button disabled={task.busy} onClick={() => void task.trust()}>
          trust {task.untrusted} and retry
        </button>
      )}
      {task.failed && (
        <button disabled={task.busy} onClick={task.editFailed}>
          edit unstarted remainder
        </button>
      )}
      <button
        className="primary"
        disabled={
          jobBusy || task.busy || !host.live || (!task.pending && !!invalid)
        }
        onClick={() => void start()}
      >
        {task.busy
          ? "awaiting PC…"
          : task.pending
            ? "recover saved tasks"
            : `send to ${host.info?.name ?? "this pc"}`}
      </button>
      {invalid && !task.pending && <small className="muted">{invalid}</small>}
      <small className="muted">
        Voice and uploads unavailable. Each task creates one run.
      </small>
    </section>
  );
}
