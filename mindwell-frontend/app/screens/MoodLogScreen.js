import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { logMoodEntry } from '../utils/apiService';

const MOODS = [
  { emoji: '😄', label: 'Amazing', score: 10, color: '#4CAF50' },
  { emoji: '🙂', label: 'Good', score: 7, color: '#8BC34A' },
  { emoji: '😐', label: 'Okay', score: 5, color: '#FFC107' },
  { emoji: '😔', label: 'Low', score: 3, color: '#FF9800' },
  { emoji: '😢', label: 'Terrible', score: 1, color: '#F44336' }
];

const ACTIVITIES = [
  'Exercise 🏃',
  'Sleep 😴',
  'Work 💼',
  'Family 👨‍👩‍👧',
  'Friends 👥',
  'Meditation 🧘',
  'Reading 📚',
  'Music 🎵'
];

export default function MoodLogScreen({ navigation }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleActivity = activity => {
    setActivities(current =>
      current.includes(activity)
        ? current.filter(item => item !== activity)
        : [...current, activity]
    );
  };

  const handleSave = async () => {
    if (selectedMood === null) {
      Alert.alert('Select a mood', 'Please select how you feel first.');
      return;
    }

    setSaving(true);
    const mood = MOODS[selectedMood];
    console.log('[MoodLogScreen] save mood', { mood: mood.label, note, activities });

    try {
      const response = await logMoodEntry({
        moodScore: mood.score,
        moodType: mood.label,
        notes: note,
        activities
      });

      console.log('[MoodLogScreen] mood saved', response);
      Alert.alert('Mood saved', 'Your mood was added to your history.', [
        { text: 'View History', onPress: () => navigation.replace('Progress') },
        { text: 'Done', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.log('[MoodLogScreen] mood save failed', error.message || error);
      Alert.alert('Could not save mood', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Your Mood</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling? *</Text>
        <View style={styles.moodGrid}>
          {MOODS.map((mood, index) => (
            <TouchableOpacity
              key={mood.label}
              style={[
                styles.moodBtn,
                selectedMood === index && {
                  borderColor: mood.color,
                  backgroundColor: `${mood.color}20`
                }
              ]}
              onPress={() => setSelectedMood(index)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
              <Text style={[styles.moodScore, { color: mood.color }]}>
                {mood.score}/10
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What did you do today?</Text>
        <View style={styles.activityGrid}>
          {ACTIVITIES.map(activity => {
            const selected = activities.includes(activity);
            return (
              <TouchableOpacity
                key={activity}
                style={[styles.actBtn, selected && styles.actBtnActive]}
                onPress={() => toggleActivity(activity)}
              >
                <Text style={[styles.actText, selected && styles.actTextActive]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a note (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="How was your day? What's on your mind?"
          placeholderTextColor="#aaa"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Mood Entry</Text>
        }
      </TouchableOpacity>
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  moodGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, width: '18.5%', elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 10, color: '#333', marginTop: 4, fontWeight: '600', textAlign: 'center' },
  moodScore: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, elevation: 2, borderWidth: 1.5, borderColor: '#ddd' },
  actBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  actText: { color: '#555', fontSize: 13, fontWeight: '500' },
  actTextActive: { color: '#fff' },
  noteInput: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 15, color: '#333', borderWidth: 1.5, borderColor: '#ddd', minHeight: 110, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#6C63FF', marginHorizontal: 16, paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 3 },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSpace: { height: 30 }
});
