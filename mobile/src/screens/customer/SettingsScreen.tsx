import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import { loadNotificationPreferences, saveNotificationPreferences } from '../../services/notificationPreferences';

const APP_VERSION = '1.0.0';

export default function SettingsScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    in_app_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    sms_transactional_only: true,
  });

  useEffect(() => {
    loadNotificationPreferences(user?.userId).then((prefs) => setSettings(prefs));
  }, [user?.userId]);

  const updateSetting = async (key: string, value: boolean) => {
    const next = { ...settings, [key]: value } as typeof settings;
    setSettings(next);
    await saveNotificationPreferences(user?.userId, next);
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
            label="In-app Notifications"
            sub="Show alerts inside the app"
            value={settings.in_app_enabled}
            onChange={(v: boolean) => updateSetting('in_app_enabled', v)}
          />
          <Row
            label="Push Notifications"
            sub="Booking confirmations and updates"
            value={settings.push_enabled}
            onChange={(v: boolean) => updateSetting('push_enabled', v)}
          />
          <Row
            label="SMS Notifications"
            sub="Transactional alerts only"
            value={settings.sms_enabled}
            onChange={(v: boolean) => updateSetting('sms_enabled', v)}
          />
          <Row
            label="Transactional SMS only"
            sub="Only payment and booking updates"
            value={settings.sms_transactional_only}
            onChange={(v: boolean) => updateSetting('sms_transactional_only', v)}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EMAIL</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.row, { borderBottomColor: theme.border }]}> 
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Email Updates</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>News, offers and tips from StyleBook</Text>
            </View>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>Coming soon</Text>
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
