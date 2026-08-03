import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { shopsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';

const DAYS = [
  { id: 'MON', label: 'Monday' },
  { id: 'TUE', label: 'Tuesday' },
  { id: 'WED', label: 'Wednesday' },
  { id: 'THU', label: 'Thursday' },
  { id: 'FRI', label: 'Friday' },
  { id: 'SAT', label: 'Saturday' },
  { id: 'SUN', label: 'Sunday' },
];

export default function OpeningHoursScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<any>({});

  /** Day whose times failed validation, so its row can be highlighted. */
  const [invalidDay, setInvalidDay] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const response = await shopsAPI.getMyShop();
      const parsed = response.data.openingHours ? JSON.parse(response.data.openingHours) : {};
      const state: any = {};
      DAYS.forEach((day) => {
        const value = parsed[day.id];
        if (value && value !== 'CLOSED' && value.includes('-')) {
          const [open, close] = value.split('-');
          state[day.id] = { open: true, from: open.trim(), to: close.trim() };
        } else {
          state[day.id] = { open: false, from: '09:00', to: '18:00' };
        }
      });
      setHours(state);
    } catch (error) {
      Alert.alert('Error', 'Failed to load opening hours');
    } finally {
      setLoading(false);
    }
  };

  const validTime = (t: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(t.trim());

  const save = async () => {
    const result: any = {};
    for (const day of DAYS) {
      const d = hours[day.id];
      if (d.open) {
        if (!validTime(d.from) || !validTime(d.to)) {
          // Naming the day in an alert isn't enough on a seven-day list — the offending
          // row is usually scrolled out of sight. Flag it so the red border shows you
          // which field to fix.
          setInvalidDay(day.id);
          Alert.alert('Invalid time', day.label + ': use HH:MM format, e.g. 09:00');
          return;
        }
        result[day.id] = d.from.trim() + '-' + d.to.trim();
      }
    }
    setSaving(true);
    try {
      await shopsAPI.update({ openingHours: JSON.stringify(result) });
      Alert.alert('Saved', 'Opening hours updated!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayId: string, patch: any) => {
    // Editing the flagged day clears the highlight — the warning shouldn't outlive the fix.
    setInvalidDay((current) => (current === dayId ? null : current));
    setHours((prev: any) => ({ ...prev, [dayId]: { ...prev[dayId], ...patch } }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <ThemedScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Opening Hours</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Toggle a day on and set times as HH:MM (24-hour), e.g. 09:00 to 18:00
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {DAYS.map((day) => {
          const d = hours[day.id] || { open: false, from: '09:00', to: '18:00' };
          const flagged = invalidDay === day.id;
          const fieldStyle = (value: string) => [
            styles.timeInput,
            { backgroundColor: theme.background, color: theme.text },
            flagged && !validTime(value) && styles.timeInputInvalid,
          ];
          return (
            <View
              key={day.id}
              style={[
                styles.dayCard,
                { backgroundColor: theme.surface },
                flagged && styles.dayCardInvalid,
              ]}
            >
              <View style={styles.dayRow}>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{day.label}</Text>
                <View style={styles.dayToggle}>
                  <Text style={[styles.dayStatus, { color: d.open ? '#2E7D32' : theme.textTertiary }]}>
                    {d.open ? 'Open' : 'Closed'}
                  </Text>
                  <Switch
                    value={d.open}
                    onValueChange={(v) => updateDay(day.id, { open: v })}
                    trackColor={{ false: theme.surfaceSecondary, true: theme.accent }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
              {d.open && (
                <View style={styles.timesRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Opens</Text>
                    <TextInput
                      style={fieldStyle(d.from)}
                      value={d.from}
                      onChangeText={(v) => updateDay(day.id, { from: v })}
                      placeholder="09:00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <Text style={[styles.timeDash, { color: theme.textSecondary }]}>—</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Closes</Text>
                    <TextInput
                      style={fieldStyle(d.to)}
                      value={d.to}
                      onChangeText={(v) => updateDay(day.id, { to: v })}
                      placeholder="18:00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.accent }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#000" /> :
            <Text style={styles.saveBtnText}>Save Hours</Text>}
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 16, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  scroll: { padding: 20, paddingTop: 12 },
  dayCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  dayCardInvalid: { borderWidth: 1.5, borderColor: '#f44336' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontSize: 16, fontWeight: '700' },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayStatus: { fontSize: 13, fontWeight: '600' },
  timesRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12 },
  timeLabel: { fontSize: 12, marginBottom: 6 },
  timeInput: { borderRadius: 10, padding: 12, fontSize: 15, textAlign: 'center' },
  timeInputInvalid: { borderWidth: 1.5, borderColor: '#f44336' },
  timeDash: { fontSize: 16, paddingBottom: 14 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
