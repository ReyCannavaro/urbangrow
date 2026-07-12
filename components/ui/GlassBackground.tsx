import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function GlassBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#fbfffd', '#f1fbf6', '#e9f5ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(24,168,117,0.24)', 'rgba(24,168,117,0.08)', 'rgba(24,168,117,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.band, styles.bandOne]}
      />
      <LinearGradient
        colors={['rgba(47,125,246,0)', 'rgba(47,125,246,0.16)', 'rgba(24,168,117,0.10)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.band, styles.bandTwo]}
      />
      <View style={styles.veil} />
      <View style={styles.scanline} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    width: '150%',
    height: 150,
    left: '-25%',
    borderRadius: 42,
  },
  bandOne: {
    top: 90,
    transform: [{ rotate: '-18deg' }],
  },
  bandTwo: {
    top: 420,
    transform: [{ rotate: '14deg' }],
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  scanline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(10,95,69,0.04)',
  },
});
