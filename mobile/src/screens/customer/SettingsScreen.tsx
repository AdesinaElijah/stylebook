import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

const APP_VERSION = '1.0.0';
const SETTINGS_KEY = 'stylebook_customer_settings';

export default function SettingsScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    bookingReminders: true,
    emailUpdates: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((saved) => {
      if (saved) setSettings(JSON.parse(saved));
    });
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const Row = ({ label, sub, value, onChange }: any) => (
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
            label={isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
            sub="Light mode is the default"
            value={isDark}
            onChange={toggleTheme}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
            label="Push Notifications"
            sub="Booking confirmations and updates"
            value={settings.pushNotifications}
            onChange={(v: boolean) => updateSetting('pushNotifications', v)}
          />
          <Row
            label="Appointment Reminders"
            sub="Alert 10 minutes before your appointment"
            value={settings.bookingReminders}
            onChange={(v: boolean) => updateSetting('bookingReminders', v)}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EMAIL</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Row
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
