import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

const GRADIENT_COLORS = ['#3780F2', '#2AA1AA', '#1CC162'];

interface GradientIconProps {
  name: 'home' | 'robot' | 'hexagon' | 'bell' ;
  focused: boolean;
  label: string;
}

const getIconComponent = (name: GradientIconProps['name'], color: string, focused: boolean) => {
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
  const useGradient = focused && (name === 'robot' || name === 'hexagon');

  return (
    <View style={styles.container}>
      {useGradient ? (
        <LinearGradient
          colors={['#3780F2', '#2AA1AA', '#1CC162']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientMask}
        >
          {getIconComponent(name, 'white', focused)}
        </LinearGradient>
      ) : (
        getIconComponent(name, focused ? '#3780F2' : '#a3a3a3', focused)
      )}
      
      <Text style={[styles.label, { color: focused ? '#3780F2' : '#a3a3a3' }]}>{label}</Text>
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
  gradientMask: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});