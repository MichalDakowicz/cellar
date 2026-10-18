import { Link, type Href } from 'expo-router';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import { plainNavigation } from '@/lib/navigation';

/** Native press behavior, with a real link and browser click semantics on web. */
export function RoutePressable({ href, onPress, ...props }: PressableProps & { href?: Href; className?: string }) {
  if (Platform.OS !== 'web' || !href || props.disabled) return <Pressable {...props} onPress={onPress} />;
  return <Link href={href} asChild onPress={(event) => {
    if (onPress && plainNavigation(event)) { onPress(event as GestureResponderEvent); event.preventDefault(); }
  }}><Pressable {...props} /></Link>;
}
