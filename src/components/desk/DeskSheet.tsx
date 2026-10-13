import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDesktop } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * A sheet over whatever you were looking at (docs/desk/canvas `NewTask`,
 * `PhoneShare`): the backdrop, which closes it; the grabber; its body, which
 * scrolls; and a footer pinned above the keyboard with the one thing it is
 * for. On a wide window it is a column in the middle rather than full width.
 */
export function DeskSheet({
  onClose,
  footer,
  header,
  height = '93%',
  children,
}: {
  onClose: () => void;
  footer: ReactNode;
  header?: ReactNode;
  height?: `${number}%`;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  return (
    <View className="flex-1">
      <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={onClose} className="absolute inset-0" style={{ backgroundColor: COLORS.backdrop }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute bottom-0 left-0 right-0"
        style={height === '93%' ? { top: Math.max(insets.top, 60) } : { height }}
        pointerEvents="box-none"
      >
        <View
          className="flex-1 overflow-hidden rounded-t-[20px] border border-b-0 border-border bg-card"
          style={isDesktop ? { width: '100%', maxWidth: 560, alignSelf: 'center' } : undefined}
        >
          <View className="h-[22px] items-center justify-center">
            <View className="h-1 w-9 rounded-full bg-white/25" />
          </View>
          {header && <View className="border-b border-border/50 px-4 pb-3">{header}</View>}
          <ScrollView className="flex-1" contentContainerClassName="gap-5 px-4 pb-3 pt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          <View className="border-t border-border/50 px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            {footer}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
