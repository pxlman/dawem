// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// *** Import StatusBar from expo-status-bar ***
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppStateContext';
import Colors from '../constants/Colors';

export default function RootLayout() {
    return (
        <AppProvider>
            <SafeAreaProvider>
                {/* *** Set style to "light" for light text/icons *** */}
                <StatusBar style="light" backgroundColor={Colors.surface} />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                        name="add-edit-habit"
                        options={{
                            presentation: 'modal',
                            title: 'Add/Edit Habit',
                            // --- Update Header Colors ---
                            headerStyle: { backgroundColor: Colors.surface },
                            headerTintColor: Colors.text, // Light text color
                            // --- End Update ---
                            headerTitleStyle: { fontWeight: 'bold' },
                            headerShown: true,
                        }}
                    />
                </Stack>
            </SafeAreaProvider>
        </AppProvider>
    );
}