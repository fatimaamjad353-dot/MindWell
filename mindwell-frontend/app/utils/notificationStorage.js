import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@mindwell/notification-settings';

export const DEFAULT_NOTIFICATION_SETTINGS = {
  moodReminder: false,
  streakReminder: false,
  hour: 20,
  minute: 0,
  sound: true,
  vibration: true
};

export async function getNotificationSettings() {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    return stored
      ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
