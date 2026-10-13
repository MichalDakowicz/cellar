import { Text, View, useWindowDimensions } from 'react-native';

const ROWS = [
  ['archive needs an undo', 'idea · 3h ago'],
  ['streak pill clips on small phones', 'glitch · yesterday'],
  ['rename shelves to rooms?', 'question · 2d ago'],
];

/** Drawn desktop from Screen.dc.html; sample mode only, never a live stream. */
export function SampleDesktopScreen() {
  const window = useWindowDimensions();
  const scale = Math.min(window.width / 844, window.height / 390);
  return <View accessibilityLabel="sample desktop screen" className="flex-1 items-center justify-center" style={{ backgroundColor: '#15181d' }}>
    <View style={{ width: 844, height: 390, transform: [{ scale }] }}>
      <View className="absolute overflow-hidden rounded-lg border" style={{ left: 64, top: 22, width: 560, height: 316, borderColor: '#2a2d33', backgroundColor: '#0a0a0a' }}>
        <View className="h-[26px] flex-row items-center gap-1.5 px-2.5" style={{ backgroundColor: '#1b1d22' }}>
          {[0, 1, 2].map((i) => <View key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: '#3a3d44' }} />)}
          <Text className="ml-3.5 rounded-full bg-background px-2.5 font-mono text-[10px] text-muted-foreground">localhost:8081/inbox</Text>
        </View>
        <View className="flex-1 flex-row">
          <View className="w-[116px] gap-2 px-2.5 py-3" style={{ backgroundColor: '#0f0f10' }}><Text className="font-sans text-xs font-bold text-foreground">cellar</Text>{['dump', 'projects', 'inbox', 'stats', 'desk'].map((label) => <Text key={label} className={`font-sans text-[10px] ${label === 'inbox' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</Text>)}</View>
          <View className="flex-1 gap-2 px-[18px] py-3.5"><Text className="font-sans text-[15px] font-bold text-foreground">inbox</Text><Text className="font-sans text-[8px] font-semibold uppercase tracking-widest text-muted-foreground">to file · 4</Text>{ROWS.map(([title, detail], i) => <View key={title} className={`h-10 justify-center gap-px rounded-lg px-2.5 ${i === 0 ? 'bg-secondary' : 'bg-row'}`}><Text className="font-sans text-[10px] font-semibold text-foreground">{title}</Text><Text className="font-sans text-[8px] text-muted-foreground">{detail}</Text></View>)}</View>
        </View>
      </View>
      <View className="absolute gap-2 overflow-hidden rounded-lg border p-3" style={{ left: 540, top: 136, width: 250, height: 168, borderColor: '#2a2d33', backgroundColor: '#0b0c0e' }}>
        <Text className="font-mono text-[9px] text-muted-foreground">cellar — npm run start</Text><Text className="font-mono text-[10px] text-green-500">› Metro waiting on :8081</Text><Text className="font-mono text-[10px] text-foreground">› Web bundled 1048ms</Text><Text className="font-mono text-[10px] text-muted-foreground">› Logs for your project appear below.</Text><Text className="font-mono text-[10px] text-foreground">▌</Text>
      </View>
    </View>
  </View>;
}
