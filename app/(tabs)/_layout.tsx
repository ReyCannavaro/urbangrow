import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiStatusBanner } from '@/components/system/ApiStatusBanner';
import { StaticTabBarIcon } from '../../components/StaticTabBarIcon';

export default function TabLayout() {
  return (
    <View style={styles.safeArea}>
      <ApiStatusBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
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
    backgroundColor: '#fff',
  },
  tabBar: {
    height: 72,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
