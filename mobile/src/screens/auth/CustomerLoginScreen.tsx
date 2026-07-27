import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Easing,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

type Mode = 'choice' | 'login' | 'signup';

export default function CustomerLoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { theme, isDark } = useTheme();
  const [mode, setMode] = useState<Mode>('choice');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
  });

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  const btn1 = useRef(new Animated.Value(0)).current;
  const btn2 = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.stagger(140, [
      Animated.spring(btn1, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(btn2, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const btnStyle = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  });

  const goTo = (next: Mode) => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 24, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setMode(next);
      contentSlide.setValue(24);
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const handleBack = () => {
    if (mode !== 'choice') {
      goTo('choice');
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      let response;
      if (mode === 'login') {
        response = await authAPI.login({ email: form.email, password: form.password });
      } else {
        if (!form.fullName || !form.phone) {
          Alert.alert('Error', 'Please fill in all fields');
          setLoading(false);
          return;
        }
        response = await authAPI.registerCustomer(form);
      }
      const { token, ...user } = response.data;
      if (user.role !== 'CUSTOMER') {
        Alert.alert(
          'Wrong Account Type',
          'This is a business owner account. Please use the Business Owner login instead.'
        );
        setLoading(false);
        return;
      }
      if (!user.emailVerified) {
        navigation.navigate('VerifyEmail', { email: form.email.trim() });
        return;
      }
      await login(token, user);
    } catch (error: any) {
      console.log('LOGIN ERROR:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      }, null, 2));
      if (error.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        navigation.navigate('VerifyEmail', { email: form.email.trim() });
        return;
      }
      Alert.alert('Error', error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedScreen>
      <LinearGradient
        colors={
          isDark
            ? ['#0F0B06', '#241a10', '#1a1410']
            : ['#F8EBD2', '#F0D6A0', '#F8ECD5']
        }
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View style={[styles.bgCircleTopLeft, { backgroundColor: theme.accent, opacity: 0.07 }]} />
        <View style={[styles.bgCircleTopRight, { backgroundColor: theme.accent, opacity: 0.09 }]} />
        <View style={[styles.bgCircleBottom, { backgroundColor: theme.accent, opacity: 0.06 }]} />
        <View style={[styles.bgDotSmall1, { backgroundColor: theme.accent, opacity: 0.28 }]} />
        <View style={[styles.bgDotSmall2, { backgroundColor: theme.accent, opacity: 0.22 }]} />
        <View style={[styles.bgDotSmall3, { backgroundColor: theme.accent, opacity: 0.3 }]} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={handleBack} style={styles.back}>
            <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
              {mode === 'choice' ? (
                <>
                  <View style={styles.decorWrap}>
                    <View style={[styles.decorCircleBack, { backgroundColor: theme.accent, opacity: 0.12 }]} />
                    <View style={[styles.decorCircleAccent, { backgroundColor: theme.accent, opacity: 0.22 }]} />
                    <View style={[styles.decorBadge, { borderColor: theme.accent, backgroundColor: theme.surface }]}>
                      <Ionicons name="person" size={32} color={theme.accent} />
                    </View>
                  </View>

                  <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Hello there 👋</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
                    How would you like to continue?
                  </Text>

                  <Animated.View style={btnStyle(btn1)}>
                    <TouchableOpacity
                      style={[styles.choiceBtn, { backgroundColor: theme.accent }]}
                      onPress={() => goTo('login')}
                    >
                      <Text style={styles.choiceBtnText}>Sign In</Text>
                      <Text style={styles.choiceBtnSub}>Welcome back</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View style={btnStyle(btn2)}>
                    <TouchableOpacity
                      style={[styles.choiceBtnOutline, { borderColor: theme.accent, backgroundColor: theme.surface }]}
                      onPress={() => goTo('signup')}
                    >
                      <Text style={[styles.choiceBtnText, { color: theme.accent }]}>Create Account</Text>
                      <Text style={[styles.choiceBtnSub, { color: theme.textSecondary }]}>New to StyleBook? Join free</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                <>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {mode === 'login' ? 'Welcome back' : 'Create account'}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.accent }]}>Customer</Text>

                  {mode === 'signup' && (
                    <>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="Your full name"
                        placeholderTextColor={theme.textTertiary}
                        value={form.fullName}
                        onChangeText={(v) => setForm({ ...form, fullName: v })}
                      />
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Phone</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="0XX XXX XXXX"
                        placeholderTextColor={theme.textTertiary}
                        value={form.phone}
                        onChangeText={(v) => setForm({ ...form, phone: v })}
                        keyboardType="phone-pad"
                      />
                    </>
                  )}

                  <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder="your@email.com"
                    placeholderTextColor={theme.textTertiary}
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
                  <View style={[styles.passwordRow, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: theme.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textTertiary}
                      value={form.password}
                      onChangeText={(v) => setForm({ ...form, password: v })}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordIcon}>
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={22}
                        color={theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                    <Text style={[styles.forgotText, { color: theme.accent }]}>Forgot password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.accent }]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => goTo(mode === 'login' ? 'signup' : 'login')}
                    style={styles.toggle}
                  >
                    <Text style={[styles.toggleText, { color: theme.textSecondary }]}>
                      {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                      <Text style={[styles.toggleLink, { color: theme.accent }]}>
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontSize: 16 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  passwordInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 16,
    minHeight: 48,
  },
  passwordIcon: {
    marginLeft: 12,
  },
  button: { borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  toggle: { alignItems: 'center', marginTop: 24 },
  toggleText: { fontSize: 14 },
  toggleLink: { fontWeight: '700' },
  choiceBtn: { borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 14 },
  choiceBtnOutline: { borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 14, borderWidth: 1.5 },
  choiceBtnText: { color: '#000', fontSize: 18, fontWeight: '800' },
  choiceBtnSub: { color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 4 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  decorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 8,
  },
  decorCircleBack: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  decorCircleAccent: {
    position: 'absolute',
    top: 6,
    right: '28%',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  decorBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bgCircleTopLeft: {
    position: 'absolute',
    top: -70,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  bgCircleTopRight: {
    position: 'absolute',
    top: 90,
    right: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  bgCircleBottom: {
    position: 'absolute',
    bottom: -90,
    left: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  bgDotSmall1: {
    position: 'absolute',
    top: 240,
    left: 36,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  bgDotSmall2: {
    position: 'absolute',
    top: 360,
    right: 50,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bgDotSmall3: {
    position: 'absolute',
    bottom: 140,
    right: 90,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
