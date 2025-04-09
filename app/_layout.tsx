// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppStateContext'; // Adjust path if needed
import Colors from '../constants/Colors'; // Adjust path if needed

export default function RootLayout() {
    // Font loading can be added here if needed

    return (
        <AppProvider> {/* Ensure AppProvider is the top-level wrapper */}
            <SafeAreaProvider>
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                        name="add-edit-habit"
                        options={{
                            presentation: 'modal',
                            title: 'Add/Edit Habit',
                            headerStyle: { backgroundColor: Colors.primary },
                            headerTintColor: Colors.surface,
                            headerTitleStyle: { fontWeight: 'bold' },
                            headerShown: true,
                        }}
                    />
                </Stack>
            </SafeAreaProvider>
        </AppProvider>
    );
}