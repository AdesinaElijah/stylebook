import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'welcome',
    image: require('../../assets/onboarding1.png'),
    title: 'Welcome to StyleBook',
    subtitle: 'Find trusted barbers, salons, and beauty professionals in just a few taps.',
    label: 'Next',
  },
  {
    key: 'discover',
    image: require('../../assets/onboarding2.png'),
    title: 'Discover Top Professionals',
    subtitle: 'Explore nearby barbers and salons with verified reviews, pricing, availability, and directions.',
    label: 'Next',
  },
  {
    key: 'booking',
    image: require('../../assets/onboarding3.png'),
    title: 'Book In Seconds',
    subtitle: 'Choose your preferred stylist, pick a time, and confirm instantly.',
    label: 'Next',
  },
  {
    key: 'confidence',
    image: require('../../assets/onboarding4.png'),
    title: 'Look Great. Feel Confident.',
    subtitle: 'Book trusted professionals and enjoy a seamless grooming experience every time.',
    label: 'Get Started',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const transition = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const accent = theme.accent;
  const buttonTextColor = isDark ? '#000' : '#FFFFFF';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    if (!ready) { setReady(true); return; }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [page, ready, transition]);

  const handleSkip = () => navigation.navigate('RoleSelection');

  const handleNext = () => {
    if (page === slides.length - 1) { navigation.navigate('RoleSelection'); return; }
    setPage((current) => current + 1);
  };

  const slideOpacity = transition;
  const slideTranslate = transition.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <ThemedScreen style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.8} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] }]}>

        {/* Image illustration */}
        <View style={styles.illustrationWrapper}>
          <Animated.View style={[styles.illustrationCard, { transform: [{ translateY: floatAnim }] }]}>
            <Image
              source={slides[page].image}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Text */}
        <View style={styles.copyBlock}>
          <Text style={[styles.heading, { color: theme.text }]}>{slides[page].title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{slides[page].subtitle}</Text>
        </View>

        {/* Dots + Button */}
        <View style={styles.footerBlock}>
          <View style={styles.indicatorRow}>
            {slides.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: index === page ? accent : theme.textTertiary,
                    width: index === page ? 32 : 10,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            style={[styles.actionButton, { backgroundColor: accent, width: screenWidth - 60 }]}
          >
            <Text style={[styles.actionText, { color: buttonTextColor }]}>{slides[page].label}</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 24 },
  topBar: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-end' },
  skipButton: { padding: 12 },
  skipText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  illustrationWrapper: {
    flex: 0.62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCard: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: width * 0.72,
    height: width * 0.92,
    borderRadius: 28,
  },
  copyBlock: { paddingTop: 14, paddingBottom: 12 },
  heading: { fontSize: 30, fontWeight: '900', lineHeight: 38, marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  footerBlock: { paddingBottom: 12 },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  indicator: { height: 10, borderRadius: 5 },
  actionButton: {
    alignSelf: 'center',
    height: 58,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  actionText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
});
