import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert,
} from 'react-native';
import { shopsAPI, notificationsAPI, NotificationPreferences } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import PlanCheckoutModal from '../../components/PlanCheckoutModal';

const APP_VERSION = '1.0.0';

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: true,
  bookingEnabled: true,
  messageEnabled: true,
  reviewEnabled: true,
  socialEnabled: true,
  paymentEnabled: true,
};

const PLAN_INFO: any = {
  FREE: { price: 'GHS 0/mo', desc: '10 bookings, 3 photos, 5 posts' },
  PRO: { price: 'GHS 120/mo', desc: 'Unlimited everything + analytics' },
  ENTERPRISE: { price: 'GHS 300/mo', desc: 'Multi-branch + sponsored pins' },
};

export default function OwnerSettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [shop, setShop] = useState<any>(null);

  // The plan being paid for, or null when the checkout sheet is closed.
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  // Server-side settings — these follow the account across devices.
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    shopsAPI.getMyShop().then((res) => setShop(res.data)).catch(() => {});

    notificationsAPI
      .getPreferences()
      .then((res) => setPrefs({ ...DEFAULT_PREFS, ...res.data }))
      .catch(() => {}); // offline: fall back to defaults, nothing is lost
  }, []);

  /**
   * Flips a server-side toggle. The switch moves immediately and rolls back if the
   * request fails, so the UI never shows a setting that didn't actually save.
   */
  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const previous = prefs;
    const patch: Partial<NotificationPreferences> = { [key]: value };

    setPrefs({ ...prefs, ...patch });
    try {
      await notificationsAPI.updatePreferences(patch);
    } catch {
      setPrefs(previous);
    }
  };

  /** Applies the plan change on the server. Shared by both the paid and free paths. */
  const applyPlan = async (pl: string) => {
    try {
      const response = await shopsAPI.updatePlan({ plan: pl });
      setShop(response.data);
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change plan');
      return false;
    }
  };

  /**
   * Upgrades go through the checkout sheet; downgrading to Free doesn't, since there's
   * nothing to pay and asking for card details to spend less would be absurd.
   */
  const changePlan = (pl: string) => {
    if (pl === 'FREE') {
      Alert.alert(
        'Switch to Free?',
        PLAN_INFO[pl]?.desc + '\n\nYou will lose access to your current plan\'s features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            style: 'destructive',
            onPress: async () => {
              if (await applyPlan(pl)) {
                Alert.alert('Done', 'Your shop is now on the Free plan.');
              }
            },
          },
        ]
      );
      return;
    }

    setCheckoutPlan(pl);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const Row = ({ label, sub, value, onChange }: any) => (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.surfaceSecondary, true: theme.accent }}
        thumbColor="#fff"
      />
    </View>
  );

  const plan = shop?.plan || 'FREE';

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>
              {(shop?.name || user?.fullName || 'S').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>{shop?.name}</Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.planPill, { borderColor: theme.border }]}>
            <Text style={[styles.planPillText, { color: theme.textSecondary }]}>{plan} PLAN</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            label={isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            sub={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            value={isDark}
            onChange={toggleTheme}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            label="Push Notifications"
            sub="Turn this off to silence all push on every device"
            value={prefs.pushEnabled}
            onChange={(v: boolean) => updatePref('pushEnabled', v)}
          />
          <Row
            label="Booking Alerts"
            sub="New booking requests and cancellations"
            value={prefs.bookingEnabled}
            onChange={(v: boolean) => updatePref('bookingEnabled', v)}
          />
          <Row
            label="Review Alerts"
            sub="When a customer leaves a review"
            value={prefs.reviewEnabled}
            onChange={(v: boolean) => updatePref('reviewEnabled', v)}
          />
          <Row
            label="Messages"
            sub="New messages from customers"
            value={prefs.messageEnabled}
            onChange={(v: boolean) => updatePref('messageEnabled', v)}
          />
          <Row
            label="Post Activity"
            sub="Likes and comments on your posts"
            value={prefs.socialEnabled}
            onChange={(v: boolean) => updatePref('socialEnabled', v)}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>YOUR PLAN</Text>
        {['FREE', 'PRO', 'ENTERPRISE'].map((pl) => (
          <View
            key={pl}
            style={[
              styles.planCard,
              { backgroundColor: theme.surface, marginBottom: 10 },
              pl === plan
                ? { borderColor: theme.accent, borderWidth: 1.5 }
                : { borderWidth: 0 },
            ]}
          >
            <View style={styles.planRow}>
              <Text style={[styles.planName, { color: theme.text }]}>
                {pl} {pl === 'PRO' ? '⭐' : ''}
              </Text>
              <Text style={[styles.planPrice, { color: theme.accent }]}>
                {PLAN_INFO[pl]?.price}
              </Text>
            </View>
            <Text style={[styles.planDesc, { color: theme.textSecondary }]}>
              {PLAN_INFO[pl]?.desc}
            </Text>
            {pl === plan ? (
              <Text style={styles.currentPlanTag}>✓ Current plan</Text>
            ) : (
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: theme.accent }]}
                onPress={() => changePlan(pl)}
              >
                <Text style={styles.upgradeBtnText}>
                  {pl === 'FREE' ? 'Switch to Free' : 'Upgrade to ' + pl}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>App Version</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{APP_VERSION}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>

      <PlanCheckoutModal
        visible={checkoutPlan !== null}
        planName={checkoutPlan}
        price={checkoutPlan ? PLAN_INFO[checkoutPlan]?.price : ''}
        onCancel={() => setCheckoutPlan(null)}
        onPaid={async () => {
          const target = checkoutPlan;
          setCheckoutPlan(null);
          if (target) await applyPlan(target);
        }}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '900' },
  scroll: { padding: 20, paddingTop: 8 },
  profileCard: {
    alignItems: 'center', borderRadius: 20, padding: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#000', fontSize: 30, fontWeight: '900' },
  profileName: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  profileEmail: { fontSize: 13, marginTop: 4 },
  planPill: {
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12,
  },
  planPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 24, marginBottom: 8, letterSpacing: 1 },
  card: { borderRadius: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 14 },
  planCard: { borderRadius: 16, padding: 16, borderWidth: 1.5 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  planName: { fontSize: 18, fontWeight: '800' },
  planPrice: { fontSize: 15, fontWeight: '700' },
  planDesc: { fontSize: 13 },
  currentPlanTag: { color: '#2E7D32', fontWeight: '700', fontSize: 12, marginTop: 10 },
  upgradeBtn: { borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  upgradeBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  signOutBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#f44336', marginTop: 32,
  },
  signOutText: { color: '#f44336', fontSize: 15, fontWeight: '700' },
});
