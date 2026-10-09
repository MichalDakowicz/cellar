import { Text, View } from 'react-native';

import { SwitchRow } from '@/components/ui/controls';
import { EXTRA_KEYS } from '@/lib/deskSettings';

/**
 * Settings › desk › keys (docs/desk/keys.md, "your own keys"): `@ $ /` are
 * fixed and `#` is colours; these four are ideas to start from. Drawn off until
 * each one has something to search (docs/desk/TASKS.md W10).
 */
export function DeskKeysBlock() {
  return (
    <View>
      {EXTRA_KEYS.map((key) => (
        <SwitchRow
          key={key.key}
          label={`${key.key}  ${key.name}`}
          sub={`${key.example} · ${key.on ? 'on' : 'off'} when it lands`}
          value={false}
          onChange={() => {}}
          disabled
        />
      ))}
      <Text className="pt-1 text-xs text-muted-foreground">
        @ files, $ cellar and / skills are always on; # is colours. these four come later.
      </Text>
    </View>
  );
}
