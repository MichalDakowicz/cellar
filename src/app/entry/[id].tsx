import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AgentQuestion } from '@/components/cellar/AgentQuestion';
import { CopyPrompt } from '@/components/cellar/CopyPrompt';
import { AgentThread } from '@/components/cellar/AgentThread';
import { EntryThread } from '@/components/cellar/EntryThread';
import { LinkedText } from '@/components/cellar/LinkedText';
import { LinkPreviews } from '@/components/cellar/LinkPreview';
import { PictureAction } from '@/components/cellar/PictureAction';
import { PictureViewer } from '@/components/cellar/PictureViewer';
import { QuestionThread } from '@/components/cellar/QuestionThread';
import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { KindGlyph } from '@/components/media/Glyphs';
import { EditThought } from '@/components/cellar/EditThought';
import { EntryActions } from '@/components/cellar/EntryActions';
import { EntryAppendLine } from '@/components/cellar/EntryAppendLine';
import { EntryCover } from '@/components/cellar/EntryCover';
import { EntryCard } from '@/components/cellar/EntryCard';
import { EntryDocs } from '@/components/cellar/EntryDocs';
import { EntryTrail } from '@/components/cellar/EntryTrail';
import { ContentShell } from '@/components/layout/ContentShell';
import { AppChrome } from '@/components/layout/AppChrome';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState } from '@/components/ui/states';
import { EditThoughtSheet } from '@/features/cellar/sheets/EditThoughtSheet';
import { useCopyPrompt } from '@/features/cellar/useCopyPrompt';
import { useEntryQuestions } from '@/features/cellar/useEntryQuestions';
import { useEntryScreen } from '@/features/cellar/useEntryScreen';
import { StartOnPcControl } from '@/features/desk/StartOnPcControl';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';
import { agentPrompt } from '@/lib/agentPrompt';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * One entry.
 *
 * The thought stays one line forever; the field below it appends *another*
 * line. That is the fix for the thing a notes app gets wrong — you can come
 * back and dump more into an idea without editing what you originally thought,
 * and the two readings stay separate. Rewording the thought itself is its own
 * deliberate act, and the trail keeps what it used to say.
 */
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntryScreen(id);
  const questions = useEntryQuestions(entry.entry);
  const copyPrompt = useCopyPrompt();
  const router = useRouter();
  const fileUnder = useCellarSheets((state) => state.fileUnder);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rewording, setRewording] = useState(false);

  if (!entry.entry) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1" style={{ marginLeft: sidebar }}>
          <ScreenTop />
          <ContentShell maxWidth={MAX_W.text}>
            <View className={`flex-row items-center ${gutter}`}>
              <ScreenAction />
            </View>
          </ContentShell>
          {/* No instruction for where back is any more: it is on this screen,
              level with everything else, and naming a place it used to be is
              how the copy went stale in the first place. */}
          <EmptyState title="that entry is gone" body="it was deleted, or it never made it here." />
        </View>
        {/* A pushed route mounts its own chrome, and this branch used to return
            before it did — so the one screen with nothing on it was also the
            one with no way off it. */}
        <AppChrome />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={gutter}>
            {/* Back leads the entry's own first line rather than sitting in a
                row of its own above it — that row was a pill adrift in a
                centred column on desktop, and empty padding on a phone, where
                the island carries the action and ScreenAction renders null. */}
            <View className="flex-row items-center gap-3">
              <ScreenAction />
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <KindGlyph kind={entry.entry.kind} size={14} color={COLORS.accent} />
                <Text className="text-xs font-semibold text-primary">{entry.entry.kind}</Text>
                <Text className="text-xs text-muted-foreground">· {entry.projectName}</Text>
                {!!entry.agentName && <Text className="text-xs text-muted-foreground">· {entry.agentName}</Text>}
              </View>
            </View>
            <LinkedText
              text={entry.entry.text}
              className="mt-2.5 text-2xl font-bold leading-tight tracking-tight text-foreground"
            />
            <View className="mt-2.5 flex-row items-center gap-3">
              <Text className="text-xs text-muted-foreground">{entry.stamp}</Text>
              <CopyPrompt onPress={() => entry.entry && copyPrompt(entry.entry)} what="this entry" />
              <StartOnPcControl
                prompt={agentPrompt(entry.entry, entry.project?.name ?? null)}
                repoPath={entry.project?.repoPath}
                entryId={entry.entry.id}
              />
              <EditThought onPress={() => setRewording(true)} />
              <PictureAction has={!!entry.gallery.cover} busy={entry.gallery.busy} onPress={entry.gallery.setCover} />
            </View>

            <EntryCover cover={entry.gallery.cover} onOpen={entry.gallery.view} onRemove={entry.gallery.askRemoveCover} />

            {/* Under the thought and above everything else: a link dumped with
                a thought is usually the thing the thought is about. */}
            <LinkPreviews hrefs={entry.links} />

            {entry.legacyQuestion && <AgentQuestion question={entry.legacyQuestion} agent={entry.agentName} />}

            <QuestionThread
              pending={questions.pending}
              settled={questions.settled}
              onDraft={questions.setDraft}
              onPick={questions.pick}
              onHold={questions.hold}
              onSendHeld={questions.sendHeld}
              onSubmit={questions.submit}
              onDismiss={(view) => questions.askDismiss(view.question)}
            />

            <EntryThread
              lines={entry.thread}
              onRemove={entry.armRemoveLine}
              undone={entry.undoneCount}
              onUndo={entry.undoRemove}
              pictures={entry.gallery.lines}
              onOpenPicture={entry.gallery.view}
            />

            <EntryAppendLine
              value={entry.line}
              onChangeText={entry.setLine}
              onSubmit={entry.appendLine}
              onPicture={entry.gallery.addNote}
              pictureBusy={entry.gallery.busy}
            />

            <AgentThread lines={entry.agentLines} />

            <EntryDocs
              rows={entry.docs.rows}
              draft={entry.docs.draft}
              onDraft={entry.docs.setDraft}
              canAttach={entry.docs.canAttach}
              draftNote={entry.docs.draftNote}
              onAttach={entry.docs.attach}
              onOpen={entry.docs.open}
              onDetach={entry.docs.detach}
            />

            <View className="mb-2 mt-7">
              <Overline>state</Overline>
            </View>
            <ChipWrap
              label="state"
              options={entry.stateOptions}
              selected={entry.entry.state}
              onToggle={entry.setState}
            />

            <View className="mb-2 mt-5">
              <Overline>kind</Overline>
            </View>
            <ChipWrap label="kind" options={kindChips(entry.entry.kind, entry.kindOrder)} selected={entry.entry.kind} onToggle={entry.setKind} />

            <View className="mb-2 mt-5">
              <Overline>importance</Overline>
            </View>
            <ChipWrap
              label="importance"
              options={entry.importanceOptions}
              selected={entry.entry.importance}
              onToggle={entry.setImportance}
            />

            <EntryActions
              archiveLabel={entry.archiveLabel}
              onMove={() => fileUnder?.(entry.entry!.id)}
              onArchive={entry.toggleArchive}
              onDelete={() => setConfirmDelete(true)}
            />

            <EntryTrail items={entry.trail} />
          </View>

          {entry.siblings.length > 0 && (
            <View className={`mt-7 border-y border-border/50 py-4 ${gutter}`}>
              <Overline>{`more in ${entry.projectName}`}</Overline>
              <View className="mt-1.5">
                {entry.siblings.map((sibling) => (
                  <EntryCard
                    key={sibling.id}
                    entry={sibling}
                    variant="hit"
                    onPress={() => router.replace(`/entry/${sibling.id}`)}
                    onCopy={copyPrompt}
                  />
                ))}
              </View>
            </View>
          )}
        </ContentShell>
      </ScrollView>

      <EditThoughtSheet
        open={rewording}
        entryId={entry.entry.id}
        text={entry.entry.text}
        onSave={entry.reword}
        onClose={() => setRewording(false)}
      />

      <SheetDialog
        open={questions.confirming !== null}
        title="wave this question off"
        body="it stays on the entry with the rest, marked as waved off, and stops holding the thought up. nothing is lost — you can still answer it in the chat."
        confirmLabel="wave it off"
        dismissLabel="keep waiting"
        onConfirm={questions.confirmDismiss}
        onDismiss={questions.cancelDismiss}
      />

      <SheetDialog
        open={confirmDelete}
        title="delete this entry"
        body="this is the one thing in the app that does not come back. archive takes it out of the way and keeps it."
        confirmLabel="delete it"
        dismissLabel="archive instead"
        tone="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          entry.deleteEntry();
        }}
        onDismiss={() => {
          setConfirmDelete(false);
          if (!entry.archived) entry.toggleArchive();
        }}
        // The secondary button here is not cancel — it archives. A tap on the
        // backdrop, Escape, or the Android back gesture must close the sheet
        // and nothing else, or backing out of a delete quietly files the
        // thought away and it is gone from the inbox and the project.
        onRequestClose={() => setConfirmDelete(false)}
      />

      {/* Pushed out of the tabs, so the navigator's own chrome is gone — the
          screen mounts it itself, which is also where the phone build's left
          island turns into Back (components/layout/navActions). */}
      <SheetDialog
        open={!!entry.lineToRemove}
        title="remove this line?"
        body={entry.removeLineBody}
        confirmLabel="remove it"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={entry.confirmRemoveLine}
        onDismiss={entry.cancelRemoveLine}
      />

      <SheetDialog
        open={entry.gallery.removing}
        title="remove this picture?"
        body="it is stored as text on the thought, so there is nowhere for it to come back from."
        confirmLabel="remove it"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={entry.gallery.confirmRemoveCover}
        onDismiss={entry.gallery.cancelRemoveCover}
      />

      <PictureViewer uri={entry.gallery.viewer?.uri ?? null} onClose={entry.gallery.closeViewer} />

      <AppChrome />
    </View>
  );
}
