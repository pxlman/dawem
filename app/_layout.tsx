// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppStateContext';
import Colors from '../constants/Colors';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider>
                <SafeAreaProvider>
                    <StatusBar style="light" backgroundColor={Colors.surface} />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                            name="add-edit-habit"
                            options={{
                                presentation: 'modal',
                                title: 'Add/Edit Habit',
                                headerStyle: { backgroundColor: Colors.surface },
                                headerTintColor: Colors.text,
                                headerTitleStyle: { fontWeight: 'bold' },
                                headerShown: true,
                            }}
                        />
                    </Stack>
                </SafeAreaProvider>
            </AppProvider>
        </GestureHandlerRootView>
    );
}