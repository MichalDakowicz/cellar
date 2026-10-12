import { waitingOnYou } from "@/lib/agentWork";
import { pendingQuestions } from "@/lib/entryQuestions";
import { approvalNote, questionNote, runNote } from "@/lib/deskNotify";
import { SAMPLE_CHATS, SAMPLE_NOTES, SAMPLE_QUESTION } from "@/lib/deskSample";
import type { Host } from "./useHost";
import type { Cellar } from "./useCellar";
import { useRunCards } from "./useRunCards";
import { saved, useSaved } from "./preferences";
import { navigate } from "./useRoute";

export function Notifications({
  host,
  cellar,
}: {
  host: Host;
  cellar: Cellar;
}) {
  useSaved();
  const cards = useRunCards(
    host.live ? host.state.runs : [],
    cellar,
    "all",
    "",
  );
  const live = cards.sections.running.map((run) =>
    runNote({
      id: run.id,
      title: run.title,
      host: host.info?.name ?? "this pc",
      doing: run.detail,
      plan: null,
      stoppable: run.stoppable,
    }),
  );
  const questions = waitingOnYou(cellar.entries).flatMap((entry) =>
    pendingQuestions(entry.questions)
      .slice(0, 1)
      .map((question) => ({
        entryId: entry.id,
        note: questionNote({
          id: question.id,
          agent: question.agent,
          where:
            cellar.projects.find((project) => project.id === entry.projectId)
              ?.name ?? "inbox",
          question: question.question,
          options: question.options,
        }),
      })),
  );
  const approval = SAMPLE_CHATS["sample-1"].approval!;
  const extra = saved("cellar-desk-prefs", "sample", false)
    ? [
        approvalNote({
          id: "sample-1",
          agent: "codex",
          what: approval.what,
          subject: approval.subject,
          where: approval.effect,
        }),
        questionNote(SAMPLE_QUESTION),
        ...SAMPLE_NOTES,
      ]
    : [];
  const notes = [...live, ...questions.map((row) => row.note), ...extra];
  return (
    <section className="page stack">
      <header className="row">
        <h1>notification previews</h1>
        <button onClick={() => navigate("/settings/notifications")}>
          close
        </button>
      </header>
      <p className="muted">
        In-app presenters. System notification actions unavailable.
      </p>
      {!notes.length && (
        <p className="empty">nothing going on or waiting on you</p>
      )}
      {notes.map((note) => (
        <article className="card stack" key={note.id}>
          <small className="muted">
            {note.head}
            {note.id.includes("sample") ? " · sample" : ""}
          </small>
          <h3>{note.title}</h3>
          {note.body.map((line, index) => (
            <p className={note.mono && index === 0 ? "mono" : ""} key={index}>
              {line}
            </p>
          ))}
          {note.progress !== null && <progress max={1} value={note.progress} />}
          <div className="chips">
            {note.actions.map((action) => (
              <button
                key={action.id}
                disabled={note.id.includes("sample")}
                onClick={() => {
                  const entry = questions.find(
                    (row) => row.note.id === note.id,
                  );
                  if (entry) navigate("/entry/" + entry.entryId);
                  else if (note.id.startsWith("run:"))
                    navigate("/desk/run/" + note.id.slice(4));
                }}
              >
                {action.label} · open in app
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
