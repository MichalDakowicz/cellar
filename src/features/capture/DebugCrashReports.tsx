import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { readDebugCrashes } from '@/lib/debugCrashes';
import { nativeCapture } from './nativeCapture';
import { fileDebugCrash } from './crashApi';

export function DebugCrashReports() {
  const { user } = useAuth(); const query = useQueryClient();
  const [rows, setRows] = useState(() => { try { return __DEV__ && nativeCapture ? readDebugCrashes(nativeCapture.getCrashes()) : []; } catch { return []; } });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (__DEV__) nativeCapture?.setCaptureOwner(user?.id ?? null); }, [user?.id]);
  const report = rows.find((row) => row.owner === user?.id);
  if (!__DEV__ || !user || !report) return null;
  async function file() {
    if (!user || !report || report.owner !== user.id) return; setBusy(true); setError(null);
    try { await fileDebugCrash(user.id, report); nativeCapture?.dismissCrash(report.signature); setRows((r) => r.filter((row) => row.signature !== report.signature)); await query.invalidateQueries(); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return <View className="absolute inset-x-4 top-12 z-50 max-h-[600px] gap-3 rounded-xl border border-border bg-background p-4">
    <Text className="font-sans text-xl text-foreground">Cellar debug crash · {report.count} repeats</Text>
    <Text className="font-sans text-sm text-foreground">Review before filing stack, app log and screenshot into your Cellar inbox.</Text>
    <ScrollView style={{ maxHeight: 300 }}><View className="gap-3">
      <Text selectable className="font-mono text-xs text-foreground">{report.stack}</Text>
      <Text selectable className="font-mono text-xs text-foreground">{report.log}</Text>
      {report.picture && <Image source={{ uri: report.picture.data }} style={{ width: 240, height: 300 }} resizeMode="contain" accessibilityLabel="Crash screenshot included when you file this report" />}
    </View></ScrollView>
    <Pressable disabled={busy} onPress={() => void file()}><Text className="p-3 font-sans text-foreground">file glitch with evidence</Text></Pressable>
    <Pressable disabled={busy} onPress={() => setRows((r) => r.filter((row) => row.signature !== report.signature))}><Text className="p-3 font-sans text-muted-foreground">later · keep local report</Text></Pressable>
    {error && <Text accessibilityRole="alert" className="font-sans text-foreground">{error}</Text>}
  </View>;
}
