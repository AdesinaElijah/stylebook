import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import { BRAND } from '../../theme/brand';
import StripeBar from '../../components/StripeBar';

const { width } = Dimensions.get('window');

interface RoleCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  surfaceColor: string;
  translateX: Animated.Value;
  scale: Animated.Value;
  onPress: () => void;
}

function RoleCard({ icon, title, desc, tag, tagColor, surfaceColor, translateX, scale, onPress }: RoleCardProps) {
  return (
    <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, { borderTopColor: tagColor, backgroundColor: surfaceColor }]}
      >
        {/* Decorative geometric pattern instead of a photo */}
        <View style={[styles.patternCircleLarge, { backgroundColor: tagColor, opacity: 0.14 }]} />
        <View style={[styles.patternCircleSmall, { backgroundColor: tagColor, opacity: 0.10 }]} />

        <View style={[styles.tagChip, { backgroundColor: tagColor }]}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>

        <View style={styles.iconBadge}>
          <View style={[styles.iconBadgeCircle, { borderColor: tagColor }]}>
            <Ionicons name={icon} size={30} color={tagColor} />
          </View>
        </View>

        <View style={[styles.cardTextWrap, { backgroundColor: tagColor }]}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>

        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={18} color="#2C1F0F" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RoleSelectionScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const c = isDark ? BRAND.dark : BRAND.light;

  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(24)).current;
  const customerX = useRef(new Animated.Value(-width)).current;
  const ownerX = useRef(new Animated.Value(width)).current;
  const customerScale = useRef(new Animated.Value(1)).current;
  const ownerScale = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  const playEntrance = () => {
    titleFade.setValue(0);
    titleSlide.setValue(24);
    customerX.setValue(-width);
    ownerX.setValue(width);
    customerScale.setValue(1);
    ownerScale.setValue(1);
    screenFade.setValue(1);

    Animated.sequence([
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

  return (
    <ThemedScreen>
      <StripeBar />
      <Animated.View style={[styles.container, { opacity: screenFade }]}>
        <Animated.View style={{ opacity: titleFade, transform: [{ translateY: titleSlide }], alignItems: 'center' }}>
          <Text style={[styles.title, { color: theme.text }]}>Who are you?</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We'll personalize your experience to match your needs.
          </Text>
        </Animated.View>

        <View style={styles.cards}>
          <RoleCard
            icon="people"
            title="I'm a Customer"
            desc="Discover, book, and review services"
            tag="CUSTOMER"
            tagColor="#C89B3C"
            surfaceColor={theme.surface}
            translateX={customerX}
            scale={customerScale}
            onPress={() => choose('customer')}
          />
          <RoleCard
            icon="storefront"
            title="I'm a Business Owner"
            desc="Manage bookings, grow your business"
            tag="OWNER"
            tagColor="#A8492E"
            surfaceColor={theme.surface}
            translateX={ownerX}
            scale={ownerScale}
            onPress={() => choose('owner')}
          />
        </View>

        <View style={styles.trustRow}>
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>Secure</Text>
          <View style={styles.trustDot} />
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>Reliable</Text>
          <View style={styles.trustDot} />
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>Trusted</Text>
        </View>
      </Animated.View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  cards: { flex: 1, gap: 16, justifyContent: 'center', marginTop: 24 },
  card: {
    borderRadius: 14,
    borderTopWidth: 4,
    height: 200,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  patternCircleLarge: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  patternCircleSmall: {
    position: 'absolute',
    bottom: 70,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  tagChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, fontWeight: '700', color: '#2C1F0F', letterSpacing: 0.5 },
  iconBadge: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  iconBadgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTextWrap: { padding: 18, paddingRight: 70 },
  cardTitle: { fontSize: 19, fontWeight: '700', color: '#FFFFFF' },
  cardDesc: { fontSize: 13, color: '#F0EDE7', marginTop: 4, lineHeight: 18 },
  arrowCircle: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EDE6D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  trustText: { fontSize: 12, letterSpacing: 0.3 },
  trustDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#8A7F6C' },
});
