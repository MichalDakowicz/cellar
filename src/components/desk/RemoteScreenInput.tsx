import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { ScreenInput } from '@/lib/deskRemote';
import { screenPoint, screenScroll } from '@/lib/deskRemote';
import type { ScreenMode } from '@/lib/deskScreen';
import { useDictation } from '@/features/desk/useDictation';
import { COLORS } from '@/theme/colors';

export function RemoteScreenInput({ mode, aspect, send }: { mode: ScreenMode; aspect: number; send: (input: ScreenInput) => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const start = useRef({ x: 0, y: 0, at: 0, fingers: 1 });
  const [draft, setDraft] = useState(''); const [ctrl, setCtrl] = useState(false); const [alt, setAlt] = useState(false);
  const voice = useDictation((text) => setDraft((old) => old ? old + ' ' + text : text));
  const button = (label: string, act: () => void) => <Pressable key={label} accessibilityRole="button" onPress={act} style={{ padding: 10, borderRadius: 20, backgroundColor: COLORS.islandFill }}><Text style={{ color: COLORS.foreground }}>{label}</Text></Pressable>;
  return <View style={{ position: 'absolute', inset: 0 }} pointerEvents="box-none">
    {(mode === 'touch' || mode === 'pad') && <View style={{ flex: 1 }} onLayout={(e) => setSize(e.nativeEvent.layout)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => { start.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, at: Date.now(), fingers: e.nativeEvent.touches.length }; }}
      onResponderMove={(e) => { start.current.fingers = Math.max(start.current.fingers, e.nativeEvent.touches.length); }}
      onResponderRelease={(e) => {
        const s = start.current; const x = e.nativeEvent.locationX; const y = e.nativeEvent.locationY;
        if (s.fingers > 1) send({ kind: 'scroll', amount: screenScroll(s.y, y) });
        else if (mode === 'pad' && Math.hypot(x - s.x, y - s.y) > 5) send({ kind: 'move', x: (x - s.x) / size.width, y: (y - s.y) / size.height });
        else { const p = screenPoint(x, y, size.width, size.height, aspect); if (p) send(mode === 'pad' ? { kind: 'click', right: Date.now() - s.at > 600 } : { kind: 'tap', ...p, right: Date.now() - s.at > 600 }); }
      }} />}
    {(mode === 'keys' || mode === 'voice') && <View style={{ position: 'absolute', bottom: 76, left: 24, right: 24, gap: 6, padding: 10, backgroundColor: COLORS.islandFill, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>{button(ctrl ? 'ctrl ✓' : 'ctrl', () => setCtrl(!ctrl))}{button(alt ? 'alt ✓' : 'alt', () => setAlt(!alt))}{['Tab', 'Enter', 'Backspace', 'Escape'].map((key) => button(key, () => send({ kind: 'key', key, ctrl, alt })))}</View>
      <TextInput value={draft} onChangeText={setDraft} placeholder="Text for the focused PC field" placeholderTextColor={COLORS.muted} style={{ color: COLORS.foreground, padding: 8 }} autoFocus={mode === 'keys'} />
      <View style={{ flexDirection: 'row', gap: 6 }}>{mode === 'voice' && button(voice.listening ? 'stop mic' : 'dictate', () => void voice.toggle())}{button('type on PC', () => { if (draft) { send({ kind: 'text', text: draft.slice(0, 2000) }); setDraft(''); } })}{button('send shortcut', () => { if (/^[a-z0-9]$/i.test(draft)) { send({ kind: 'key', key: draft, ctrl, alt }); setDraft(''); } })}</View>
      {!!voice.error && <Text style={{ color: COLORS.foreground }}>{voice.error}</Text>}
    </View>}
  </View>;
}
