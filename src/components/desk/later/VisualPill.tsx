import { Text, View } from 'react-native';

export function Pill({ label, primary = false }: { label: string; primary?: boolean }) {
  return <View accessibilityLabel={`${label} · visual only`} className={`h-10 justify-center rounded-full border px-4 ${primary ? 'border-primary bg-primary' : 'border-border'}`}><Text className={`font-sans text-sm font-semibold ${primary ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text></View>;
}
