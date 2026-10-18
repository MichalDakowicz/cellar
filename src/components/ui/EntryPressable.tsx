import { Pressable, type PressableProps } from 'react-native';

export function EntryPressable({ href: _href, ...props }: PressableProps & { href: string; className?: string }) {
  return <Pressable {...props} />;
}
