// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar'; // Use expo-status-bar for easier styling

import AppNavigator from './navigation/AppNavigator';
import { AppProvider } from './context/AppStateContext';
import Colors from './constants/Colors';

// Import polyfill for uuid if needed (already done in helpers.ts is usually enough)
// import 'react-native-get-random-values';

const App: React.FC = () => { // Use React.FC for functional components
  return (
    // SafeAreaProvider should wrap NavigationContainer or be high up
    <SafeAreaProvider>
      {/* AppProvider manages the global state */}
      <AppProvider>
        {/* NavigationContainer handles the navigation tree */}
        <NavigationContainer>
          {/* StatusBar configuration */}
          <StatusBar style="dark" backgroundColor={Colors.primary} />
          {/* AppNavigator defines the screens and navigation structure */}
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default App;