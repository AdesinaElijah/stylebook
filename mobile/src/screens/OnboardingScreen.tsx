import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';
import StripeBar from '../components/StripeBar';
import { BRAND } from '../theme/brand';

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
    title: 'Discover top professionals',
    subtitle: 'Explore nearby barbers and salons with verified reviews, pricing, availability, and directions.',
    label: 'Next',
  },
  {
    key: 'booking',
    image: require('../../assets/onboarding3.png'),
    title: 'Book in seconds',
    subtitle: 'Choose your preferred stylist, pick a time, and confirm instantly.',
    label: 'Next',
  },
  {
    key: 'confidence',
    image: require('../../assets/onboarding4.png'),
    title: 'Look great, feel confident',
    subtitle: 'Book trusted professionals and enjoy a seamless grooming experience every time.',
    label: 'Get started',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const c = isDark ? BRAND.dark : BRAND.light;
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const transition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!ready) {
      setReady(true);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [page, ready, transition]);

  const handleSkip = () => navigation.navigate('RoleSelection');

  const handleNext = () => {
    if (page === slides.length - 1) {
      navigation.navigate('RoleSelection');
      return;
    }
    setPage((current) => current + 1);
  };

  const slideOpacity = transition;
  const slideTranslate = transition.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <ThemedScreen style={[styles.screen, { backgroundColor: theme.background }]}>
      <ImageBackground source={slides[page].image} resizeMode="cover" style={styles.background}>
        <View style={styles.overlay} />

        <View style={styles.topBar}>
          <StripeBar height={5} />
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] }]}>
          <View style={{ maxWidth: '90%' }}>
            <Text style={styles.heading}>{slides[page].title}</Text>
            <Text style={styles.subtitle}>{slides[page].subtitle}</Text>
          </View>

          <View style={styles.footerBlock}>
            <View style={styles.indicatorRow}>
              {slides.map((item, index) => (
                <View
                  key={item.key}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: index === page ? c.button : 'rgba(255,255,255,0.4)',
                      width: index === page ? 28 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNext}
              style={[styles.actionButton, { backgroundColor: c.button, width: screenWidth - 60 }]}
            >
              <Text style={[styles.actionText, { color: c.buttonText }]}>{slides[page].label}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 2 },
  skipButton: { padding: 12, marginLeft: 'auto', marginRight: 12, marginTop: 12 },
  skipText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  background: { flex: 1, justifyContent: 'space-between' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  heading: { fontSize: 32, fontWeight: '700', lineHeight: 38, marginBottom: 12, color: '#FFFFFF' },
  subtitle: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.88)' },
  footerBlock: { paddingBottom: 12, marginTop: 24 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 6 },
  indicator: { height: 6, borderRadius: 3 },
  actionButton: {
    alignSelf: 'center',
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});