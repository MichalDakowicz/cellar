import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { KeyPlanLine } from '@/lib/deskKeys';
import { inkFor } from '@/lib/hexChips';

/**
 * Under the composer: what each token will do, before you send
 * (docs/desk/keys.md, "one line, many things"). A colour is drawn as its chip;
 * a tap on it offers copy, lighter and darker, and a nudge rewrites the code in
 * the message itself.
 */
export function KeyPlan({
  lines,
  onCopy,
  onNudge,
}: {
  lines: KeyPlanLine[];
  onCopy: (code: string) => void;
  onNudge: (code: string, lighter: boolean) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (lines.length === 0) return null;

  return (
    <View accessibilityLabel="what the message will do" className="gap-1.5">
      {lines.map((line, index) => (
        <View key={`${index}:${line.token}`} className="gap-1.5">
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {line.key === '#' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`colour ${line.token}`}
                onPress={() => setOpen(open === index ? null : index)}
                className="rounded-[5px] px-[7px] py-px"
                style={{ backgroundColor: line.token }}
              >
                <Text className="font-mono text-xs font-semibold" style={{ color: inkFor(line.token) }}>
                  {line.token}
                </Text>
              </Pressable>
            ) : (
              <Text className="rounded-[5px] bg-secondary px-1.5 py-px font-mono text-xs text-foreground" numberOfLines={1}>
                {line.token}
              </Text>
            )}
            <Text className="font-sans min-w-0 shrink text-xs text-muted-foreground">{line.says}</Text>
          </View>
          {open === index && line.key === '#' && (
            <View className="flex-row gap-1.5">
              <ChipAction label="copy" onPress={() => onCopy(line.token)} />
              <ChipAction label="lighter" onPress={() => onNudge(line.token, true)} />
              <ChipAction label="darker" onPress={() => onNudge(line.token, false)} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ChipAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-8 justify-center rounded-full border border-border px-3 active:opacity-70"
    >
      <Text className="font-sans text-xs font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}
