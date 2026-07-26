import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

// Adjust this path if your OnboardingScreen.tsx lives somewhere other than src/screens/
const logo = require('../../icon.png');

const slides = [
  {
    key: 'discover',
    icon: 'search' as const,
    title: 'Find Expert Stylists',
    subtitle: 'Discover the best barbers, salons, and beauty professionals directly in your neighborhood.',
  },
  {
    key: 'booking',
    icon: 'calendar-outline' as const,
    title: 'Book in Seconds',
    subtitle: 'Select services, pick your preferred professional, and reserve your slot instantly.',
  },
  {
    key: 'confidence',
    icon: 'sparkles' as const,
    title: 'Elevate Your Look',
    subtitle: 'Read verified reviews, view portfolios, and step out feeling confident and styled.',
  },
];

// How long each slide stays on screen before auto-advancing (ms)
const AUTO_ADVANCE_INTERVAL = 3000;

export default function OnboardingScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);

  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!ready) {
      setReady(true);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [page, ready, transition]);

  // Auto-advance through the slides on a timer, looping back to the start.
  // This only cycles the visual slide — it never triggers navigation.
  useEffect(() => {
    const timer = setInterval(() => {
      setPage((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  // Get Started always sends the user to role selection,
  // regardless of which slide is currently showing.
  const handleGetStarted = () => {
    navigation.navigate('RoleSelection');
  };

  const slideOpacity = transition;
  const slideTranslate = transition.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <ThemedScreen style={[styles.screen, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleTheme}
        style={[styles.themeToggle, { backgroundColor: theme.surface }]}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={theme.accent} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Image source={logo} style={styles.logoCircle} resizeMode="cover" />
        <Text style={[styles.brand, { color: theme.text }]}>
          Style<Text style={{ color: theme.accent }}>Book</Text>
        </Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Book your next look in seconds
        </Text>
      </View>

      <Animated.View style={[styles.content, { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] }]}>
        <View style={[styles.iconCircle, { backgroundColor: theme.accentLight }]}>
          <Ionicons name={slides[page].icon} size={30} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{slides[page].title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{slides[page].subtitle}</Text>
      </Animated.View>

      <View style={styles.footerBlock}>
        <View style={styles.indicatorRow}>
          {slides.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.indicator,
                {
                  backgroundColor: index === page ? theme.accent : theme.border,
                  width: index === page ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleGetStarted}
          style={[styles.actionButton, { backgroundColor: theme.accent, width: screenWidth - 48 }]}
        >
          <Text style={styles.actionText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={[styles.terms, { color: theme.textTertiary }]}>
          By continuing, you agree to our Terms and Conditions
        </Text>
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: { alignItems: 'center', paddingTop: 70 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: 16,
  },
  brand: { fontSize: 30, fontWeight: '800' },
  tagline: { fontSize: 14, marginTop: 6 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  footerBlock: { paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 6 },
  indicator: { height: 6, borderRadius: 3 },
  actionButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 16, fontWeight: '700', color: '#2C1F0F', letterSpacing: 0.3 },
  terms: { fontSize: 11, textAlign: 'center', marginTop: 12 },
});
