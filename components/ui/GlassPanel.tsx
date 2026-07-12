import { BlurTint, BlurView } from 'expo-blur';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppTheme } from '@/constants/theme';

interface GlassPanelProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'strong' | 'thin' | 'dark';
}

export function GlassPanel({
  children,
  intensity = 52,
  tint = 'light',
  style,
  contentStyle,
  variant = 'default',
}: GlassPanelProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      experimentalBlurMethod="dimezisBlurView"
      style={[styles.panel, variantStyles[variant], style]}
    >
      <View pointerEvents="none" style={[styles.tintLayer, tintLayers[variant]]} />
      <View pointerEvents="none" style={styles.topHighlight} />
      <View style={contentStyle}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppTheme.color.glassLine,
    shadowColor: AppTheme.shadow.color,
    shadowOffset: AppTheme.shadow.offset,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: 'absolute',
    left: 1,
    right: 1,
    top: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: 'rgba(247,255,251,0.12)',
  },
  strong: {
    backgroundColor: 'rgba(247,255,251,0.20)',
  },
  thin: {
    backgroundColor: 'rgba(247,255,251,0.08)',
  },
  dark: {
    backgroundColor: 'rgba(7,18,15,0.38)',
    borderColor: 'rgba(221,255,239,0.22)',
  },
});

const tintLayers = StyleSheet.create({
  default: {
    backgroundColor: 'rgba(247,255,251,0.58)',
  },
  strong: {
    backgroundColor: 'rgba(247,255,251,0.72)',
  },
  thin: {
    backgroundColor: 'rgba(247,255,251,0.42)',
  },
  dark: {
    backgroundColor: 'rgba(7,18,15,0.46)',
  },
});
