import { useQuery } from '@tanstack/react-query';
import { View, Text } from 'react-native';
import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';
import { RunTools } from './RunTools';
export function UsageLive() {
  const link = useDeskLink(); const runs = useDeskRuns(link);
  const accounts = useQuery({ queryKey: ['provider-accounts', link.ownerId, link.info?.id], queryFn: () => link.calls!.providerAccounts(), enabled: !!link.calls, retry: false });
  return <View className="gap-4"><Text className="font-sans text-sm text-muted-foreground">Provider windows and reset times come from connected sessions. Claude context summaries are labelled estimates. Missing numbers stay unavailable.</Text>
    <Text className="font-sans text-lg text-foreground">accounts</Text><Text className="font-sans text-sm text-foreground">Existing provider sign-in · when plan runs out: ask me</Text>
    {accounts.data?.map((row) => <Text key={row.id} className="font-sans text-sm text-foreground">{row.agent} · {row.label} · API · {row.policy}</Text>)}
    <Text className="font-sans text-xs text-muted-foreground">Add encrypted API accounts on PC, then choose one on a new task.</Text>
    {!link.calls && <Text className="font-sans text-sm text-muted-foreground">Connect directly to PC for usage and account choices. Browser uses the account mailbox.</Text>}
    {link.calls && runs.runs.filter((run) => run.agent !== 'job').slice(0, 8).map((run) => <View key={run.id} className="gap-2"><Text className="font-sans text-sm text-foreground">{run.name}</Text><RunTools runId={run.id} /></View>)}
    {accounts.error && <Text className="font-sans text-sm text-muted-foreground">{String(accounts.error)}</Text>}
  </View>;
}
