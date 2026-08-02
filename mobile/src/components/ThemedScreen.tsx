import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: any;
  /** Which sides to inset. Defaults to top and bottom; pass [] to opt out entirely. */
  edges?: Edge[];
};

/**
 * Screen wrapper that keeps content clear of the system UI.
 *
 * <p>Uses SafeAreaView from react-native-safe-area-context rather than the one in
 * react-native. The built-in version is deprecated and, more importantly, is a no-op on
 * Android — it only ever applied insets on iOS. That is why content sat underneath the
 * Android status bar, and why the notification bell collided with the clock.
 *
 * <p>The context version reads the real insets on both platforms, so the same screen now
 * clears an Android status bar, an iPhone notch or Dynamic Island, and the home indicator.
 */
export default function ThemedScreen({ children, style, edges = ['top', 'bottom'] }: Props) {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor: theme.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
