import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

const { width } = Dimensions.get('window');

// Signature stripe: uneven color bands, a nod to kente cloth weaving —
// this is the one deliberate visual flourish on the page.
const STRIPES = [
  { flex: 2, color: '#C89B3C' },
  { flex: 1, color: '#A8492E' },
  { flex: 1, color: '#2F4A3A' },
  { flex: 3, color: '#C89B3C' },
  { flex: 1, color: '#A8492E' },
];

const CATEGORIES = [
  { label: 'Fades', accent: '#C89B3C' },
  { label: 'Braids', accent: '#A8492E' },
  { label: 'Facials', accent: '#2F4A3A' },
];

// Brand palette is fixed per mode — this screen carries its own identity
// rather than inheriting the generic surface tokens used elsewhere.
const PALETTE = {
  dark: {
    bg: '#221912',
    card: '#2E2419',
    text: '#EDE6D6',
    textSecondary: '#B8AC98',
    textMuted: '#7A6F5C',
    button: '#C89B3C',
    buttonText: '#2C1F0F',
  },
  light: {
    bg: '#F5EFE3',
    card: '#E9DCC2',
    text: '#2C1F0F',
    textSecondary: '#6B5D46',
    textMuted: '#8A7F6C',
    button: '#C89B3C',
    buttonText: '#2C1F0F',
  },
};

export default function WelcomeScreen({ navigation }: any) {
  const { isDark, toggleTheme } = useTheme();
  const c = isDark ? PALETTE.dark : PALETTE.light;

  const fadeStripe = useRef(new Animated.Value(0)).current;
  const fadeWordmark = useRef(new Animated.Value(0)).current;
  const slideWordmark = useRef(new Animated.Value(12)).current;
  const fadeCategories = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeStripe, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeWordmark, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideWordmark, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(fadeCategories, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeButton, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('RoleSelection');
  };

  return (
    <ThemedScreen style={[styles.outer, { backgroundColor: c.bg }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleTheme}
        style={[styles.themeToggle, { backgroundColor: c.card }]}
      >
        <Text style={{ fontSize: 16, color: c.text }}>{isDark ? '☀' : '☾'}</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.stripeRow, { opacity: fadeStripe }]}>
        {STRIPES.map((s, i) => (
          <View key={i} style={{ flex: s.flex, backgroundColor: s.color, height: 8 }} />
        ))}
      </Animated.View>

      <View style={styles.body}>
        <Animated.View style={{ opacity: fadeWordmark, transform: [{ translateY: slideWordmark }] }}>
          <View style={styles.wordmarkRow}>
            <Text style={[styles.wordmark, { color: c.text }]}>Style</Text>
            <View>
              <Text style={[styles.wordmark, { color: c.text }]}>Book</Text>
              <Svg width={92} height={10} viewBox="0 0 100 10" style={styles.underline}>
                <Path
                  d="M0,6 Q20,0 45,5 T100,3"
                  stroke="#C89B3C"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>
            Book your next look in seconds
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeCategories, marginTop: 40 }}>
          <Text style={[styles.eyebrow, { color: c.textMuted }]}>FIND YOUR STYLE</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <View
                key={cat.label}
                style={[styles.categoryTile, { backgroundColor: c.card, borderTopColor: cat.accent }]}
              >
                <Text style={[styles.categoryLabel, { color: c.text }]}>{cat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: fadeButton }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleGetStarted}
          style={[styles.button, { backgroundColor: c.button }]}
        >
          <Text style={[styles.buttonText, { color: c.buttonText }]}>Get started</Text>
        </TouchableOpacity>
        <Text style={[styles.footerText, { color: c.textMuted }]}>
          By continuing, you agree to our terms and conditions
        </Text>
      </Animated.View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stripeRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
  },
  wordmarkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  underline: {
    marginTop: -6,
  },
  tagline: {
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryTile: {
    flex: 1,
    borderRadius: 10,
    borderTopWidth: 3,
    paddingVertical: 16,
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
});