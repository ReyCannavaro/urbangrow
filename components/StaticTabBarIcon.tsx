import React from 'react';
import { View, StyleSheet } from 'react-native';
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

interface StaticTabBarIconProps {
  name: string;
  focused: boolean;
}

export function StaticTabBarIcon({ name, focused }: StaticTabBarIconProps) {
  const activeColor = name === 'chatbot' ? '#6366f1' : '#1f2937';
  const inactiveColor = '#94a3b8';

  const iconWrapperStyle = focused ? styles.iconWrapperActive : styles.iconWrapperInactive;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapperBase, iconWrapperStyle]}>
        {getIcon(
            name,
            focused
              ? (name === 'chatbot' ? '#6366f1' : activeColor)
              : inactiveColor
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
    marginBottom: -50,
  },
  iconWrapperBase: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#e5e7eb',
  },
  iconWrapperInactive: {
    backgroundColor: 'transparent',
  },
});