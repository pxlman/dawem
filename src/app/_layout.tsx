// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useAppState } from '../context/AppStateContext';
import {getColors}  from '@/constants/Colors';
import { StyleSheet, Platform, StatusBar as MStatusBar } from 'react-native';
import '../utils/i18n'; // Ensure translations are loaded
import { useTranslation } from 'react-i18next';
let Colors = getColors()

export default function RootLayout() {
    // const {theme} = useAppState();
    // Colors = getColors('fresh');
    const { t } = useTranslation();
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider>
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <StatusBar
                    animated={true}
                    backgroundColor='transparent'
                    style='light'
                    hidden={false}
                    />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                            name="add-edit-habit"
                            options={{
                                presentation: 'modal',
                                title: t('habits.addEditScreen.addScreenTitle'),
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
                                title: t('habits.allHabits.title'),
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
                                title: t('settings.title'),
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