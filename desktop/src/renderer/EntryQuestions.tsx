import { useEffect, useState } from "react";
import { questionStatus, unblocksEntry } from "@/lib/entryQuestions";
import { questionAnswer } from "@/lib/questionAnswer";
import {
  normalizeQuestion,
  QUESTION_COLUMNS,
  type QuestionRow,
} from "@/lib/rows";
import type { Entry } from "@/types/cellar";
import { supabase } from "./auth";
import { dismissQuestion } from "./data/cellarApi";

export function EntryQuestions({
  entry,
  refresh,
}: {
  entry: Entry;
  refresh: () => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [several, setSeveral] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const pending = entry.questions.filter(
    (question) => questionStatus(question) === "unanswered",
  );
  const question = pending[0];
  useEffect(() => {
    setPicked([]);
    setNote("");
    setSeveral(false);
  }, [question?.id]);
  async function dismiss() {
    if (!question || busy) return;
    setBusy(true);
    try {
      await dismissQuestion(question.id);
      if (
        entry.state === "blocked" &&
        unblocksEntry(entry.questions, question.id)
      ) {
        const result = await supabase
          .from("cellar_entries")
          .update({ state: "open" })
          .eq("id", entry.id)
          .eq("state", "blocked");
        if (result.error) throw result.error;
      }
      await refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function answer(decide = false) {
    if (!question || busy) return;
    setBusy(true);
    try {
      const result = await supabase
        .from("cellar_entry_questions")
        .update({
          ...questionAnswer(
            decide
              ? {
                  picks: [],
                  note: "your call — go with what you think is best",
                }
              : { picks: picked, note },
            question.options,
          ),
          answered_at: new Date().toISOString(),
          answered_via: "app",
        })
        .eq("id", question.id)
        .select(QUESTION_COLUMNS)
        .single();
      if (result.error) throw result.error;
      const next = normalizeQuestion(result.data as QuestionRow);
      if (
        unblocksEntry(entry.questions, next.id) &&
        entry.state === "blocked"
      ) {
        const changed = await supabase
          .from("cellar_entries")
          .update({ state: "open" })
          .eq("id", entry.id)
          .eq("state", "blocked");
        if (changed.error) throw changed.error;
      }
      setPicked([]);
      setNote("");
      setMessage("answer saved");
      await refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  if (!question)
    return (
      <div className="stack">
        {entry.questions.map((row) => (
          <div className="card stack" key={row.id}>
            <strong>{row.question}</strong>
            <p>{row.answer ?? questionStatus(row)}</p>
          </div>
        ))}
      </div>
    );
  return (
    <section className="approval stack">
      <span className="overline">question · {pending.length} waiting</span>
      <h3>{question.question}</h3>
      {question.options.map((option, index) => (
        <button
          key={option}
          className={`question-option ${picked.includes(option) ? "selected" : ""}`}
          onClick={() =>
            setPicked(
              several
                ? picked.includes(option)
                  ? picked.filter((row) => row !== option)
                  : [...picked, option]
                : [option],
            )
          }
        >
          <span className="letter">{String.fromCharCode(65 + index)}</span>
          {option}
        </button>
      ))}
      <label className="row">
        <input
          type="checkbox"
          checked={several}
          onChange={(event) => setSeveral(event.target.checked)}
        />
        pick more than one
      </label>
      <textarea
        aria-label="answer note"
        placeholder="add a note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        className="primary"
        disabled={busy || (!picked.length && !note.trim())}
        onClick={() => void answer()}
      >
        send answer
      </button>
      <button disabled={busy} onClick={() => void answer(true)}>
        let it decide
      </button>
      <button
        className="quiet"
        disabled={busy}
        onClick={() => setConfirmDismiss(true)}
      >
        wave it off
      </button>
      {confirmDismiss && (
        <section className="card stack">
          <p>
            Wave off this question? Agent will stop waiting for this answer.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              setConfirmDismiss(false);
              void dismiss();
            }}
          >
            wave it off
          </button>
          <button onClick={() => setConfirmDismiss(false)}>cancel</button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
