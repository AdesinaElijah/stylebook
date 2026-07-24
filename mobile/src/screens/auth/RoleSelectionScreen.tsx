import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, Image,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

const { width } = Dimensions.get('window');

function CustomerIcon({ ink }: { ink: string }) {
  return (
    <Svg width={26} height={22} viewBox="0 0 26 22">
      <Line x1={2} y1={2} x2={14} y2={14} stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={14} y1={2} x2={2} y2={14} stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={2} cy={17} r={3.2} stroke={ink} strokeWidth={2.2} fill="none" />
      <Circle cx={14} cy={17} r={3.2} stroke={ink} strokeWidth={2.2} fill="none" />
      <Circle cx={21} cy={7} r={6} stroke={ink} strokeWidth={2} fill="none" />
      <Rect x={19.5} y={16} width={3} height={5} rx={1.5} fill={ink} />
    </Svg>
  );
}

function OwnerIcon({ ink }: { ink: string }) {
  return (
    <Svg width={26} height={22} viewBox="0 0 26 22">
      <Rect x={2} y={2} width={9} height={18} rx={4.5} stroke={ink} strokeWidth={2} fill="none" />
      <Line x1={0} y1={7} x2={13} y2={13} stroke={ink} strokeWidth={2.4} />
      <Line x1={0} y1={13} x2={13} y2={7} stroke={ink} strokeWidth={2.4} />
      <Rect x={16} y={5} width={8} height={14} rx={2.5} stroke={ink} strokeWidth={2} fill="none" />
      <Circle cx={20} cy={12} r={1.6} fill={ink} />
    </Svg>
  );
}

interface RoleCardProps {
  photo: any;
  title: string;
  desc: string;
  translateX: Animated.Value;
  scale: Animated.Value;
  onPress: () => void;
  icon: React.ReactNode;
  accent: string;
  cream: string;
  ink: string;
}

function RoleCard({ photo, title, desc, translateX, scale, onPress, icon, accent, cream, ink }: RoleCardProps) {
  return (
    <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, { borderColor: accent }]}>
        <Image source={photo} style={styles.cardPhoto} resizeMode="cover" />
        <View style={[styles.photoOverlay, { backgroundColor: 'rgba(20,16,9,0.28)' }]} />

        <View style={[styles.badge, { backgroundColor: cream, borderColor: accent }]}>
          {icon}
        </View>

        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>

        <View style={[styles.arrowCircle, { backgroundColor: accent }]}>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>  );
}
export default function RoleSelectionScreen({ navigation }: any) {
  const { theme } = useTheme();

  const blob = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const customerX = useRef(new Animated.Value(-width)).current;
  const ownerX = useRef(new Animated.Value(width)).current;
  const customerScale = useRef(new Animated.Value(1)).current;
  const ownerScale = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  const playEntrance = () => {
    blob.setValue(0);
    titleFade.setValue(0);
    titleSlide.setValue(24);
    customerX.setValue(-width);
    ownerX.setValue(width);
    customerScale.setValue(1);
    ownerScale.setValue(1);
    screenFade.setValue(1);

    Animated.sequence([
      Animated.spring(blob, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleSlide, {
          toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      Animated.stagger(150, [
        Animated.spring(customerX, { toValue: 0, friction: 9, tension: 45, useNativeDriver: true }),
        Animated.spring(ownerX, { toValue: 0, friction: 9, tension: 45, useNativeDriver: true }),
      ]),
    ]).start();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', playEntrance);
    playEntrance();
    return unsubscribe;
  }, [navigation]);

  const choose = (role: 'customer' | 'owner') => {
    const pressedScale = role === 'customer' ? customerScale : ownerScale;
    const otherX = role === 'customer' ? ownerX : customerX;
    const otherTarget = role === 'customer' ? width : -width;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(pressedScale, { toValue: 1.05, duration: 160, useNativeDriver: true }),
        Animated.timing(pressedScale, { toValue: 1.02, duration: 120, useNativeDriver: true }),
      ]),
      Animated.timing(otherX, {
        toValue: otherTarget, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(titleFade, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(screenFade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
        navigation.navigate(role === 'customer' ? 'CustomerLogin' : 'OwnerLogin');
      });
    });
  };

  // TODO: swap these for your actual filenames from `dir assets\*.png`
  const customerPhoto = require('../../../assets/photo_2026-07-17_11-22-10.png');
  const ownerPhoto = require('../../../assets/photo_2026-07-17_11-22-29.jpg');

  return (
    <ThemedScreen>
      <Animated.View style={[styles.container, { opacity: screenFade }]}>
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.blob,
              { backgroundColor: theme.accent, opacity: 0.12, transform: [{ scale: blob }] },
            ]}
          />
          <Animated.View style={{ opacity: titleFade, transform: [{ translateY: titleSlide }], alignItems: 'center' }}>
            <Text style={[styles.title, { color: theme.text }]}>Who are you?</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              We'll personalize your experience to match your needs.
            </Text>
          </Animated.View>
        </View>

        <View style={styles.cards}>
          <RoleCard
            photo={customerPhoto}
            title="I'm a Customer"
            desc="Discover, book, and review services"
            translateX={customerX}
            scale={customerScale}
            onPress={() => choose('customer')}
            icon={<CustomerIcon ink={theme.text} />}
            accent={theme.accent}
            cream={theme.background}
            ink={theme.text}
          />
          <RoleCard
            photo={ownerPhoto}
            title="I'm a Business Owner"
            desc="Manage bookings, grow your business"
            translateX={ownerX}
            scale={ownerScale}
            onPress={() => choose('owner')}
            icon={<OwnerIcon ink={theme.text} />}
            accent={theme.accent}
            cream={theme.background}
            ink={theme.text}
          />
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="checkmark" size={12} color={theme.accent} />
            <Text style={[styles.trustText, { color: theme.textSecondary }]}>Secure</Text>
          </View>
          <Ionicons name="ellipse" size={6} color={theme.textSecondary} style={styles.trustDot} />
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>Reliable</Text>
          <Ionicons name="ellipse" size={6} color={theme.textSecondary} style={styles.trustDot} />
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>Trusted</Text>
        </View>
      </Animated.View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },
  header: { alignItems: 'center', justifyContent: 'center', height: 160 },
  blob: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -30,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  cards: { flex: 1, gap: 16, justifyContent: 'center' },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    height: 210,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: { padding: 18, paddingRight: 70 },
  cardTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  cardDesc: { fontSize: 13, color: '#F0EDE7', marginTop: 4, lineHeight: 18 },
  arrowCircle: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: { fontSize: 12, letterSpacing: 0.3 },
  trustDot: { marginHorizontal: 4 },
});
