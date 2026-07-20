import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getPsychiatristSessions } from '../utils/apiService';

export default function PsychScheduleScreen({ navigation }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('online');
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const result = await getPsychiatristSessions();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const mapped = result.data.map(s => ({
          time: new Date(s.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          patient: s.patientId?.name || 'Patient',
          type: s.sessionType,
          status: s.status.toLowerCase(),
          sessionId: s._id,
          meetingLink: s.meetingLink,
          date: new Date(s.dateTime) >= today && new Date(s.dateTime) < tomorrow
            ? 'Today'
            : new Date(s.dateTime) >= tomorrow && new Date(s.dateTime) < dayAfter
            ? 'Tomorrow'
            : 'Upcoming'
        }));
        setSchedule(mapped);
      } catch (error) {
        console.error('Schedule error:', error);
      }
    };
    loadSchedule();
  }, []);

  const availability = [
    { day: 'Mon', slots: ['9AM', '11AM', '2PM', '4PM'], active: true },
    { day: 'Tue', slots: ['10AM', '12PM', '3PM'], active: true },
    { day: 'Wed', slots: ['9AM', '2PM', '4PM'], active: true },
    { day: 'Thu', slots: ['11AM', '1PM'], active: true },
    { day: 'Fri', slots: ['9AM', '11AM'], active: true },
    { day: 'Sat', slots: [], active: false },
    { day: 'Sun', slots: [], active: false },
  ];

  const joinSession = session => {
    const type = String(session.type || 'Video').toLowerCase();
    const screen = type === 'text' ? 'TextSession' : 'TwilioCall';
    navigation.navigate(screen, {
      role: 'psychologist',
      session: {
        id: `psych-${session.patient}-${session.time}`,
        patient: session.patient,
        time: session.time,
        type: session.type
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.mySchedule}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Your Status</Text>
        <View style={styles.statusRow}>
          {['online', 'busy', 'away'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBtn, status === s && styles.statusBtnActive(s)]}
              onPress={() => setStatus(s)}
            >
              <Text style={styles.statusBtnText}>
                {s === 'online' ? '🟢' : s === 'busy' ? '🔴' : '🟡'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
        {['Today', 'Tomorrow'].map((day) => (
          <View key={day}>
            <Text style={styles.dayLabel}>{day}</Text>
            {schedule.filter(s => s.date === day).map((s, i) => (
              <View key={i} style={styles.sessionCard}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionTime}>{s.time}</Text>
                  <Text style={styles.sessionPatient}>{s.patient}</Text>
                  <Text style={styles.sessionType}>{s.type} Session</Text>
                </View>
                <View style={styles.sessionRight}>
                  <View style={[styles.statusBadge, { backgroundColor: s.status === 'confirmed' ? '#E8F5E9' : '#FFF9C4' }]}>
                    <Text style={[styles.statusBadgeText, { color: s.status === 'confirmed' ? '#1D9E75' : '#F57F17' }]}>
                      {s.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                    </Text>
                  </View>
                  {s.status === 'confirmed' && (
                    <TouchableOpacity style={styles.joinBtn} onPress={() => joinSession(s)}>
                      <Text style={styles.joinBtnText}>{t.joinNow}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Weekly Availability</Text>
        {availability.map((day, i) => (
          <View key={i} style={styles.availRow}>
            <Text style={styles.availDay}>{day.day}</Text>
            <View style={styles.availSlots}>
              {day.active ? day.slots.map((slot, j) => (
                <View key={j} style={styles.slot}><Text style={styles.slotText}>{slot}</Text></View>
              )) : <Text style={styles.offText}>Off</Text>}
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Edit', `Edit ${day.day} availability`)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statusCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#F0EFFF', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  statusBtnActive: (s) => ({ borderColor: s === 'online' ? '#1D9E75' : s === 'busy' ? '#FF6B6B' : '#FFC107', backgroundColor: s === 'online' ? '#E8F5E9' : s === 'busy' ? '#FFEBEE' : '#FFF9C4' }),
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: '#6C63FF', marginBottom: 8, marginTop: 4 },
  sessionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  sessionLeft: {},
  sessionTime: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  sessionPatient: { fontSize: 14, color: '#333', marginTop: 2 },
  sessionType: { fontSize: 12, color: '#888', marginTop: 2 },
  sessionRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  joinBtn: { backgroundColor: '#1D9E75', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  joinBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  availRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, elevation: 1 },
  availDay: { width: 36, fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  availSlots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  slot: { backgroundColor: '#F0EFFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  slotText: { fontSize: 11, color: '#6C63FF', fontWeight: '500' },
  offText: { fontSize: 13, color: '#aaa' },
  editText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },
});