import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface NotificationPreferenceState {
  in_app_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  sms_transactional_only: boolean;
}

const STORAGE_KEY = 'stylebook_notification_preferences';

export async function loadNotificationPreferences(userId?: string): Promise<NotificationPreferenceState> {
  const fallback: NotificationPreferenceState = {
    in_app_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    sms_transactional_only: true,
  };

  if (!userId) {
    return fallback;
  }

  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached) {
      return { ...fallback, ...JSON.parse(cached) };
    }
  } catch {
    // ignore and fall back
  }

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data) {
    return { ...fallback, ...data };
  }

  return fallback;
}

export async function saveNotificationPreferences(userId: string | undefined, prefs: NotificationPreferenceState) {
  if (!userId) return;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

  if (!supabase) return;

  await supabase.from('notification_preferences').upsert({
    user_id: userId,
    ...prefs,
  });
}
