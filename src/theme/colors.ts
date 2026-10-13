import { vars } from 'nativewind';
import { dark, light } from '@/lib/designTokens';
export { COLORS } from '@/lib/designTokens';
export const themeVars = { dark: vars(dark), light: vars(light) };
export const rawThemeVars = { dark, light };
export type ResolvedTheme = keyof typeof themeVars;
