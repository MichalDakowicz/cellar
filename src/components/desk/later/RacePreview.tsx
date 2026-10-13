import { Text, View } from 'react-native';

/** The two static cart previews from PhoneRace; neither is a live site. */
export function RacePreview({ drawer }: { drawer: boolean }) {
  return (
    <View accessibilityLabel="sample cart preview" className="h-[300px] overflow-hidden rounded-xl border border-border bg-white p-3">
      <View className="h-6 w-1/2 rounded-md bg-gray-200" />
      <View className="mt-3 flex-row gap-2">{[0, 1].map((column) => <View key={column} className="flex-1 gap-2">{[0, 1].map((row) => <View key={row} className="h-[88px] rounded-lg bg-gray-100" />)}</View>)}</View>
      <View className="absolute inset-0 bg-black/35" />
      <View className={`absolute bottom-0 right-0 gap-2 bg-white p-3.5 ${drawer ? 'top-0 w-[78%]' : 'left-0 h-[190px] rounded-t-2xl'}`}>
        {!drawer && <View className="h-1 w-[30px] self-center rounded-full bg-gray-300" />}
        <Text className="font-sans text-[13px] font-bold text-gray-900">your cart · 3</Text>
        <View className="h-[26px] rounded-md bg-gray-100" /><View className="h-[26px] rounded-md bg-gray-100" />
        {drawer && <View className="h-[30px] rounded-md bg-gray-100" />}
        <View className={`mt-auto gap-1.5 ${drawer ? '' : 'flex-row items-center justify-between'}`}><Text className="font-sans text-[13px] font-bold text-gray-900">[TOTAL]</Text><View className={`h-[30px] rounded-full bg-gray-900 ${drawer ? '' : 'w-[110px]'}`} /></View>
      </View>
    </View>
  );
}
