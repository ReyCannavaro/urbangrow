import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { AppTheme } from '@/constants/theme';

interface GradientIconProps {
  name: 'home' | 'robot' | 'hexagon' | 'bell' ;
  focused: boolean;
  label: string;
}

const getIconComponent = (name: GradientIconProps['name'], color: string) => {
  if (name === 'robot') {
    return <FontAwesome5 name="robot" size={24} color={color} />;
  } else if (name === 'hexagon') {
    return <FontAwesome5 name="cog" size={24} color={color} />;
  } else if (name === 'home') {
    return <Feather name="home" size={24} color={color} />;
  } else if (name === 'bell') {
    return <Feather name="bell" size={24} color={color} />;
  }
  return null;
};

export default function GradientIcon({ name, focused, label }: GradientIconProps) {
  const iconColor = focused ? AppTheme.color.primaryDark : AppTheme.color.textSubtle;

  return (
    <View style={styles.container}>
      <View style={[styles.iconShell, focused && styles.iconShellActive]}>
        {getIconComponent(name, iconColor)}
      </View>
      
      <Text style={[styles.label, { color: focused ? AppTheme.color.primaryDark : AppTheme.color.textSubtle }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  iconShell: {
    width: 34,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShellActive: {
    backgroundColor: AppTheme.color.primarySoft,
  },
});
