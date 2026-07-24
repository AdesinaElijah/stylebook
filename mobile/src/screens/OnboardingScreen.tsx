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
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: '#333' }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: slideOpacity, transform: [{ translateY: slideTranslate }] }]}> 
          <View style={{ maxWidth: '90%' }}>
            <Text style={[styles.heading, {
              color: '#FFFFFF',
              textShadowColor: 'rgba(0,0,0,0.16)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            }]}>{slides[page].title}</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.9)', marginBottom: 12 }]}>{slides[page].subtitle}</Text>
          </View>

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
      </ImageBackground>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: 24, paddingTop: 24, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 2 },
  skipButton: { padding: 12 },
  skipText: { fontSize: 14, fontWeight: '600' },
  background: { flex: 1, justifyContent: 'space-between' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  copyBlock: { maxWidth: '90%', paddingBottom: 24 },
  heading: { fontSize: 36, fontWeight: '900', lineHeight: 44, marginBottom: 14 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  footerBlock: { paddingBottom: 12 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  indicator: { height: 10, borderRadius: 5, marginHorizontal: 6 },
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
