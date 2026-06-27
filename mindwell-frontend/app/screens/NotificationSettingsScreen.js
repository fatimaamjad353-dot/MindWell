import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  saveNotificationSettings
} from '../utils/notificationStorage';
import {
  requestNotificationPermission,
  scheduleMindWellReminders,
  sendTestNotification
} from '../utils/notificationService';

const TIMES = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '9:30 PM', hour: 21, minute: 30 }
];

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getNotificationSettings().then(saved => {
        setSettings(saved);
        setLoading(false);
      });
    }, [])
  );

  const update = (field, value) => {
    setSettings(current => ({ ...current, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const enabled = settings.moodReminder || settings.streakReminder;
      if (enabled && !(await requestNotificationPermission(settings))) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications for MindWell in your phone settings, then try again.'
        );
        return;
      }
      await saveNotificationSettings(settings);
      await scheduleMindWellReminders(settings);
      Alert.alert(
        'Notification settings saved',
        enabled
          ? 'Your reminders have been scheduled.'
          : 'All MindWell reminders are turned off.'
      );
    } catch {
      Alert.alert('Could not save', 'Notification settings could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    try {
      if (!(await requestNotificationPermission(settings))) {
        Alert.alert('Permission needed', 'Please allow notifications to run a test.');
        return;
      }
      await sendTestNotification(settings);
      Alert.alert('Test scheduled', 'A test notification should appear in about two seconds.');
    } catch {
      Alert.alert('Test failed', 'This device could not schedule the test notification.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.recommendation}>
          <Text style={styles.recommendationTitle}>Recommended setup</Text>
          <Text style={styles.recommendationText}>
            Use one daily reminder at a calm, consistent time. Enable the streak reminder only if a second prompt feels helpful rather than stressful.
          </Text>
        </View>

        <View style={styles.section}>
          <SettingSwitch
            title="Daily mood reminder"
            subtitle="A gentle prompt to record today’s mood."
            value={settings.moodReminder}
            onValueChange={value => update('moodReminder', value)}
          />
          <SettingSwitch
            title="Streak reminder"
            subtitle="A second reminder two hours later to protect your streak."
            value={settings.streakReminder}
            onValueChange={value => update('streakReminder', value)}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reminder time</Text>
          <Text style={styles.sectionSubtitle}>Choose a time when you are usually free to reflect.</Text>
          <View style={styles.timeGrid}>
            {TIMES.map(time => {
              const selected =
                settings.hour === time.hour && settings.minute === time.minute;
              return (
                <TouchableOpacity
                  key={time.label}
                  style={[styles.timeButton, selected && styles.timeButtonActive]}
                  onPress={() => setSettings(current => ({
                    ...current,
                    hour: time.hour,
                    minute: time.minute
                  }))}
                >
                  <Text style={[styles.timeText, selected && styles.timeTextActive]}>
                    {time.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SettingSwitch
            title="Notification sound"
            subtitle="Play the device’s default notification sound."
            value={settings.sound}
            onValueChange={value => update('sound', value)}
          />
          <SettingSwitch
            title="Vibration"
            subtitle="Vibrate when the reminder arrives."
            value={settings.vibration}
            onValueChange={value => update('vibration', value)}
          />
        </View>

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Healthy notification guidance</Text>
          <Text style={styles.guidanceItem}>• Prefer one reminder per day.</Text>
          <Text style={styles.guidanceItem}>• Avoid reminders during sleep, work, or therapy sessions.</Text>
          <Text style={styles.guidanceItem}>• Keep sensitive details out of lock-screen messages.</Text>
          <Text style={styles.guidanceItem}>• Turn sound off if reminders create anxiety.</Text>
          <Text style={styles.guidanceItem}>• Crisis and appointment alerts should remain separate from wellness nudges.</Text>
        </View>

        <TouchableOpacity style={styles.testButton} onPress={test}>
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save Notification Settings</Text>
          }
        </TouchableOpacity>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

function SettingSwitch({ title, subtitle, value, onValueChange }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D8D8D8', true: '#A9A4FF' }}
        thumbColor={value ? '#6C63FF' : '#F5F5F5'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  recommendation: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  recommendationTitle: { color: '#176C52', fontSize: 15, fontWeight: '800' },
  recommendationText: { color: '#3B665A', fontSize: 12, lineHeight: 18, marginTop: 5 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  settingRow: { minHeight: 82, padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  settingInfo: { flex: 1, paddingRight: 12 },
  settingTitle: { color: '#1a1a2e', fontSize: 15, fontWeight: '700' },
  settingSubtitle: { color: '#777', fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, elevation: 2 },
  sectionTitle: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: '#777', fontSize: 12, marginTop: 4, marginBottom: 12 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#FAFAFA' },
  timeButtonActive: { borderColor: '#6C63FF', backgroundColor: '#6C63FF' },
  timeText: { color: '#555', fontSize: 13, fontWeight: '600' },
  timeTextActive: { color: '#fff' },
  guidance: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff', elevation: 2 },
  guidanceTitle: { color: '#1a1a2e', fontSize: 15, fontWeight: '800', marginBottom: 7 },
  guidanceItem: { color: '#666', fontSize: 12, lineHeight: 19 },
  testButton: { marginHorizontal: 16, marginBottom: 10, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  testButtonText: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },
  saveButton: { marginHorizontal: 16, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6C63FF', elevation: 3 },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bottomSpace: { height: 30 }
});
