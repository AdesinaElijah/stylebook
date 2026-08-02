import 'react-native-gesture-handler';
import React from 'react';
import { LogBox } from 'react-native';

// Hide dev-only warnings (Expo Go limitations; not present in real builds)
LogBox.ignoreLogs([
  /expo-notifications/,
  /SafeAreaView has been deprecated/,
  /ImagePicker.MediaTypeOptions/,
]);
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  // SafeAreaProvider must wrap everything: it measures the device's real insets —
  // Android's status bar, the iPhone notch and home indicator — and feeds them to
  // every SafeAreaView below. Without it those insets read as zero and content
  // slides under the status bar.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}