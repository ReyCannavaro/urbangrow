import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiStatusBanner } from '@/components/system/ApiStatusBanner';
import { AppTheme } from '@/constants/theme';
import { StaticTabBarIcon } from '../../components/StaticTabBarIcon';

export default function TabLayout() {
  return (
    <View style={styles.safeArea}>
      <ApiStatusBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: AppTheme.color.primarySoft,
          tabBarInactiveTintColor: '#9fb1a8',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <BlurView
              intensity={82}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <StaticTabBarIcon name="home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="chatbot"
          options={{
            title: 'Chatbot',
            tabBarIcon: ({ focused }) => (
              <StaticTabBarIcon name="chatbot" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Control',
            tabBarIcon: ({ focused }) => (
              <StaticTabBarIcon name="control" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ focused }) => (
              <StaticTabBarIcon name="notifications" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.color.canvas,
  },
  tabBar: {
    height: 76,
    backgroundColor: 'rgba(8, 24, 18, 0.36)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: AppTheme.radius.panel,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: AppTheme.shadow.color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
  },
  tabBarItem: {
    borderRadius: 18,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 0,
  },
});
