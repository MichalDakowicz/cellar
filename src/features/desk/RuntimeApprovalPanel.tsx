import { Pressable, Text, View } from 'react-native';
import { ApprovalPanel } from '@/components/desk/ApprovalPanel';
import { approvalMessage, type RuntimeRequest } from '@/lib/deskApprovals';
import { useApprovalAction } from './useApprovalAction';

export function RuntimeApprovalPanel({ request }: { request: RuntimeRequest }) {
  const action = useApprovalAction(request); const row = action.receipt?.state === 'confirmed' ? action.receipt.request : request;
  const disabled = action.busy || action.pending || !action.connected || row.state !== 'pending';
  return <View className="gap-2">
    <ApprovalPanel approval={row} onDecide={action.decide} disabled={disabled} />
    <Text className="font-sans text-xs text-muted-foreground" selectable>{action.busy ? 'Sending decision…' : approvalMessage(row)}</Text>
    {!!action.error && <Text className="font-sans text-sm text-destructive-foreground" selectable>{action.error}</Text>}
    {action.pending && <Pressable accessibilityRole="button" disabled={action.busy || !action.connected} onPress={action.recover} className="min-h-11 items-center justify-center rounded-lg border border-border">
      <Text className="font-sans text-sm text-foreground">{action.busy ? 'checking…' : 'check original receipt'}</Text>
    </Pressable>}
  </View>;
}
