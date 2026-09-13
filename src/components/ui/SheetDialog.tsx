import { X } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_W, useIsDesktop } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

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

/** How much of the window the desktop card may take before its body scrolls. */
const DESKTOP_MAX_HEIGHT = 0.8;

/**
 * The one confirmation surface, in its two shapes: a bottom sheet on phone, a
 * centred dialog on desktop web (PING.md §9.8).
 *
 * A sheet that slides up from the bottom edge of a 27" monitor is a thumb
 * gesture pretending to work with a mouse — so past `DESKTOP_MIN_WIDTH` the same
 * props render a card in the middle of the screen with a close control, and the
 * two buttons sit side by side instead of stacking the width of the window.
 *
 * A dialog states the consequence in the body and names it in the button —
 * "delete it", not "OK" — because the two-token decision and the lose-the-
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
  const isDesktop = useIsDesktop();
  const { height: windowHeight } = useWindowDimensions();
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

  const heading = (
    <>
      <Text className={['text-lg font-bold text-foreground', isDesktop ? 'pr-10' : ''].join(' ')}>{title}</Text>
      {!!body && <Text className="mt-2 text-sm text-muted-foreground">{body}</Text>}
    </>
  );

  const confirmButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={confirmLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onConfirm}
      className={[
        'items-center rounded-full py-3.5',
        isDesktop ? 'px-6' : '',
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
  );

  const dismissButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dismissLabel}
      onPress={onDismiss}
      className={['items-center rounded-full border border-border py-3.5', isDesktop ? 'px-6' : ''].join(' ')}
    >
      <Text className="text-sm font-semibold text-muted-foreground">{dismissLabel}</Text>
    </Pressable>
  );

  if (isDesktop) {
    return (
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View className="flex-1 items-center justify-center p-6">
          {/* The backdrop is a sibling *behind* the card, never its parent: on
              web a click inside the card bubbles to a parent Pressable and
              closes the dialog the user was typing into. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="close"
            onPress={close}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
          />
          <Animated.View
            entering={FadeIn.duration(160)}
            style={{ width: '100%', maxWidth: MAX_W.form, maxHeight: windowHeight * DESKTOP_MAX_HEIGHT }}
          >
            {/* The ground is on a plain View, never on the Animated.View: on web
                NativeWind's className does not reach a reanimated component, and
                a dialog whose card is transparent shows the page through it. */}
            <View className="overflow-hidden rounded-2xl border border-border bg-popover">
              {/* Body scrolls, actions stay put — a shelf list long enough to
                  overflow must never push its own buttons off the card. */}
              <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                {heading}
                {children}
              </ScrollView>
              <View className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
                {dismissButton}
                {confirmButton}
              </View>
              {disabled && (
                <Text className="px-6 pb-4 text-right text-xs text-muted-foreground">{confirmDisabledReason}</Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="close"
                onPress={close}
                className="absolute right-3 top-3 rounded-full bg-black/45 p-2 active:opacity-70"
              >
                <X size={16} color={COLORS.foreground} strokeWidth={2} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

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
          <Animated.View entering={SlideInDown.duration(240)}>
            {/* Same as the desktop card: the ground cannot live on the animated
                view, or the sheet is transparent on web. */}
            <View
              className="rounded-t-[20px] border-t border-border bg-popover px-6 pt-5"
              style={{ paddingBottom: insets.bottom + 24 }}
            >
              <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
              {heading}
              {children}
              <View className="mt-[18px] gap-2">
                {confirmButton}
                {disabled && (
                  <Text className="text-center text-xs text-muted-foreground">{confirmDisabledReason}</Text>
                )}
                {dismissButton}
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
