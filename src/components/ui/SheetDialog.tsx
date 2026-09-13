import { useEffect, type ReactNode } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DialogTone = 'primary' | 'destructive';

type SheetDialogProps = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  dismissLabel?: string;
  tone?: DialogTone;
  /** Disables the confirm button and explains why, instead of hiding the sheet. */
  confirmDisabledReason?: string | null;
  onConfirm: () => void;
  /** The secondary *button*. May be destructive — see onRequestClose. */
  onDismiss: () => void;
  /**
   * Clicking off: the backdrop, Escape, and the Android back gesture.
   *
   * Separate from `onDismiss` because the secondary button is not always "close
   * this" — on the edit sheets it is "delete it", and a stray tap outside must
   * never arm a destructive step. Defaults to `onDismiss` for every sheet whose
   * secondary button really is just cancel.
   */
  onRequestClose?: () => void;
  children?: ReactNode;
};

/**
 * The bottom sheet every confirmation uses.
 *
 * A dialog states the consequence in the body and names it in the button —
 * "freeze today", not "OK" — because the two-token decision and the lose-the-
 * streak decision look identical otherwise.
 */
export function SheetDialog({
  open,
  title,
  body,
  confirmLabel,
  dismissLabel = 'cancel',
  tone = 'primary',
  confirmDisabledReason = null,
  onConfirm,
  onDismiss,
  onRequestClose,
  children,
}: SheetDialogProps) {
  const insets = useSafeAreaInsets();
  const close = onRequestClose ?? onDismiss;

  // Escape closes it on web, where a sheet with no visible close affordance is
  // otherwise a trap for anyone on a keyboard.
  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const disabled = !!confirmDisabledReason;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close"
        onPress={close}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        {/* The sheet swallows its own taps so a press inside does not dismiss. */}
        <Pressable onPress={() => {}} accessible={false}>
          <Animated.View
            entering={SlideInDown.duration(240)}
            className="rounded-t-[20px] border-t border-border bg-popover px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            {!!body && <Text className="mt-2 text-sm text-muted-foreground">{body}</Text>}
            {children}
            <View className="mt-[18px] gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={onConfirm}
                className={[
                  'items-center rounded-full py-3.5',
                  disabled ? 'bg-secondary' : tone === 'destructive' ? 'bg-destructive' : 'bg-primary',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-sm font-bold',
                    disabled
                      ? 'text-muted-foreground'
                      : tone === 'destructive'
                        ? 'text-destructive-foreground'
                        : 'text-primary-foreground',
                  ].join(' ')}
                >
                  {confirmLabel}
                </Text>
              </Pressable>
              {disabled && (
                <Text className="text-center text-xs text-muted-foreground">{confirmDisabledReason}</Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
                onPress={onDismiss}
                className="items-center rounded-full border border-border py-3.5"
              >
                <Text className="text-sm font-semibold text-muted-foreground">{dismissLabel}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
