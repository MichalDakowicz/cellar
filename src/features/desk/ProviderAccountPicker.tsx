import { useQuery } from '@tanstack/react-query';
import { View, Text, Pressable } from 'react-native';
import type { DeskAgent } from '@/lib/deskProtocol';
import { useDeskLink } from './useDeskLink';
export function ProviderAccountPicker({ agent, value, onChange }: { agent: DeskAgent; value: string | null; onChange: (id: string | null) => void }) {
  const link = useDeskLink(); const accounts = useQuery({ queryKey: ['provider-accounts', link.ownerId, link.info?.id], queryFn: () => link.calls!.providerAccounts(), enabled: !!link.calls, retry: false });
  if (!link.calls) return null;
  const choices = [{ id: null, label: 'existing provider sign-in' }, ...(accounts.data ?? []).filter((r) => r.agent === agent)];
  return <View className="gap-2"><Text className="font-sans text-sm text-foreground">provider account · plan runs out: ask me</Text><View className="flex-row flex-wrap gap-2">{choices.map((row) => <Pressable key={row.id ?? 'default'} accessibilityRole="button" onPress={() => onChange(row.id)} className={`min-h-11 justify-center rounded-lg border border-border px-3 ${value === row.id ? 'bg-secondary' : ''}`}><Text className="font-sans text-sm text-foreground">{row.label}</Text></Pressable>)}</View><Text className="font-sans text-xs text-muted-foreground">Add encrypted API accounts on PC.</Text></View>;
}
