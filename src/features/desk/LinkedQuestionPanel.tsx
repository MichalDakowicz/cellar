import { QuestionThread } from '@/components/cellar/QuestionThread';
import { useEntryQuestions } from '@/features/cellar/useEntryQuestions';
import type { Entry } from '@/types/cellar';
import { SheetDialog } from '@/components/ui/SheetDialog';

/** Reuse the stored question and its confirmed W3 write; do not create a second record. */
export function LinkedQuestionPanel({ entry, questionId }: { entry: Entry; questionId: string }) {
  const questions = useEntryQuestions(entry);
  return <><QuestionThread pending={questions.pending.filter((row) => row.question.id === questionId)} settled={[]}
    onDraft={questions.setDraft} onToggle={questions.toggle} onSeveral={questions.toggleSeveral}
    onOpenNote={questions.openNote} onNote={questions.setNote} onAnswer={questions.answerPicked}
    onSubmit={questions.submit} onLetDecide={questions.letDecide} onDismiss={(view) => questions.askDismiss(view.question)} />
    <SheetDialog open={questions.confirming !== null} title="wave this question off"
      body="The question stays on the entry, marked as waved off, and stops holding the thought up."
      confirmLabel="wave it off" dismissLabel="keep waiting" onConfirm={questions.confirmDismiss} onDismiss={questions.cancelDismiss} />
    </>;
}
