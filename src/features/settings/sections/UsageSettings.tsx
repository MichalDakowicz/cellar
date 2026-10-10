import { Text, View } from 'react-native';

import { DeskUsageBlock } from '@/components/desk/DeskUsageBlock';
import { Chip, SwitchRow } from '@/components/ui/controls';
import { useDeskSettings } from '@/features/desk/useDeskSettings';
import { PLAN_OUT_POLICIES, USAGE_LIMITS } from '@/lib/deskSettings';
import { SAMPLE_USAGE_MORE } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/**
 * Settings › usage and accounts (`DeskUsage.dc.html`): the compact meter, this
 * chat's context, each plan's windows, the accounts per agent and what happens
 * when one runs out, the week by day, and the limits. Numbers only on the
 * sample desk until the agents report their own (docs/desk/TASKS.md W16).
 */
export function UsageSettings() {
  const desk = useDeskSettings();
  const sample = desk.devices.sample;
  const more = sample ? SAMPLE_USAGE_MORE : null;

  return (
    <SettingsPage title="usage and accounts" sub={more ? `per agent · ${more.meter}` : 'per agent · numbers once the agents report them'}>
      {more && (
        <SettingsGroup title="this chat">
          <Text className="font-sans text-xs text-muted-foreground">{more.chat.title}</Text>
          <Bar share={more.chat.used / more.chat.of} />
          <Text className="font-sans text-sm text-foreground">{`${more.chat.used}k of ${more.chat.of}k tokens in context · ${Math.round((more.chat.used / more.chat.of) * 100)}%`}</Text>
          <Text className="font-sans text-xs text-muted-foreground">at 80% cellar offers /compact — the agent’s own way of shrinking the chat</Text>
        </SettingsGroup>
      )}

      <SettingsGroup title="plan limits">
        <DeskUsageBlock agents={desk.usage} />
      </SettingsGroup>

      <SettingsGroup title="accounts">
        {more ? (
          more.accounts.map((agent) => (
            <View key={agent.agent} className="gap-2">
              <Text className="font-sans text-sm font-semibold text-foreground">{agent.agent}</Text>
              {agent.rows.map((row) => (
                <View key={row.label} className="flex-row items-center gap-3 rounded-xl bg-row p-3">
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="font-sans text-sm font-semibold text-foreground">{row.label}</Text>
                    <Text className="font-sans text-xs text-muted-foreground">{row.meta}</Text>
                    <Text className="font-sans text-xs" style={{ color: COLORS.foregroundSoft }}>{row.usage}</Text>
                  </View>
                  <Text className="font-sans text-xs font-semibold text-muted-foreground">{row.active ? 'in use' : 'use this'}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text className="font-sans text-xs text-muted-foreground">accounts per agent — subscriptions, team seats, api keys — come with usage.</Text>
        )}
        <Text className="font-sans pt-2 text-sm font-semibold text-foreground">when a plan runs out mid-run</Text>
        <View className="flex-row flex-wrap gap-2">
          {PLAN_OUT_POLICIES.map((policy, index) => (
            <Chip key={policy} label={policy} selected={index === 0} onPress={() => {}} disabled />
          ))}
        </View>
        <Text className="font-sans text-xs text-muted-foreground">
          for accounts you own — personal, work, an api key. switching never logs the agent’s other windows out.
        </Text>
      </SettingsGroup>

      {more && (
        <SettingsGroup title="this week by day">
          <View className="h-24 flex-row items-end gap-2">
            {more.days.map((day) => (
              <View key={day.day} className="flex-1 items-center gap-1">
                <View className="w-full rounded-md bg-primary" style={{ height: Math.round(day.share * 72) }} />
                <Text className="font-sans text-[11px] text-muted-foreground">{day.day}</Text>
              </View>
            ))}
          </View>
          {more.spent.map((row) => (
            <View key={row.title} className="flex-row items-center gap-3">
              <Text className="font-sans min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>{row.title}</Text>
              <Text className="font-sans text-xs text-muted-foreground">{row.agent}</Text>
              <Text className="w-14 text-right font-mono text-xs text-foreground">{row.tokens}</Text>
            </View>
          ))}
        </SettingsGroup>
      )}

      <SettingsGroup title="limits">
        {USAGE_LIMITS.map((limit) => (
          <SwitchRow key={limit.label} label={limit.label} sub={limit.sub} value={limit.on} onChange={() => {}} disabled />
        ))}
      </SettingsGroup>
    </SettingsPage>
  );
}

function Bar({ share }: { share: number }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-secondary">
      <View className="h-full rounded-full" style={{ width: `${Math.round(share * 100)}%`, backgroundColor: COLORS.foreground, opacity: 0.8 }} />
    </View>
  );
}
