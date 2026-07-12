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
    background: '#eef4f0',
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
    canvas: '#eef4f0',
    canvasAlt: '#e7f0ea',
    surface: '#fbfdfb',
    surfaceMuted: '#f5faf7',
    surfaceStrong: '#10201a',
    line: '#d8e6de',
    lineStrong: '#c2d4ca',
    text: '#10201a',
    textMuted: '#64756d',
    textSubtle: '#87958e',
    primary: '#0f7f5c',
    primaryDark: '#0a5f45',
    primarySoft: '#dff2e9',
    primaryMist: '#eff9f4',
    info: '#2563eb',
    infoSoft: '#dbeafe',
    warning: '#c98011',
    warningSoft: '#fff4d6',
    danger: '#c24135',
    dangerSoft: '#fee6e2',
    neutral: '#52615a',
    neutralSoft: '#edf3ef',
    white: '#ffffff',
  },
  radius: {
    card: 18,
    panel: 22,
    input: 14,
    pill: 999,
  },
  shadow: {
    color: '#315446',
    offset: { width: 0, height: 12 },
    opacity: 0.08,
    radius: 24,
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
