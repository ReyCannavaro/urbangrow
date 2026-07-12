import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '@/constants/theme';

const getIcon = (name: string, color: string) => {
  const iconSize = 24;

  switch (name) {
    case 'home':
      return <Feather name="home" size={iconSize} color={color} />;
    case 'chatbot':
      return <Feather name="message-circle" size={iconSize} color={color} />;
    case 'control':
      return <Feather name="sliders" size={iconSize} color={color} />;
    case 'notifications':
      return <Feather name="bell" size={iconSize} color={color} />;
    default:
      return null;
  }
};

interface AnimatedTabBarIconProps {
  name: string;
  focused: boolean;
}

export function AnimatedTabBarIcon({ name, focused }: AnimatedTabBarIconProps) {
  const progress = useSharedValue(0);

  const animatedBgStyle = useAnimatedStyle(() => {
      progress.value = withTiming(focused ? 1 : 0, { duration: 250 });
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', AppTheme.color.primarySoft]
    );
    return { backgroundColor };
  });

  const activeColor = AppTheme.color.primaryDark;
  const inactiveColor = AppTheme.color.textSubtle;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrapper, animatedBgStyle]}>
        {getIcon(
            name,
            focused ? activeColor : inactiveColor
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
