// context/AppStateContext.tsx
import React, { createContext, useReducer, useEffect, useContext, useState, Dispatch, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import ActivityIndicator and View from react-native
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { appReducer, initialState } from './appReducer'; // Ensure initialState is exported/defined correctly
import { saveState, loadState } from '../utils/storage';
import { AppState, AppAction } from '../types';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect'; // Adjust path if needed

// Context definitions
const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

interface AppProviderProps { children: ReactNode; }

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    // console.log("[AppProvider] Initializing..."); // Optional log

    const [state, dispatch] = useReducer<React.Reducer<AppState, AppAction>>(appReducer, initialState);
    const [isLoaded, setIsLoaded] = useState(false);

    // console.log("[AppProvider] Initial state from useReducer:", state); // Optional log

    // Load state effect
    useEffect(() => {
        let isMounted = true;
        const bootstrapAsync = async () => {
            let loadedState: AppState | null = null;
            try {
                // console.log("!!! Clearing AsyncStorage for DEBUG !!!"); // Keep commented out unless debugging storage
                // await AsyncStorage.clear();
                // console.log("AsyncStorage Cleared.");
                loadedState = await loadState();
                // console.log("[AppProvider] Loaded state from storage:", loadedState); // Optional log
            } catch (e) { console.error('Failed during bootstrap:', e); }
            finally {
                if (isMounted) {
                    if (loadedState) {
                        // Dispatch LOAD_STATE which should handle merging/defaults
                        dispatch({ type: 'LOAD_STATE', payload: loadedState });
                    } else {
                        // No saved state, initialState from useReducer is already set
                         console.log("[AppProvider] No state loaded, using initial state.");
                    }
                    setIsLoaded(true);
                    // console.log("[AppProvider] isLoaded set to true."); // Optional log
                }
            }
        };
        bootstrapAsync();
        return () => { isMounted = false; };
    }, []);

    // Save state effect
    useDebouncedEffect(() => {
        if(isLoaded) { saveState(state); }
    }, [state, isLoaded], 500);

    // Loading Indicator
    if (!isLoaded) {
        // console.log("[AppProvider] Rendering loading indicator (isLoaded=false)."); // Optional log
        // --- FIX: Replaced comment with actual JSX ---
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
        // --- End FIX ---
    }

    // console.log("[AppProvider] Providing state:", state); // Optional log
    // console.log("[AppProvider] Providing dispatch function."); // Optional log

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                {children}
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

// Hooks
export const useAppState = (): AppState => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        console.error("!!! useAppState Error: context is undefined. Component likely rendered outside AppProvider. !!!");
        throw new Error('useAppState must be used within an AppProvider');
    }
    return context;
};
export const useAppDispatch = (): Dispatch<AppAction> => {
    const context = useContext(AppDispatchContext);
    if (context === undefined) {
         console.error("!!! useAppDispatch Error: context is undefined. Component likely rendered outside AppProvider. !!!");
        throw new Error('useAppDispatch must be used within an AppProvider');
    }
    return context;
};

// Styles for loading indicator
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff', // Or your app's background color
    }
});