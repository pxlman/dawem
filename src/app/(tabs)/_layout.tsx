// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {getColors} from '../../constants/Colors';
import { useAppState } from '@/context/AppStateContext';
import '../../utils/i18n';
import { useTranslation } from 'react-i18next';
let Colors = getColors()

export default function TabLayout() {
    const {settings} = useAppState();
    const { t } = useTranslation();
    Colors =  getColors(settings.theme)
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
                headerTintColor: Colors.primary,
                // --- End Updates ---
                headerTitleStyle: { fontWeight: 'bold', fontSize: 26 },
                tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;
                    if (route.name === 'index') iconName = focused ? 'checkbox' : 'checkbox-outline';
                    else if (route.name === 'stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    else if (route.name === 'goals') iconName = focused ? 'golf' : 'golf-outline';
                    // else if (route.name === 'settings') iconName = focused ? 'settings' : 'settings-outline';
                    else iconName = 'help-circle-outline';
                    // color is passed correctly based on tabBarActive/InactiveTintColor
                    return <Ionicons name={iconName} size={size} color={Colors.primary} />;
                },
            })}
        >
            <Tabs.Screen name="index" options={{ title: t('tabs.habits') }} />
            <Tabs.Screen name="stats" options={{ title: t('tabs.stats') }} />
            <Tabs.Screen name="goals" options={{ title: t('tabs.goals') }} />
            {/* <Tabs.Screen name="settings" options={{ title: 'Settings' }} /> */}
        </Tabs>
    );
}