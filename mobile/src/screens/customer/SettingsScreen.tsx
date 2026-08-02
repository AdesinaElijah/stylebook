import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import { notificationsAPI, NotificationPreferences } from '../../services/api';

const APP_VERSION = '1.0.0';
const SETTINGS_KEY = 'stylebook_customer_settings';

/**
 * Declared at module scope, not inside the screen.
 *
 * <p>A component defined inside another is a brand-new type on every render, so React
 * unmounts and remounts it rather than updating it — which resets the Switch mid-animation
 * every time any toggle changes.
 */
function Row({ label, sub, value, onChange, theme }: any) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
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
}

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: true,
  bookingEnabled: true,
  messageEnabled: true,
  reviewEnabled: true,
  socialEnabled: true,
  paymentEnabled: true,
};

export default function SettingsScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Device-local settings — these drive behaviour on this phone only.
  const [settings, setSettings] = useState({
    bookingReminders: true,
    emailUpdates: false,
  });

  // Server-side settings — these follow the account across devices.
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((saved) => {
      if (saved) setSettings((current) => ({ ...current, ...JSON.parse(saved) }));
    });

    notificationsAPI
      .getPreferences()
      .then((res) => setPrefs({ ...DEFAULT_PREFS, ...res.data }))
      .catch(() => {}); // offline: fall back to defaults, nothing is lost
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

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

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            theme={theme}
            label={isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            sub="Light mode is the default"
            value={isDark}
            onChange={toggleTheme}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            theme={theme}
            label="Push Notifications"
            sub="Turn this off to silence all push on every device"
            value={prefs.pushEnabled}
            onChange={(v: boolean) => updatePref('pushEnabled', v)}
          />
          <Row
            theme={theme}
            label="Booking Updates"
            sub="When a shop confirms or cancels your appointment"
            value={prefs.bookingEnabled}
            onChange={(v: boolean) => updatePref('bookingEnabled', v)}
          />
          <Row
            theme={theme}
            label="Messages"
            sub="New messages from shops you've booked"
            value={prefs.messageEnabled}
            onChange={(v: boolean) => updatePref('messageEnabled', v)}
          />
          <Row
            theme={theme}
            label="Likes & Comments"
            sub="Activity on posts you interact with"
            value={prefs.socialEnabled}
            onChange={(v: boolean) => updatePref('socialEnabled', v)}
          />
          <Row
            theme={theme}
            label="Appointment Reminders"
            sub="Alert 10 minutes before your appointment (this device)"
            value={settings.bookingReminders}
            onChange={(v: boolean) => updateSetting('bookingReminders', v)}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EMAIL</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            theme={theme}
            label="Email Updates"
            sub="News, offers and tips from StyleBook"
            value={settings.emailUpdates}
            onChange={(v: boolean) => updateSetting('emailUpdates', v)}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>App Version</Text>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{APP_VERSION}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.signOutBtn, { borderColor: '#f44336' }]} onPress={logout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 16 },
  backText: { fontSize: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '900' },
  scroll: { padding: 20, paddingTop: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 8, letterSpacing: 1 },
  card: { borderRadius: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 0,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 14 },
  signOutBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, marginTop: 32,
  },
  signOutText: { color: '#f44336', fontSize: 15, fontWeight: '700' },
});
