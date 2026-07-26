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
import { BRAND } from '../../theme/brand';
import StripeBar from '../../components/StripeBar'; 

type Mode = 'choice' | 'login' | 'signup';

const PLANS = [
  { id: 'FREE', label: 'Free', price: 'GHS 0/mo', desc: '10 bookings, 3 photos, 5 posts' },
  { id: 'PRO', label: 'Pro', price: 'GHS 120/mo', desc: 'Unlimited everything + analytics' },
  { id: 'ENTERPRISE', label: 'Enterprise', price: 'GHS 300/mo', desc: 'Multi-branch + sponsored pins' },
];
const CATEGORIES = ['SALON', 'BARBERSHOP', 'SPA', 'NAILS'];

export default function OwnerLoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { theme, isDark } = useTheme();
  const c = isDark ? BRAND.dark : BRAND.light;
  const [mode, setMode] = useState<Mode>('choice');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    shopName: '', category: 'SALON', city: '',
    googleMapsLink: '', plan: 'FREE',
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
        if (!form.fullName || !form.phone || !form.shopName || !form.city) {
          Alert.alert('Error', 'Please fill in all fields');
          setLoading(false);
          return;
        }
        response = await authAPI.registerOwner(form);
      }
      const { token, ...user } = response.data;
      if (user.role !== 'OWNER') {
        Alert.alert(
          'Wrong Account Type',
          'This is a customer account. Please use the Customer login instead.'
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
            ? ['#0F0906', '#241512', '#1a1210']
            : ['#F5DED3', '#E8B49B', '#F5E2D3']
        }
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View style={[styles.bgDiagonalBar, { backgroundColor: c.button, opacity: 0.08 }]} />
        <View style={[styles.bgDiamond, { backgroundColor: c.button, opacity: 0.16 }]} />
        <View style={styles.bgChartCluster}>
          <View style={[styles.bgChartBar, { height: 30, backgroundColor: c.button, opacity: 0.1 }]} />
          <View style={[styles.bgChartBar, { height: 50, backgroundColor: c.button, opacity: 0.14 }]} />
          <View style={[styles.bgChartBar, { height: 74, backgroundColor: c.button, opacity: 0.18 }]} />
        </View>
      </View>
      <StripeBar />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={handleBack} style={styles.back}>
            <Text style={[styles.backText, { color: c.button }]}>← Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
              {mode === 'choice' ? (
                <>
                  <View style={styles.decorWrap}>
                    <View style={[styles.decorCircleBack, { backgroundColor: c.button, opacity: 0.12 }]} />
                    <View style={[styles.decorCircleAccent, { backgroundColor: c.button, opacity: 0.22 }]} />
                    <View style={[styles.decorBadge, { borderColor: c.button, backgroundColor: theme.surface }]}>
                      <Ionicons name="trending-up" size={32} color={c.button} />
                    </View>
                  </View>

                  <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Grow your business</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
                    How would you like to continue?
                  </Text>

                  <Animated.View style={btnStyle(btn1)}>
                    <TouchableOpacity
                      style={[styles.choiceBtn, { backgroundColor: c.button }]}
                      onPress={() => goTo('login')}
                    >
                      <Text style={[styles.choiceBtnText, { color: c.buttonText }]}>Sign in</Text>
                      <Text style={[styles.choiceBtnSub, { color: c.buttonText }]}>Welcome back</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View style={btnStyle(btn2)}>
                    <TouchableOpacity
                      style={[styles.choiceBtnOutline, { borderColor: c.button, backgroundColor: theme.surface }]}
                      onPress={() => goTo('signup')}
                    >
                      <Text style={[styles.choiceBtnText, { color: c.button }]}>Register your shop</Text>
                      <Text style={[styles.choiceBtnSub, { color: theme.textSecondary }]}>New here? Set up in minutes</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                <>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {mode === 'login' ? 'Welcome back' : 'Register your shop'}
                  </Text>
                  <Text style={[styles.subtitle, { color: c.button }]}>Business Owner</Text>

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
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Shop Name</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Kofi's Barbershop"
                        placeholderTextColor={theme.textTertiary}
                        value={form.shopName}
                        onChangeText={(v) => setForm({ ...form, shopName: v })}
                      />
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                      <View style={styles.categoryRow}>
                        {CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.categoryBtn,
                              { backgroundColor: theme.surface, borderColor: theme.border },
                              form.category === cat && { backgroundColor: c.button, borderColor: c.button },
                            ]}
                            onPress={() => setForm({ ...form, category: cat })}
                          >
                            <Text style={[
                              styles.categoryText,
                              { color: form.category === cat ? c.buttonText : theme.textSecondary },
                            ]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>City</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Accra, Kumasi"
                        placeholderTextColor={theme.textTertiary}
                        value={form.city}
                        onChangeText={(v) => setForm({ ...form, city: v })}
                      />
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Google Maps Link (optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                        placeholder="https://maps.google.com/..."
                        placeholderTextColor={theme.textTertiary}
                        value={form.googleMapsLink}
                        onChangeText={(v) => setForm({ ...form, googleMapsLink: v })}
                      />
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Plan</Text>
                      {PLANS.map((plan) => (
                        <TouchableOpacity
                          key={plan.id}
                          style={[
                            styles.planCard,
                            { backgroundColor: theme.surface, borderColor: theme.border },
                            form.plan === plan.id && { borderColor: c.button, backgroundColor: theme.accentLight },
                          ]}
                          onPress={() => setForm({ ...form, plan: plan.id })}
                        >
                          <View style={styles.planRow}>
                            <Text style={[styles.planLabel, { color: theme.text }]}>{plan.label}</Text>
                            <Text style={[styles.planPrice, { color: c.button }]}>{plan.price}</Text>
                          </View>
                          <Text style={[styles.planDesc, { color: theme.textSecondary }]}>{plan.desc}</Text>
                        </TouchableOpacity>
                      ))}
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
                    <Text style={[styles.forgotText, { color: c.button }]}>Forgot password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: c.button }]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={c.buttonText} />
                    ) : (
                      <Text style={[styles.buttonText, { color: c.buttonText }]}>
                        {mode === 'login' ? 'Sign in' : 'Register shop'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => goTo(mode === 'login' ? 'signup' : 'login')}
                    style={styles.toggle}
                  >
                    <Text style={[styles.toggleText, { color: theme.textSecondary }]}>
                      {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                      <Text style={[styles.toggleLink, { color: c.button }]}>
                        {mode === 'login' ? 'Register' : 'Sign in'}
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
  scroll: { padding: 24, paddingTop: 24, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 10, padding: 16, fontSize: 16, borderWidth: 1 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  categoryText: { fontSize: 13 },
  planCard: { borderRadius: 10, padding: 16, marginBottom: 8, borderWidth: 1 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  planLabel: { fontWeight: '700' },
  planPrice: { fontWeight: '700' },
  planDesc: { fontSize: 12 },
  button: { borderRadius: 10, padding: 18, alignItems: 'center', marginTop: 32 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  toggle: { alignItems: 'center', marginTop: 24 },
  toggleText: { fontSize: 14 },
  toggleLink: { fontWeight: '700' },
  choiceBtn: { borderRadius: 10, padding: 20, alignItems: 'center', marginTop: 14 },
  choiceBtnOutline: { borderRadius: 10, padding: 20, alignItems: 'center', marginTop: 14, borderWidth: 1.5 },
  choiceBtnText: { fontSize: 17, fontWeight: '700' },
  choiceBtnSub: { fontSize: 13, marginTop: 4, opacity: 0.75 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
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
  bgDiagonalBar: {
    position: 'absolute',
    top: 70,
    right: -100,
    width: 280,
    height: 40,
    borderRadius: 20,
    transform: [{ rotate: '-16deg' }],
  },
  bgDiamond: {
    position: 'absolute',
    top: 30,
    left: 24,
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
  },
  bgChartCluster: {
    position: 'absolute',
    bottom: 60,
    left: -20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  bgChartBar: {
    width: 26,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
});