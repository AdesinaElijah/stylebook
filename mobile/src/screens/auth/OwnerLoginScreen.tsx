import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Easing,
} from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

type Mode = 'choice' | 'login' | 'signup';

const PLANS = [
  { id: 'FREE', label: 'Free', price: 'GHS 0/mo', desc: '10 bookings, 3 photos, 5 posts' },
  { id: 'PRO', label: 'Pro ⭐', price: 'GHS 120/mo', desc: 'Unlimited everything + analytics' },
  { id: 'ENTERPRISE', label: 'Enterprise', price: 'GHS 300/mo', desc: 'Multi-branch + sponsored pins' },
];
const CATEGORIES = ['SALON', 'BARBERSHOP', 'SPA', 'NAILS'];

function Sparkle({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <Path
      d={`M ${x} ${y - s} L ${x + s * 0.3} ${y - s * 0.3} L ${x + s} ${y} L ${x + s * 0.3} ${y + s * 0.3} L ${x} ${y + s} L ${x - s * 0.3} ${y + s * 0.3} L ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.3} Z`}
      fill={color}
    />
  );
}

function BarberIllustration({ gold, ink, surface }: { gold: string; ink: string; surface: string }) {
  return (
    <Svg width="100%" height={170} viewBox="0 0 400 200">
      <Defs>
        <ClipPath id="poleClip">
          <Rect x={300} y={58} width={22} height={86} rx={11} />
        </ClipPath>
      </Defs>
      <Ellipse cx={200} cy={110} rx={170} ry={80} fill={gold} opacity={0.1} />
      <Rect x={172} y={48} width={56} height={58} rx={12} fill={surface} stroke={gold} strokeWidth={4} />
      <Line x1={186} y1={64} x2={214} y2={64} stroke={gold} strokeWidth={2} opacity={0.5} />
      <Line x1={186} y1={76} x2={214} y2={76} stroke={gold} strokeWidth={2} opacity={0.5} />
      <Rect x={158} y={104} width={84} height={18} rx={9} fill={gold} />
      <Rect x={148} y={88} width={12} height={30} rx={6} fill={surface} stroke={ink} strokeWidth={3} />
      <Rect x={240} y={88} width={12} height={30} rx={6} fill={surface} stroke={ink} strokeWidth={3} />
      <Rect x={195} y={122} width={10} height={30} rx={4} fill={ink} />
      <Rect x={172} y={152} width={56} height={8} rx={4} fill={gold} />
      <Rect x={88} y={72} width={30} height={58} rx={10} fill={surface} stroke={ink} strokeWidth={4} />
      <Rect x={92} y={58} width={22} height={14} rx={3} fill={ink} />
      <Line x1={95} y1={58} x2={95} y2={52} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={103} y1={58} x2={103} y2={52} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={111} y1={58} x2={111} y2={52} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={103} cy={100} r={5} fill={gold} />
      <Line x1={70} y1={48} x2={78} y2={54} stroke={gold} strokeWidth={3} strokeLinecap="round" />
      <Line x1={62} y1={62} x2={72} y2={64} stroke={gold} strokeWidth={3} strokeLinecap="round" />
      <Rect x={300} y={58} width={22} height={86} rx={11} fill={surface} stroke={gold} strokeWidth={3} />
      <Line x1={292} y1={72} x2={330} y2={94} stroke={gold} strokeWidth={7} clipPath="url(#poleClip)" />
      <Line x1={292} y1={94} x2={330} y2={116} stroke={ink} strokeWidth={7} clipPath="url(#poleClip)" />
      <Line x1={292} y1={116} x2={330} y2={138} stroke={gold} strokeWidth={7} clipPath="url(#poleClip)" />
      <Circle cx={311} cy={52} r={7} fill={gold} />
      <Circle cx={311} cy={150} r={7} fill={gold} />
      <Sparkle x={62} y={150} s={7} color={gold} />
      <Sparkle x={348} y={36} s={8} color={gold} />
      <Sparkle x={152} y={26} s={5} color={gold} />
      <Sparkle x={262} y={30} s={6} color={gold} />
    </Svg>
  );
}

export default function OwnerLoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>('choice');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    shopName: '', category: 'SALON', city: '',
    googleMapsLink: '', plan: 'FREE',
  });

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  const float = useRef(new Animated.Value(0)).current;
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={handleBack} style={styles.back}>
            <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Animated.View style={{ transform: [{ translateY: floatY }], marginBottom: 8 }}>
              <BarberIllustration gold={theme.accent} ink={theme.text} surface={theme.surface} />
            </Animated.View>

            <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
              {mode === 'choice' ? (
                <>
                  <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Grow your business ✂️</Text>
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
                      <Text style={[styles.choiceBtnText, { color: theme.accent }]}>Register Your Shop</Text>
                      <Text style={[styles.choiceBtnSub, { color: theme.textSecondary }]}>New here? Set up in minutes</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                <>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {mode === 'login' ? 'Welcome back' : 'Register your shop'}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.accent }]}>Business Owner</Text>

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
                              form.category === cat && { backgroundColor: theme.accent, borderColor: theme.accent },
                            ]}
                            onPress={() => setForm({ ...form, category: cat })}
                          >
                            <Text style={[
                              styles.categoryText,
                              { color: form.category === cat ? '#000' : theme.textSecondary },
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
                            form.plan === plan.id && { borderColor: theme.accent, backgroundColor: theme.accentLight },
                          ]}
                          onPress={() => setForm({ ...form, plan: plan.id })}
                        >
                          <View style={styles.planRow}>
                            <Text style={[styles.planLabel, { color: theme.text }]}>{plan.label}</Text>
                            <Text style={[styles.planPrice, { color: theme.accent }]}>{plan.price}</Text>
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
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textTertiary}
                    value={form.password}
                    onChangeText={(v) => setForm({ ...form, password: v })}
                    secureTextEntry
                  />

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
                        {mode === 'login' ? 'Sign In' : 'Register Shop'}
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
                        {mode === 'login' ? 'Register' : 'Sign In'}
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
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 13 },
  planCard: { borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  planLabel: { fontWeight: '700' },
  planPrice: { fontWeight: '700' },
  planDesc: { fontSize: 12 },
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
});
