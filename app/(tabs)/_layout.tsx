// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ route }: { route: { name: string } }) => ({
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.lightGrey },
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.surface,
                headerTitleStyle: { fontWeight: 'bold' },
                tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;
                    if (route.name === 'index') iconName = focused ? 'list-circle' : 'list-circle-outline';
                    else if (route.name === 'stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    else if (route.name === 'settings') iconName = focused ? 'settings' : 'settings-outline';
                    else iconName = 'help-circle-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tabs.Screen name="index" options={{ title: 'Habits' }} />
            <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
    );
}