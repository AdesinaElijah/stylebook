import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsAPI } from './api';

/**
 * Expo push token handling.
 *
 * The backend stores one token per signed-in device and pushes through Expo's service,
 * so there is no Firebase config to maintain here. Every function below is best-effort:
 * push not working should never block sign-in or sign-out.
 */

const PROJECT_ID =
  (Constants.expoConfig?.extra as any)?.eas?.projectId ??
  (Constants as any)?.easConfig?.projectId;

/** Cached so logout can unregister the exact token we registered. */
let cachedToken: string | null = null;

/**
 * Asks for notification permission and returns this device's Expo push token.
 *
 * Returns null when the user declines, or in environments that can't issue a token
 * (Expo Go on Android, simulators). That's expected, not an error.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      // Android needs a channel before notifications will display.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const result = await Notifications.getExpoPushTokenAsync(
      PROJECT_ID ? { projectId: PROJECT_ID } : undefined
    );

    cachedToken = result.data;
    return cachedToken;
  } catch (error) {
    // No token available in this environment — app works fine without push.
    console.log('Push token unavailable:', error);
    return null;
  }
}

/**
 * Registers this device with the backend. Called after every login, because tokens
 * rotate and the same handset may be used by a different account.
 */
export async function registerForPush(): Promise<void> {
  const token = await getPushToken();
  if (!token) return;

  try {
    await notificationsAPI.registerDevice({
      token,
      platform: Platform.OS.toUpperCase(),
    });
  } catch (error) {
    console.log('Device registration failed:', error);
  }
}

/** Stops push to this device. Called on sign-out. */
export async function unregisterForPush(): Promise<void> {
  const token = cachedToken;
  if (!token) return;

  try {
    await notificationsAPI.unregisterDevice(token);
  } catch (error) {
    console.log('Device unregistration failed:', error);
  } finally {
    cachedToken = null;
  }
}
