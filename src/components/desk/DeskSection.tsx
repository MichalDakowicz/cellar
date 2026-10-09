import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';

/** One block of the pc screen: an overline, the rows, and the line under them when there are none. */
export function DeskSection({
  title,
  gutter,
  empty,
  children,
}: {
  title: string;
  gutter: string;
  /** Shown instead of the children when there is nothing to list. */
  empty?: string | null;
  children?: ReactNode;
}) {
  return (
    <View className={`gap-1 pt-7 ${gutter}`}>
      <Overline>{title}</Overline>
      {empty ? <Text className="pt-1 text-xs text-muted-foreground">{empty}</Text> : <View>{children}</View>}
    </View>
  );
}
