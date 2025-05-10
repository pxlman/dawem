import { useEffect, useState } from 'react';
import { useColorScheme as _useColorScheme } from 'react-native';
import Colors, { ColorPalette, setTheme, getTheme } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '@/types/index';

// The key used for storing theme preference
const THEME_PREFERENCE_KEY = 'themePreference';

/**
 * A custom hook that handles theme selection based on user preferences
 * Supports custom themes from Colors.ts, not just system light/dark
 */
export function useColorScheme(): ThemeType {
  // Get the system color scheme (light/dark)
  const systemColorScheme = _useColorScheme() as 'light' | 'dark' | null;
  // State to store user's theme preference
  const [themePreference, setThemePreference] = useState<ThemeType>(getTheme());
  
  // Load user preferences on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedPreference && isValidTheme(savedPreference)) {
          setThemePreference(savedPreference as ThemeType);
          setTheme(savedPreference as ThemeType);
        } else if (systemColorScheme) {
          // If no saved preference, use system color scheme
          setThemePreference(systemColorScheme as ThemeType);
          setTheme(systemColorScheme as ThemeType);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, [systemColorScheme]);

  return themePreference;
}

// Helper to validate theme type
function isValidTheme(theme: string): boolean {
  return ['light', 'dark', 'browny', 'fresh', 'night'].includes(theme);
}

/**
 * Returns the theme colors based on the current theme
 */
export default function useThemeColor(): ColorPalette {
  const theme = useColorScheme();
  return Colors(theme);
}

/**
 * Sets the user's theme preference
 */
export async function setThemePreference(preference: ThemeType): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
    setTheme(preference);
  } catch (error) {
    console.error('Error saving theme preference:', error);
  }
}

// Re-export the original hook for components that need direct access
export { _useColorScheme as useSystemColorScheme };

