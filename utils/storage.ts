// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';

const APP_STATE_KEY = 'HabitTrackerAppState';

export const saveState = async (state: AppState): Promise<void> => {
  try {
    // Create a clean version of the state for storage
    const stateToSave = {
      habits: state.habits || [],
      goals: state.goals || [], // Ensure goals are included
      timeModules: state.timeModules || [],
      logs: state.logs || [],
      settings: state.settings || {}
    };
    
    const jsonState = JSON.stringify(stateToSave);
    await AsyncStorage.setItem(APP_STATE_KEY, jsonState);
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

export const loadState = async (): Promise<AppState | null> => {
  try {
    const jsonState = await AsyncStorage.getItem(APP_STATE_KEY);
    if (jsonState !== null) {
      const state = JSON.parse(jsonState) as AppState;
      // Ensure default values for fields
      state.habits = state.habits || [];
      state.goals = state.goals || []; // Ensure goals are initialized
      state.timeModules = state.timeModules || [];
      state.logs = state.logs || [];
      state.settings = state.settings || {};
      return state;
    }
    return null;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
};