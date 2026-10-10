import { CloudUpload, Eye, FlaskConical, Play, RefreshCw, Smartphone, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { DeskCommandIcon, DeskProjectCommands } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';
import { Overline } from '@/components/ui/controls';

const ICONS: Record<DeskCommandIcon, LucideIcon> = {
  rebuild: RefreshCw,
  preview: Eye,
  deploy: CloudUpload,
  apk: Smartphone,
  test: FlaskConical,
  run: Play,
};

/**
 * The desk's quick commands (`Main.dc.html`): project chips pick the set, the
 * tiles are that project's `$` commands, and one mono line says where it lives
 * and when it last built. Every tile is also a word after `$` in the composer
 * (docs/desk/keys.md).
 */
export function DeskCommandTiles({
  projects,
  current,
  onPick,
  onRun,
  gutter,
  mono = false,
}: {
  projects: DeskProjectCommands[];
  current: DeskProjectCommands;
  onPick: (id: string) => void;
  /** Null until commands run for real (docs/desk/TASKS.md W2). */
  onRun: ((projectId: string, commandId: string) => void) | null;
  gutter: string;
  /** The desktop home's `$name` buttons (`DeskHome.dc.html`) instead of the phone's icon tiles. */
  mono?: boolean;
}) {
  return (
    <View className="gap-2.5">
      {!mono && <Overline className={gutter}>commands for</Overline>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName={`gap-2 ${gutter}`}>
        {projects.map((project) => {
          const on = project.id === current.id;
          return (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onPick(project.id)}
              className={`min-h-11 justify-center rounded-full border px-3.5 ${on ? 'border-primary' : 'border-border'}`}
              style={{ backgroundColor: on ? COLORS.accentSoft : COLORS.chipGround }}
            >
              <Text className="font-sans text-sm font-semibold" style={{ color: on ? COLORS.accentText : COLORS.muted }}>{project.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className={`flex-row gap-2 ${mono ? 'flex-wrap' : ''} ${gutter}`}>
        {current.commands.map((command) => {
          const Icon = ICONS[command.icon];
          if (mono) {
            return (
              <Pressable
                key={command.id}
                accessibilityRole="button"
                accessibilityLabel={`$${command.label} in ${current.name}`}
                disabled={!onRun}
                onPress={() => onRun?.(current.id, command.id)}
                className="h-10 min-w-[30%] flex-1 items-center justify-center rounded-xl bg-row px-3 active:opacity-70"
              >
                <Text className="font-mono text-xs text-foreground">{`$${command.label}`}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={command.id}
              accessibilityRole="button"
              accessibilityLabel={`$${command.label} in ${current.name}`}
              disabled={!onRun}
              onPress={() => onRun?.(current.id, command.id)}
              className="h-[76px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-row active:opacity-70"
            >
              <Icon size={20} color={COLORS.foreground} strokeWidth={2} />
              <Text className="font-sans text-xs font-semibold text-foreground">{command.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className={`font-mono text-xs text-muted-foreground ${gutter}`} numberOfLines={1}>
        {current.meta}
      </Text>
    </View>
  );
}
