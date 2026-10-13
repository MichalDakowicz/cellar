import { Text, View } from 'react-native';
import type { HostStop } from '@/lib/deskDispatch';

export function StopAllStatus({ message, hosts }: { message: string | null; hosts: HostStop[] }) {
  return <View className="gap-1">
    {!!message && <Text className="font-sans text-xs text-muted-foreground">{message}</Text>}
    {hosts.map((host) => <View key={host.id} className="gap-0.5">
      <Text className="font-sans text-xs text-muted-foreground">{host.name} · {host.state}{host.error ? ` · ${host.error}` : ''}</Text>
      {host.runs?.filter((run) => run.state !== 'confirmed').map((run) => <Text key={run.id} className="font-sans text-xs text-muted-foreground">{run.name} · {run.state} · {run.error}</Text>)}
    </View>)}
  </View>;
}
