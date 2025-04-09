// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';

const APP_STATE_KEY = 'HabitTrackerAppState';

export const saveState = async (state: AppState): Promise<void> => {
  try {
    const jsonState = JSON.stringify(state);
    await AsyncStorage.setItem(APP_STATE_KEY, jsonState);
    // console.log('State saved successfully.'); // Optional logging
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

export const loadState = async (): Promise<AppState | null> => {
  try {
    const jsonState = await AsyncStorage.getItem(APP_STATE_KEY);
    if (jsonState !== null) {
      // console.log('State loaded successfully.'); // Optional logging
      return JSON.parse(jsonState) as AppState;
    }
    return null;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
};