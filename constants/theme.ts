/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0f7f5c';
const tintColorDark = '#e8fff4';

export const Colors = {
  light: {
    text: '#10201a',
    background: '#f4fbf7',
    tint: tintColorLight,
    icon: '#66756e',
    tabIconDefault: '#7c8d85',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#eef8f3',
    background: '#101815',
    tint: tintColorDark,
    icon: '#a7b7af',
    tabIconDefault: '#81918a',
    tabIconSelected: tintColorDark,
  },
};

export const AppTheme = {
  color: {
    canvas: '#f4fbf7',
    canvasAlt: '#e8f6f0',
    surface: '#ffffff',
    surfaceMuted: 'rgba(255,255,255,0.62)',
    surfaceStrong: '#0a5f45',
    line: 'rgba(10,95,69,0.14)',
    lineStrong: 'rgba(10,95,69,0.24)',
    glassLine: 'rgba(255,255,255,0.86)',
    glassLineSoft: 'rgba(10,95,69,0.12)',
    text: '#10201a',
    textMuted: '#416052',
    textSubtle: '#6d877b',
    textOnGlass: '#10201a',
    textOnGlassMuted: '#577367',
    primary: '#18a875',
    primaryDark: '#0a5f45',
    primarySoft: 'rgba(166,255,216,0.34)',
    primaryMist: 'rgba(166,255,216,0.18)',
    info: '#2f7df6',
    infoSoft: 'rgba(122,181,255,0.26)',
    warning: '#c98011',
    warningSoft: 'rgba(255,218,137,0.28)',
    danger: '#c24135',
    dangerSoft: 'rgba(255,159,144,0.26)',
    neutral: '#6b8177',
    neutralSoft: 'rgba(255,255,255,0.52)',
    white: '#ffffff',
  },
  radius: {
    card: 18,
    panel: 22,
    input: 14,
    pill: 999,
  },
  shadow: {
    color: '#7fb19b',
    offset: { width: 0, height: 14 },
    opacity: 0.12,
    radius: 26,
    elevation: 6,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
