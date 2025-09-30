import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { AntDesign, Feather, FontAwesome5 } from '@expo/vector-icons';

const getIcon = (name: string, color: string) => {
  switch (name) {
    case 'home':
      return <Feather name="home" size={30} color={color} />;
    case 'chatbot':
      return <FontAwesome5 name="robot" size={30} color={color} />; 
    case 'control':
      return <AntDesign name="setting" size={30} color={color} />; 
    case 'notifications':
      return <Feather name="bell" size={30} color={color} />;
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
      ['transparent', '#e5e7eb']
    );
    return { backgroundColor };
  });

  const activeColor = name === 'chatbot' ? '#6366f1' : '#1f2937';
  const inactiveColor = '#94a3b8';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrapper, animatedBgStyle]}>
        {getIcon(
            name,
            name === 'chatbot'
              ? (focused ? '#6366f1' : inactiveColor)
              : (focused ? activeColor : inactiveColor)
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
    width: 65, 
    height: 65,
    borderRadius: 32.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});