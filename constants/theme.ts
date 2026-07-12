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
    background: '#07120f',
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
    canvas: '#07120f',
    canvasAlt: '#0d261d',
    surface: '#f7fffb',
    surfaceMuted: 'rgba(247,255,251,0.48)',
    surfaceStrong: '#07120f',
    line: 'rgba(255,255,255,0.28)',
    lineStrong: 'rgba(255,255,255,0.42)',
    glassLine: 'rgba(255,255,255,0.44)',
    glassLineSoft: 'rgba(255,255,255,0.20)',
    text: '#10201a',
    textMuted: '#416052',
    textSubtle: '#6d877b',
    textOnGlass: '#f2fff9',
    textOnGlassMuted: '#bed5cb',
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
    neutralSoft: 'rgba(247,255,251,0.22)',
    white: '#ffffff',
  },
  radius: {
    card: 18,
    panel: 22,
    input: 14,
    pill: 999,
  },
  shadow: {
    color: '#00130d',
    offset: { width: 0, height: 16 },
    opacity: 0.18,
    radius: 28,
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
