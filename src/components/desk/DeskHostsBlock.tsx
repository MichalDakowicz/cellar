import { Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

const FIELDS: { label: string; placeholder: string; mono: boolean }[] = [
  { label: 'name', placeholder: 'build-box', mono: false },
  { label: 'ssh link', placeholder: 'ssh://me@build-box.local:22', mono: true },
  { label: 'key', placeholder: '~/.ssh/id_ed25519 · or your ssh agent', mono: true },
  { label: 'agent slots', placeholder: '4', mono: false },
];

/**
 * Settings › hosts (`DeskHosts.dc.html`): every host as a row — this pc only,
 * for now — and the card that adds one over ssh, drawn and switched off until
 * the server is actually set up (docs/desk/TASKS.md W20).
 */
export function DeskHostsBlock({ name, online, line }: { name: string; online: boolean; line: string }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-3 rounded-xl bg-row p-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-sans text-base font-bold text-foreground">{name}</Text>
          <Text className="font-sans text-xs text-muted-foreground" numberOfLines={1}>
            this pc · local · every project
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.mutedDeep }} />
          <Text className="font-sans text-xs text-foreground">{line}</Text>
        </View>
      </View>

      <View className="mt-2.5 max-w-[760px] gap-3.5 rounded-2xl border border-border p-[18px]" style={{ opacity: 0.6 }}>
        <Text className="font-sans text-base font-bold text-foreground">add a host</Text>
        <View className="flex-row flex-wrap gap-3">
          {FIELDS.map((field) => (
            <View key={field.label} className="min-w-[200px] flex-1 basis-[45%] gap-1.5">
              <Text className="font-sans text-xs text-muted-foreground">{field.label}</Text>
              <TextInput
                editable={false}
                className={`h-10 rounded-lg border border-border bg-secondary px-3 text-[13px] text-foreground ${field.mono ? 'font-mono' : ''}`}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.muted}
                accessibilityLabel={field.label}
              />
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Chip label="install the daemon there" selected onPress={() => {}} disabled />
          <Chip label="use it for night shift" selected={false} onPress={() => {}} disabled />
          <Chip label="only some projects…" selected={false} onPress={() => {}} disabled />
        </View>
        <View className="flex-row flex-wrap items-center gap-3">
          <View className="h-10 justify-center rounded-full bg-primary px-[18px]">
            <Text className="font-sans text-sm font-semibold text-primary-foreground">test the connection</Text>
          </View>
          <Text className="font-sans text-sm text-muted-foreground">after the server is set up — checks the link, the key, node and git, then installs the daemon</Text>
        </View>
      </View>
    </View>
  );
}
