import { Package } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { SAMPLE_PHONE } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';

export function PhoneTools({ phone }: { phone: typeof SAMPLE_PHONE }) {
  return <View className="gap-7">
    <View className="gap-2.5"><Overline>install and open</Overline>
      <View className="flex-row flex-wrap items-center gap-3 rounded-xl bg-row p-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Package size={18} color={COLORS.foregroundSoft} /></View>
        <View className="min-w-0 flex-1 basis-[200px]"><Text className="font-mono text-sm font-semibold text-foreground" numberOfLines={1}>{phone.apk.file}</Text><Text className="font-sans text-xs text-muted-foreground">{phone.apk.line}</Text></View>
        <Pill label="clear data" /><Pill label="uninstall" /><Pill label="install and open" primary />
      </View>
      <View className="flex-row flex-wrap gap-2"><TextInput accessibilityLabel="deep link" editable={false} value={phone.deepLink} className="h-10 min-w-0 flex-1 basis-[200px] rounded-lg border border-border bg-secondary px-3 font-mono text-[13px] text-foreground" /><Pill label={`open on ${phone.name}`} /></View>
    </View>
    <View className="gap-2.5"><Overline>capture</Overline><View className="flex-row flex-wrap gap-2.5">
      {[['screenshot', 'into the open chat, or the clipboard'], ['record 30s', 'with taps shown, as a short clip'], ['file this screen', 'new glitch with screenshot and last 200 log lines']].map(([title, detail]) => <View key={title} className="min-w-[130px] flex-1 gap-1 rounded-xl bg-row p-3.5"><Text className="font-sans text-sm font-semibold text-foreground">{title}</Text><Text className="font-sans text-xs text-muted-foreground">{detail}</Text></View>)}
    </View></View>
  </View>;
}

export function Pill({ label, primary = false }: { label: string; primary?: boolean }) {
  return <View accessibilityLabel={`${label} · visual only`} className={`h-10 justify-center rounded-full border px-4 ${primary ? 'border-primary bg-primary' : 'border-border'}`}><Text className={`font-sans text-sm font-semibold ${primary ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text></View>;
}
