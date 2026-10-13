import { Pressable, Text, View } from 'react-native';
import { Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import type { WorktreeAction, WorktreeReview } from '@/lib/deskWorktrees';

export function WorktreeControl(props: {
  review: WorktreeReview | null; busy: boolean; error: string | null; message: string | null;
  pending: boolean; connected: boolean; inspect: (action: WorktreeAction) => void;
  submit: () => void; close: () => void;
}) {
  const review = props.review;
  return <View className="gap-2 rounded-lg bg-row p-3">
    <Overline>worktree</Overline>
    <View className="flex-row gap-2">
      {(['keep', 'merge', 'remove'] as const).map((action) => <Pressable key={action} accessibilityRole="button"
        accessibilityState={{ disabled: props.busy || props.pending || !props.connected }}
        disabled={props.busy || props.pending || !props.connected} onPress={() => props.inspect(action)}
        className="min-h-11 flex-1 items-center justify-center rounded-lg border border-border px-2">
        <Text className="font-sans text-sm text-foreground">{action}</Text>
      </Pressable>)}
    </View>
    {!props.connected && <Text className="font-sans text-xs text-muted-foreground">Connect directly to the PC for worktree actions.</Text>}
    {props.busy && <Text className="font-sans text-xs text-muted-foreground">Waiting for PC confirmation…</Text>}
    {!!props.message && <Text className="font-sans text-xs text-foreground">{props.message}</Text>}
    {!!props.error && <Text className="font-sans text-xs text-destructive">{props.error}</Text>}
    {props.pending && <Pressable accessibilityRole="button" disabled={props.busy || !props.connected} onPress={props.submit}
      className="min-h-11 justify-center rounded-lg border border-border px-3"><Text className="font-sans text-sm text-foreground">recover worktree action</Text></Pressable>}
    <SheetDialog open={!!review} title={`${review?.action ?? ''} worktree`} confirmLabel={review?.action === 'merge' ? 'merge into main' : review?.action === 'remove' ? 'remove folder' : 'keep worktree'}
      body={review ? `${review.branch}\n${review.action === 'merge' ? `Fast-forward main at ${review.target}. Worktree stays.` : review.action === 'remove' ? 'Remove this clean folder. Git branch and commits stay.' : 'Keep this folder and branch on the PC.'}` : ''}
      tone={review?.action === 'remove' ? 'destructive' : 'primary'}
      confirmDisabledReason={props.busy ? 'Waiting for the PC…' : !props.connected ? 'PC disconnected; reconnect first.' : review?.reason}
      onConfirm={props.submit} onDismiss={props.close}>
      {!!review && <Text selectable className="mt-3 font-mono text-xs text-muted-foreground">{review.summary}</Text>}
    </SheetDialog>
  </View>;
}
