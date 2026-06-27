import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMySessionsApi, rateSessionApi } from '../utils/apiService';

const demoSessions = [
  { id: 'demo-1', therapist: 'Dr. Ayesha Khan', date: 'May 5, 2026', time: '10:00 AM', type: 'Video', status: 'Completed', duration: '45 min' },
  { id: 'demo-2', therapist: 'Dr. Omar Farooq', date: 'Apr 28, 2026', time: '3:00 PM', type: 'Audio', status: 'Completed', duration: '45 min' },
  { id: 'demo-3', therapist: 'Dr. Ayesha Khan', date: 'May 12, 2026', time: '11:00 AM', type: 'Video', status: 'Upcoming', duration: '45 min' }
];

export default function SessionLogsScreen({ navigation, route }) {
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [ratingSessionId, setRatingSessionId] = useState(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const recentBookingId = route.params?.recentBookingId;

  const loadData = useCallback(async () => {
    try {
      const response = await getMySessionsApi();
      const backendSessions = (response?.data || []).map(session => ({
        id: session._id || session.id,
        therapist: session.psychiatristId?.name || 'Psychiatrist',
        therapistId: session.psychiatristId?._id || session.psychiatristId?.id || null,
        date: session.dateTime ? new Date(session.dateTime).toISOString() : null,
        time: session.dateTime ? new Date(session.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time TBD',
        type: session.sessionType || 'Video',
        status: session.status || 'Pending',
        duration: '45 min',
        paymentStatus: session.paymentStatus || 'Pending',
        createdAt: session.createdAt
      }));
      setBookings(backendSessions);
    } catch {
      setBookings([]);
    }
    setRatings([]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sessions = useMemo(() => {
    return bookings.map(booking => ({
      ...booking,
      date: booking.date
        ? new Date(booking.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Date unavailable'
    }));
  }, [bookings]);

  const filtered = sessions.filter(session =>
    tab === 'all'
      ? true
      : tab === 'upcoming'
        ? session.status === 'Upcoming'
        : session.status === 'Completed'
  );

  const ratingFor = sessionId =>
    ratings.find(item => String(item.sessionId) === String(sessionId));

  const joinSession = session => {
    const type = String(session.type || 'Video').toLowerCase();
    const screen = type === 'text' ? 'TextSession' : 'TwilioCall';
    navigation.navigate(screen, {
      role: 'patient',
      session: {
        id: session.id,
        therapist: session.therapist,
        time: session.time,
        type: session.type
      }
    });
  };

  const openRating = session => {
    const existing = ratingFor(session.id);
    setRatingSessionId(session.id);
    setSelectedStars(existing?.stars || 0);
    setFeedback(existing?.note || '');
  };

  const submitRating = async session => {
    if (!selectedStars) {
      Alert.alert('Select a rating', 'Please choose between one and five stars.');
      return;
    }
    if (feedback.trim().length < 10) {
      Alert.alert('Add more detail', 'Please write at least 10 characters about your experience.');
      return;
    }

    try {
      await rateSessionApi(session.id, {
        rating: selectedStars,
        feedback: feedback.trim()
      });
      await loadData();
    } catch {
      Alert.alert('Could not save rating', 'Please try again.');
      return;
    }
    setRatingSessionId(null);
    setSelectedStars(0);
    setFeedback('');
    Alert.alert('Thank you', 'Your rating was shared with the psychiatrist.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sessions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        {['all', 'upcoming', 'completed'].map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.tab, tab === item && styles.tabActive]}
            onPress={() => setTab(item)}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item[0].toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(session => {
          const savedRating = ratingFor(session.id);
          const formOpen = ratingSessionId === session.id;

          return (
            <View
              key={session.id}
              style={[
                styles.card,
                session.id === recentBookingId && styles.recentCard
              ]}
            >
              <View style={styles.badgeRow}>
                {session.id === recentBookingId ? (
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>Recently booked</Text>
                  </View>
                ) : <View />}
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      session.status === 'Upcoming' ? '#E3F2FD' : '#E8F5E9'
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    {
                      color:
                        session.status === 'Upcoming' ? '#1565C0' : '#1D9E75'
                    }
                  ]}>
                    {session.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.therapistName}>{session.therapist}</Text>
                <Text style={styles.sessionMeta}>{session.date} • {session.time}</Text>
                <Text style={styles.sessionMeta}>{session.type} • {session.duration}</Text>
                <Text style={styles.paymentStatus}>
                  {session.paymentStatus ? `✓ Payment ${session.paymentStatus}` : ' '}
                </Text>
              </View>

              <View style={styles.cardActions}>
                {session.status === 'Pending' || session.status === 'Upcoming' ? (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => joinSession(session)}
                  >
                    <Text style={styles.joinBtnText}>Join Session</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={savedRating ? styles.ratedBtn : styles.rateBtn}
                    onPress={() => formOpen ? setRatingSessionId(null) : openRating(session)}
                  >
                    <Text style={savedRating ? styles.ratedBtnText : styles.rateBtnText}>
                      {savedRating
                        ? `${'★'.repeat(savedRating.stars)}${'☆'.repeat(5 - savedRating.stars)}  Edit Feedback`
                        : '☆ Rate Psychiatrist'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {formOpen && (
                <View style={styles.ratingForm}>
                  <Text style={styles.ratingTitle}>How was your psychiatrist?</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        style={styles.starButton}
                        onPress={() => setSelectedStars(star)}
                      >
                        <Text style={[
                          styles.star,
                          star <= selectedStars && styles.starSelected
                        ]}>
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingHint}>
                    {selectedStars
                      ? `${selectedStars} out of 5 stars`
                      : 'Tap a star to rate'}
                  </Text>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Share what was helpful and what could be improved..."
                    placeholderTextColor="#aaa"
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.characterCount}>{feedback.length}/500</Text>
                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setRatingSessionId(null)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={() => submitRating(session)}
                    >
                      <Text style={styles.submitBtnText}>Submit Feedback</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {!filtered.length && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No sessions found</Text>
          </View>
        )}
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
  tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, margin: 16, borderRadius: 12, elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  recentCard: { borderWidth: 2, borderColor: '#6C63FF' },
  badgeRow: { minHeight: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentBadge: { backgroundColor: '#F0EFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  recentBadgeText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { minHeight: 105, paddingTop: 8 },
  therapistName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  sessionMeta: { fontSize: 13, color: '#888', marginTop: 5 },
  paymentStatus: { color: '#1D9E75', fontSize: 12, fontWeight: '600', marginTop: 6, minHeight: 16 },
  cardActions: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  joinBtn: { backgroundColor: '#6C63FF', height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rateBtn: { backgroundColor: '#FFF9C4', height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFC107' },
  rateBtnText: { color: '#B26A00', fontWeight: '700', fontSize: 14 },
  ratedBtn: { backgroundColor: '#E8F5E9', height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1D9E75' },
  ratedBtnText: { color: '#1D9E75', fontWeight: '700', fontSize: 12 },
  ratingForm: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#eee' },
  ratingTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  starButton: { paddingHorizontal: 4, paddingVertical: 3 },
  star: { fontSize: 34, color: '#D6D6D6' },
  starSelected: { color: '#FFC107' },
  ratingHint: { fontSize: 12, color: '#777', textAlign: 'center', marginBottom: 12 },
  feedbackInput: { minHeight: 100, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, padding: 12, color: '#333', backgroundColor: '#FAFAFA', textAlignVertical: 'top' },
  characterCount: { fontSize: 10, color: '#999', textAlign: 'right', marginTop: 4 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '700' },
  submitBtn: { flex: 2, height: 42, borderRadius: 10, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
  bottomSpace: { height: 30 }
});
