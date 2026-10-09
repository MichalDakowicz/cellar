import { Text, View } from 'react-native';

import { Chip, Segmented } from '@/components/ui/controls';
import { agentLabel, type DeskAgent } from '@/lib/deskProtocol';
import { DESK_MODES, modeHint, type DeskMode } from '@/lib/deskTask';

/**
 * Settings › desk › agents: which agent and how much it may do, for every new
 * task until you pick otherwise on it. Slots belong to the host and are set
 * where the host is (W20).
 */
export function DeskDefaultsBlock({
  agents,
  agent,
  onAgent,
  mode,
  onMode,
}: {
  agents: DeskAgent[];
  agent: DeskAgent;
  onAgent: (agent: DeskAgent) => void;
  mode: DeskMode;
  onMode: (mode: DeskMode) => void;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {agents.map((candidate) => (
          <Chip key={candidate} label={agentLabel(candidate)} selected={candidate === agent} onPress={() => onAgent(candidate)} />
        ))}
      </View>
      <Segmented<DeskMode>
        label="how much it may do"
        value={mode}
        onChange={onMode}
        options={DESK_MODES.map((option) => ({ value: option.id, label: option.label }))}
      />
      <Text className="text-xs text-muted-foreground">
        {modeHint(mode)}. new tasks start here; any one can change it before it is sent.
      </Text>
    </View>
  );
}
