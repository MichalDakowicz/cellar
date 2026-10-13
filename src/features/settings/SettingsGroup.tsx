import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Overline } from '@/components/ui/controls';

/** One labelled block on a settings page — the boards' uppercase `.lbl`, then its rows. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-3 pt-8">
      {title && <Overline>{title}</Overline>}
      {children}
    </View>
  );
}
