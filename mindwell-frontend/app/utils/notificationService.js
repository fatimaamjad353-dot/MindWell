import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_PREFIX = 'mindwell-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const channelIdFor = settings =>
  `${CHANNEL_PREFIX}-${settings.sound ? 'sound' : 'silent'}-${settings.vibration ? 'vibrate' : 'still'}`;

async function ensureAndroidChannel(settings) {
  if (Platform.OS !== 'android') return undefined;

  const channelId = channelIdFor(settings);
  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'MindWell reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: settings.sound ? 'default' : null,
    enableVibrate: settings.vibration,
    vibrationPattern: settings.vibration ? [0, 250, 200, 250] : [0],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
  });
  return channelId;
}

export async function requestNotificationPermission(settings) {
  await ensureAndroidChannel(settings);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleMindWellReminders(settings) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.moodReminder && !settings.streakReminder) {
    return;
  }

  const channelId = await ensureAndroidChannel(settings);
  const commonContent = {
    sound: settings.sound ? 'default' : undefined,
    vibrate: settings.vibration ? [0, 250, 200, 250] : [0],
    data: { screen: 'MoodLog' }
  };

  if (settings.moodReminder) {
    await Notifications.scheduleNotificationAsync({
      content: {
        ...commonContent,
        title: 'How are you feeling today?',
        body: 'Take a quiet moment to record your mood in MindWell.'
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId
      }
    });
  }

  if (settings.streakReminder) {
    const streakHour = (settings.hour + 2) % 24;
    await Notifications.scheduleNotificationAsync({
      content: {
        ...commonContent,
        title: 'Keep your mood streak going',
        body: 'A short mood check-in keeps your wellness history complete.'
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: streakHour,
        minute: settings.minute,
        channelId
      }
    });
  }
}

export async function sendTestNotification(settings) {
  const channelId = await ensureAndroidChannel(settings);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'MindWell reminder test',
      body: 'Your mood reminders are ready.',
      sound: settings.sound ? 'default' : undefined,
      vibrate: settings.vibration ? [0, 250, 200, 250] : [0]
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId
    }
  });
}
