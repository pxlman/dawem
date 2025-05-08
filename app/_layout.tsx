// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppStateContext';
import Colors from '@/constants/Colors';
import { StyleSheet, Platform, StatusBar as MStatusBar } from 'react-native';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider>
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <StatusBar
                    animated={true}
                    backgroundColor={Colors.primary}
                    style='dark'
                    hidden={false}
                    />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                            name="add-habit"
                            options={{
                                presentation: 'modal',
                                title: 'Add/Edit Habit',
                                headerStyle: { backgroundColor: Colors.surface },
                                headerTintColor: Colors.text,
                                headerTitleStyle: { fontWeight: 'bold' },
                                headerShown: true,
                            }}
                        />
                        <Stack.Screen
                            name="all-habits"
                            options={{
                                presentation: 'modal',
                                title: 'All Habits',
                                headerStyle: { backgroundColor: Colors.surface },
                                headerTintColor: Colors.text,
                                headerTitleStyle: { fontWeight: 'bold' },
                                headerShown: true,
                            }}
                        />
                        <Stack.Screen
                            name="settings"
                            options={{
                                presentation: 'modal',
                                title: 'Settings',
                                headerStyle: { backgroundColor: Colors.surface },
                                headerTintColor: Colors.text,
                                headerTitleStyle: { fontWeight: 'bold' },
                                headerShown: true,
                            }}
                        />
                    </Stack>
                </SafeAreaView>
                </SafeAreaProvider>
            </AppProvider>
        </GestureHandlerRootView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        // paddingTop: Platform.OS === 'android' ? MStatusBar.currentHeight : 0,
    }
})