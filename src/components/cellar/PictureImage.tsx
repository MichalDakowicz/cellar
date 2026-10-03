import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

/**
 * A picture in the box its own shape asks for, tappable when it can be opened.
 *
 * The shape is the one the person cropped it to and is never changed here.
 * `maxHeight` only stops a very tall one from running down the page: the box
 * stops growing and the picture, `contain`ed, shrinks inside it to stay whole.
 */
export function PictureImage({
  uri,
  aspect,
  onPress,
  label,
  width = '100%',
  maxHeight,
}: {
  uri: string;
  aspect: number;
  onPress?: () => void;
  label: string;
  width?: number | `${number}%`;
  maxHeight?: number;
}) {
  const image = (
    <View className="overflow-hidden rounded-xl bg-secondary" style={{ width, aspectRatio: aspect, maxHeight }}>
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
