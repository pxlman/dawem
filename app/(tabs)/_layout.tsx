// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ route }:{route:{name:string}}) => ({
                // --- Update Tab Colors ---
                tabBarActiveTintColor: Colors.primary, // Use updated primary
                tabBarInactiveTintColor: Colors.textSecondary, // Use dark theme secondary text
                tabBarStyle: {
                    backgroundColor: Colors.surface, // Dark surface for tab bar
                    borderTopColor: Colors.grey, // Use new grey for border
                },
                // --- Update Default Header Colors ---
                headerStyle: { backgroundColor: Colors.surface }, // Dark surface for headers
                headerTintColor: Colors.text, // Light text color for headers
                // --- End Updates ---
                headerTitleStyle: { fontWeight: 'bold' },
                tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;
                    if (route.name === 'index') iconName = focused ? 'checkbox' : 'checkbox-outline';
                    else if (route.name === 'stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    // else if (route.name === 'settings') iconName = focused ? 'settings' : 'settings-outline';
                    else iconName = 'help-circle-outline';
                    // color is passed correctly based on tabBarActive/InactiveTintColor
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tabs.Screen name="index" options={{ title: 'Habits' }} />
            <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
            {/* <Tabs.Screen name="settings" options={{ title: 'Settings' }} /> */}
        </Tabs>
    );
}