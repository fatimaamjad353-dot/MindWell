import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';

const TIME_SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '3:30 PM', '5:00 PM'];

const getNextDates = () =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });

export default function BookingScreen({ navigation, route }) {
  const { therapist, initialSessionType = 'video' } = route.params || {};
  const dates = useMemo(getNextDates, []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [sessionType, setSessionType] = useState(initialSessionType);

  const continueToPayment = () => {
    if (!selectedTime) {
      Alert.alert('Select a time', 'Please choose an available time slot.');
      return;
    }

    navigation.navigate('Payment', {
      therapist,
      sessionType,
      appointmentDate: selectedDate.toISOString(),
      appointmentTime: selectedTime
    });
  };

  if (!therapist) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>Therapist information is missing.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.therapistCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{therapist.emoji}</Text>
          </View>
          <View style={styles.therapistInfo}>
            <Text style={styles.therapistName}>{therapist.name}</Text>
            <Text style={styles.specialty}>{therapist.specialty}</Text>
            <Text style={styles.fee}>PKR {therapist.fee} · 45 minutes</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Type</Text>
          <View style={styles.typeRow}>
            {['video', 'audio', 'text'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, sessionType === type && styles.typeBtnActive]}
                onPress={() => setSessionType(type)}
              >
                <Text style={styles.typeEmoji}>
                  {type === 'video' ? '📹' : type === 'audio' ? '🎙️' : '💬'}
                </Text>
                <Text style={[styles.typeText, sessionType === type && styles.typeTextActive]}>
                  {type[0].toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map(date => {
              const selected = date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.dateCard, selected && styles.dateCardActive]}
                  onPress={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                >
                  <Text style={[styles.dateDay, selected && styles.dateTextActive]}>
                    {date.toLocaleDateString(undefined, { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dateNumber, selected && styles.dateTextActive]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[styles.dateMonth, selected && styles.dateTextActive]}>
                    {date.toLocaleDateString(undefined, { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.slotGrid}>
            {TIME_SLOTS.map(time => {
              const selected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.slot, selected && styles.slotActive]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Appointment Summary</Text>
          <Text style={styles.summaryText}>
            {selectedDate.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          <Text style={styles.summaryText}>
            {selectedTime || 'No time selected'} · {sessionType[0].toUpperCase() + sessionType.slice(1)}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={continueToPayment}>
          <Text style={styles.primaryBtnText}>Continue to Payment →</Text>
        </TouchableOpacity>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  therapistCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', elevation: 3 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F0EFFF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 32 },
  therapistInfo: { flex: 1 },
  therapistName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  specialty: { fontSize: 13, color: '#6C63FF', marginTop: 3 },
  fee: { fontSize: 13, color: '#777', marginTop: 5 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e5e5' },
  typeBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  typeEmoji: { fontSize: 20, marginBottom: 4 },
  typeText: { color: '#555', fontSize: 12, fontWeight: '600' },
  typeTextActive: { color: '#fff' },
  dateCard: { width: 72, paddingVertical: 12, marginRight: 9, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e5e5' },
  dateCardActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  dateDay: { fontSize: 11, color: '#777', fontWeight: '600' },
  dateNumber: { fontSize: 22, color: '#222', fontWeight: '800', marginVertical: 3 },
  dateMonth: { fontSize: 11, color: '#777' },
  dateTextActive: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '31%', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#dcdcdc', paddingVertical: 11, alignItems: 'center' },
  slotActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  slotText: { color: '#555', fontSize: 13, fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  summary: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 7 },
  summaryText: { fontSize: 13, color: '#666', marginTop: 3 },
  primaryBtn: { backgroundColor: '#6C63FF', marginHorizontal: 16, paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 3 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSpace: { height: 30 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EFFF', padding: 24 },
  missingTitle: { fontSize: 17, color: '#333', marginBottom: 20, textAlign: 'center' }
});
