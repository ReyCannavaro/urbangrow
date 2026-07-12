import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

interface StaticTabBarIconProps {
  name: string;
  focused: boolean;
}

export function StaticTabBarIcon({ name, focused }: StaticTabBarIconProps) {
  const activeColor = '#2563eb';
  const inactiveColor = '#94a3b8';

  const iconWrapperStyle = focused ? styles.iconWrapperActive : styles.iconWrapperInactive;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapperBase, iconWrapperStyle]}>
        {getIcon(
            name,
            focused ? activeColor : inactiveColor
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperBase: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#dbeafe',
  },
  iconWrapperInactive: {
    backgroundColor: 'transparent',
  },
});
