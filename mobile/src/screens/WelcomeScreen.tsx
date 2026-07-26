import React, { useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import ThemedScreen from '../components/ThemedScreen';

export default function WelcomeScreen({ navigation }: any) {
  const { isDark, toggleTheme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const btnFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(btnFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('RoleSelection');
  };

  return (
    <ThemedScreen style={styles.screen}>
      <ImageBackground
        source={require('../../assets/onboarding1.png')}
        resizeMode="cover"
        style={styles.background}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleTheme}
          style={styles.themeToggle}
        >
          <Text style={{ fontSize: 16, color: '#FFFFFF' }}>{isDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <View style={{ maxWidth: '90%' }}>
            <Text style={styles.brand}>StyleBook</Text>
            <Text style={styles.tagline}>Book your next look in seconds</Text>
          </View>

          <Animated.View style={{ opacity: btnFade, marginTop: 28 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGetStarted}
              style={[styles.button, { width: screenWidth - 60 }]}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>
              By continuing, you agree to our terms and conditions
            </Text>
          </Animated.View>
        </Animated.View>
      </ImageBackground>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  background: { flex: 1, justifyContent: 'flex-end' },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  button: {
    alignSelf: 'center',
    height: 58,
    borderRadius: 29,
    backgroundColor: '#D4A017',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1F0F',
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 14,
  },
});