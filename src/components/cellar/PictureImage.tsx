import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

/**
 * A picture in the box its own shape asks for, tappable when it can be opened.
 *
 * `contain` inside a box that is clamped (`boxAspect`), so a tall screenshot is
 * shown whole in a shorter box rather than cropped — the point of attaching a
 * screenshot is to read all of it.
 */
export function PictureImage({
  uri,
  aspect,
  onPress,
  label,
  width = '100%',
}: {
  uri: string;
  aspect: number;
  onPress?: () => void;
  label: string;
  width?: number | `${number}%`;
}) {
  const image = (
    <View className="overflow-hidden rounded-xl bg-secondary" style={{ width, aspectRatio: aspect }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel={label} />
    </View>
  );
  if (!onPress) return image;

  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={label} onPress={onPress} className="active:opacity-80">
      {image}
    </Pressable>
  );
}
