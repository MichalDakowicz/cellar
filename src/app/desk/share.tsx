import { useRouter, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { DeskSheet } from '@/components/desk/DeskSheet';
import { ShareBody } from '@/components/desk/later/ShareBody';
import { useDeskShare } from '@/features/desk/useDeskShare';

/**
 * File it into cellar (docs/desk/screens.md, `PhoneShare.dc.html`): a sheet
 * over what you were looking at. Filing is real; arriving here from another
 * app's share sheet is W17.
 */
export default function ShareSheet() {
  const router = useRouter();
  const share = useDeskShare();
  const close = () => (router.canGoBack() ? router.back() : router.navigate('/desk' as Href));

  return (
    <DeskSheet
      onClose={close}
      height="76%"
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={share.label}
          accessibilityState={{ disabled: !share.canFile }}
          disabled={!share.canFile}
          onPress={share.file}
          className={`h-[52px] items-center justify-center rounded-full bg-foreground active:opacity-80 ${share.canFile ? '' : 'opacity-40'}`}
        >
          <Text className="text-base font-semibold text-background">{share.label}</Text>
        </Pressable>
      }
    >
      <ShareBody {...share} onCancel={close} />
    </DeskSheet>
  );
}
