// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from "expo-localization";
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../assets/locales/en';
import ar from '../assets/locales/ar';

// Translations
const resources = {
  "en": {translation: en},
  "ar": {translation: ar},
};

// Language preference storage key
const LANGUAGE_STORAGE_KEY = 'user_language_preference';

// Function to load saved language preference
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
  return null;
};

// Function to save language preference
export const saveLanguagePreference = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    console.log(`Language preference saved: ${language}`);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

export const getCurrentLang = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    // Fallback to device language if no saved preference
    const deviceLanguage = Localization.getLocales()[0].languageCode || defaultLanguage;
    return deviceLanguage.startsWith('ar') ? 'ar' : 'en';
  } catch (error) {
    console.error('Error getting current language:', error);
    // Fallback to default language
    return Localization.getLocales()[0].languageCode?.startsWith('ar') ? 'ar' : 'en';
  }
};
// Set RTL layout if Arabic is selected
if (Localization.getLocales()[0].languageCode?.startsWith('ar')) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} else {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

const defaultLanguage = Localization.getLocales()[0].languageCode?.startsWith('ar')? 'ar': 'en';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: defaultLanguage, // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already does escaping
    },
  });

// Load saved language on startup
loadSavedLanguage();

export default i18n;
