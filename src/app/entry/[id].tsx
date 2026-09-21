import { useLocalSearchParams, useRouter } from 'expo-router';
import { Copy, Plus, Trash } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AgentQuestion } from '@/components/cellar/AgentQuestion';
import { AgentThread } from '@/components/cellar/AgentThread';
import { EntryThread } from '@/components/cellar/EntryThread';
import { QuestionThread } from '@/components/cellar/QuestionThread';
import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { KindGlyph } from '@/components/media/Glyphs';
import { EntryCard } from '@/components/cellar/EntryCard';
import { ContentShell } from '@/components/layout/ContentShell';
import { AppChrome } from '@/components/layout/AppChrome';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState } from '@/components/ui/states';
import { useCopyPrompt } from '@/features/cellar/useCopyPrompt';
import { useEntryQuestions } from '@/features/cellar/useEntryQuestions';
import { useEntryScreen } from '@/features/cellar/useEntryScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, webFocusRing, useSidebarSpace } from '@/hooks/useResponsive';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * One entry.
 *
 * The thought stays one line forever; the field below it appends *another*
 * line. That is the fix for the thing a notes app gets wrong — you can come
 * back and dump more into an idea without editing what you originally thought,
 * and the two readings stay separate.
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
  const [lineFocused, setLineFocused] = useState(false);

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
            <Text className="mt-2.5 text-2xl font-bold leading-tight tracking-tight text-foreground">
              {entry.entry.text}
            </Text>
            <View className="mt-2.5 flex-row items-center gap-3">
              <Text className="text-xs text-muted-foreground">{entry.stamp}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="copy a prompt for an agent"
                hitSlop={8}
                onPress={() => entry.entry && copyPrompt(entry.entry)}
                className="flex-row items-center gap-1.5 active:opacity-60"
              >
                <Copy size={12} color={COLORS.muted} strokeWidth={2} />
                <Text className="text-xs text-muted-foreground">copy a prompt</Text>
              </Pressable>
            </View>

            {entry.legacyQuestion && <AgentQuestion question={entry.legacyQuestion} agent={entry.agentName} />}

            <QuestionThread
              pending={questions.pending}
              settled={questions.settled}
              onDraft={questions.setDraft}
              onPick={questions.pick}
              onSubmit={questions.submit}
              onDismiss={(view) => questions.askDismiss(view.question)}
            />

            <EntryThread
              lines={entry.thread}
              onRemove={entry.armRemoveLine}
              undone={entry.undoneCount}
              onUndo={entry.undoRemove}
            />

            <View className="mt-3.5 flex-row gap-2">
              <TextInput
                className="h-[42px] min-w-0 flex-1 rounded-lg bg-secondary px-3.5 text-foreground"
                style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS, webFocusRing(lineFocused)]}
              onFocus={() => setLineFocused(true)}
              onBlur={() => setLineFocused(false)}
                placeholder="dump more into this"
                placeholderTextColor={COLORS.muted}
                value={entry.line}
                onChangeText={entry.setLine}
                onSubmitEditing={entry.appendLine}
                returnKeyType="done"
                accessibilityLabel="dump more into this"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="add a line"
                hitSlop={6}
                onPress={entry.appendLine}
                className="h-[42px] w-[42px] items-center justify-center rounded-lg bg-secondary active:opacity-70"
              >
                <Plus size={18} color={COLORS.foreground} strokeWidth={2} />
              </Pressable>
            </View>

            <AgentThread lines={entry.agentLines} agent={entry.agentName} />

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
            <ChipWrap label="kind" options={kindChips(entry.entry.kind)} selected={entry.entry.kind} onToggle={entry.setKind} />

            <View className="mt-7 flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="move to another project"
                onPress={() => fileUnder?.(entry.entry!.id)}
                className="h-11 flex-1 items-center justify-center rounded-full bg-secondary active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">move</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={entry.archiveLabel}
                onPress={entry.toggleArchive}
                className="h-11 flex-1 items-center justify-center rounded-full active:opacity-80"
                style={{ backgroundColor: COLORS.accentSoft }}
              >
                <Text className="text-sm font-semibold text-primary">{entry.archiveLabel}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="delete this entry"
                hitSlop={6}
                onPress={() => setConfirmDelete(true)}
                className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
                style={{ backgroundColor: COLORS.dangerSoft }}
              >
                <Trash size={16} color={COLORS.danger} strokeWidth={2} />
              </Pressable>
            </View>
            <Text className="mt-3 text-xs text-muted-foreground">
              archiving takes it out of the project and the inbox without losing it. search still finds it, and it comes
              back.
            </Text>
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
        body={entry.lineToRemove ? `"${entry.lineToRemove.text}" comes off the thought. undo is there until you leave.` : undefined}
        confirmLabel="remove it"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={entry.confirmRemoveLine}
        onDismiss={entry.cancelRemoveLine}
      />

      <AppChrome />
    </View>
  );
}
