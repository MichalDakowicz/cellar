import type { MouseEvent } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { plainNavigation } from '@/lib/navigation';

/** A text surface can contain real links, so it must not wrap them in another anchor. */
export function EntryPressable({ href, onPress, ...props }: PressableProps & { href: string; className?: string }) {
  const nested = (event: MouseEvent<HTMLElement>) => (event.target as Element).closest('a,button');
  return <Pressable {...props} accessibilityRole="link" onPress={(event) => {
    const mouse = event as unknown as MouseEvent<HTMLElement>;
    if (nested(mouse)) return;
    if (plainNavigation(mouse)) onPress?.(event);
    else if (mouse.button === 0) window.open(href, '_blank', 'noopener,noreferrer');
  }} {...{
    onMouseDown: (event: MouseEvent<HTMLElement>) => { if (event.button === 1 && !nested(event)) event.preventDefault(); },
    onAuxClick: (event: MouseEvent<HTMLElement>) => {
      if (event.button !== 1 || nested(event)) return;
      event.preventDefault(); window.open(href, '_blank', 'noopener,noreferrer');
    },
  }} />;
}
