import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getMoodEntries, logMoodEntry } from '../utils/apiService';
import { getBookings } from '../utils/bookingStorage';

const getStartOfWeek = weekOffset => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + mondayOffset + weekOffset * 7);
  return date;
};

const getDateKey = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function PatientDashboard({ navigation, route }) {
  const { t, isRTL } = useLanguage();
  const user = route.params?.user;
  const [moodSelected, setMoodSelected] = useState(null);
  const [moodLogs, setMoodLogs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const loadDashboardData = useCallback(async () => {
    const [savedMoodLogs, savedBookings] = await Promise.all([
      getMoodEntries().then(response => response?.data || []).catch(() => []),
      getBookings()
    ]);
    setMoodLogs(savedMoodLogs.map(entry => ({
      id: entry._id || entry.id,
      score: entry.moodScore,
      mood: entry.moodType,
      emoji: entry.moodType === 'Amazing' ? '😄' : entry.moodType === 'Good' ? '🙂' : entry.moodType === 'Okay' ? '😐' : entry.moodType === 'Low' ? '😔' : '😢',
      color: entry.moodType === 'Amazing' ? '#4CAF50' : entry.moodType === 'Good' ? '#8BC34A' : entry.moodType === 'Okay' ? '#FFC107' : entry.moodType === 'Low' ? '#FF9800' : '#F44336',
      note: entry.notes,
      activities: entry.activities || [],
      createdAt: entry.timestamp || entry.createdAt
    })));
    setBookings(savedBookings);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const weekData = useMemo(() => {
    const start = getStartOfWeek(weekOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const entries = moodLogs.filter(
        log => getDateKey(new Date(log.createdAt)) === getDateKey(date)
      );
      const score = entries.length
        ? entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length
        : null;

      return {
        date,
        entries,
        score,
        emoji: entries[0]?.emoji
      };
    });
  }, [moodLogs, weekOffset]);

  const weeklyAverage = useMemo(() => {
    const entries = weekData.flatMap(day => day.entries);
    if (!entries.length) return null;
    return (
      entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length
    ).toFixed(1);
  }, [weekData]);

  const wellnessScore = useMemo(() => {
    if (!moodLogs.length) return null;
    const total = moodLogs.reduce((sum, log) => sum + log.score, 0);
    return total / moodLogs.length;
  }, [moodLogs]);

  const wellnessStatus = useMemo(() => {
    if (wellnessScore === null) {
      return {
        color: '#6C63FF',
        backgroundColor: '#F0EFFF',
        label: 'Welcome!'
      };
    }
    if (wellnessScore >= 7) {
      return {
        color: '#1D9E75',
        backgroundColor: '#E8F5E9',
        label: 'Doing well'
      };
    }
    if (wellnessScore >= 4) {
      return {
        color: '#F4A261',
        backgroundColor: '#FFF4E5',
        label: 'Keep going'
      };
    }
    return {
      color: '#FF6B6B',
      backgroundColor: '#FFEBEE',
      label: 'Needs care'
    };
  }, [wellnessScore]);

  const weekLabel = useMemo(() => {
    const start = weekData[0].date;
    const end = weekData[6].date;
    const startText = start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const endText = end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    return `${startText} – ${endText}`;
  }, [weekData]);

  const moods = [
    { emoji: '😄', label: t.amazing, score: 10, color: '#4CAF50' },
    { emoji: '🙂', label: t.good, score: 7, color: '#8BC34A' },
    { emoji: '😐', label: t.okay, score: 5, color: '#FFC107' },
    { emoji: '😔', label: t.low, score: 3, color: '#FF9800' },
    { emoji: '😢', label: t.terrible, score: 1, color: '#F44336' },
  ];

  const features = [
    { emoji: '🤖', title: t.aiCoach, subtitle: t.aiCoachSub, color: '#6C63FF', action: () => navigation.navigate('Chat') },
    { emoji: '👨‍⚕️', title: t.findTherapist, subtitle: t.findTherapistSub, color: '#1D9E75', action: () => navigation.navigate('FindTherapist') },
    { emoji: '😊', title: t.moodLog, subtitle: t.moodLogSub, color: '#F4A261', action: () => navigation.navigate('MoodLog') },
    { emoji: '📅', title: t.mySessions, subtitle: t.mySessionsSub, color: '#FF6B6B', action: () => navigation.navigate('SessionLogs') },
    { emoji: '📊', title: t.myProgress, subtitle: t.myProgressSub, color: '#845EC2', action: () => navigation.navigate('Progress') },
    { emoji: '💡', title: t.recommendations, subtitle: t.recommendationsSub, color: '#0081CF', action: () => navigation.navigate('Recommendations') },
  ];

  const handleMoodLog = async (mood, i) => {
    setMoodSelected(i);

    try {
      await logMoodEntry({
        moodScore: mood.score,
        moodType: mood.label,
        notes: '',
        activities: []
      });
      await loadDashboardData();
    } catch {
      Alert.alert('Could not save mood', 'Please try again.');
      return;
    }

    if (mood.score <= 3) {
      Alert.alert(
        '⚠️ Low Mood Detected',
        'We noticed you\'re not feeling well. Would you like to talk to the AI Coach or book a session?',
        [
          { text: 'Talk to AI', onPress: () => navigation.navigate('Chat') },
          { text: 'Book Session', onPress: () => navigation.navigate('FindTherapist') },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(t.moodLogged + ' 🎉', `${mood.emoji} ${mood.label} — ${mood.score}/10`);
    }
  };

  const recentSessions = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2),
    [bookings]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{t.hello}, {user?.name || 'there'} 👋</Text>
            <Text style={styles.greetingSub}>{t.howFeeling}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Settings', { user })}>
            <Text style={styles.avatarText}>{user?.name ? user.name[0].toUpperCase() : 'U'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.riskCard, { borderLeftColor: wellnessStatus.color }]}
        onPress={() =>
          wellnessScore === null
            ? navigation.navigate('MoodLog')
            : wellnessScore < 4
              ? navigation.navigate('RiskAlert')
              : navigation.navigate('Recommendations')
        }
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.riskTitle}>
            {wellnessScore === null ? `Welcome to MindWell, ${user?.name || 'friend'}!` : t.wellnessScore}
          </Text>
          <Text style={styles.riskSub}>
            {wellnessScore === null
              ? 'We are glad you are here. Log your first mood to begin your wellness journey.'
              : wellnessScore >= 7
                ? 'Your mood trend is positive. Keep taking care of yourself.'
                : wellnessScore >= 4
                  ? 'Small daily check-ins can help you understand your mood.'
                  : 'Your recent moods have been low. Support is available whenever you need it.'}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: wellnessStatus.backgroundColor }]}>
          <Text style={[styles.riskScore, { color: wellnessStatus.color }]}>
            {wellnessScore === null ? '♥' : wellnessScore.toFixed(1)}
          </Text>
          <Text style={[styles.riskLabel, { color: wellnessStatus.color }]}>
            {wellnessStatus.label}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.logMood}</Text>
        <View style={styles.moodRow}>
          {moods.map((mood, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.moodBtn, moodSelected === i && { borderColor: mood.color, borderWidth: 2.5, backgroundColor: mood.color + '15' }]}
              onPress={() => handleMoodLog(mood, i)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.moodProgressCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Progress')}
      >
        <View style={styles.moodProgressHeader}>
          <View style={styles.moodProgressInfo}>
            <Text style={styles.moodProgressTitle}>Weekly Mood</Text>
            {weeklyAverage === null ? (
              <Text style={styles.noAverageText}>
                No mood entries for this week.
              </Text>
            ) : (
              <Text style={styles.averageText}>
                Weekly average: <Text style={styles.averageValue}>{weeklyAverage}/10</Text>
              </Text>
            )}
          </View>
          <Text style={styles.viewHistory}>View all →</Text>
        </View>

        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => setWeekOffset(current => current - 1)}
          >
            <Text style={styles.weekArrowText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.weekLabelBox}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <Text style={styles.weekCaption}>
              {weekOffset === 0
                ? 'This Week'
                : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) === 1 ? '' : 's'} ago`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.weekArrow, weekOffset === 0 && styles.weekArrowDisabled]}
            onPress={() => setWeekOffset(current => Math.min(current + 1, 0))}
            disabled={weekOffset === 0}
          >
            <Text style={styles.weekArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {(
          <View style={styles.dashboardChart}>
            {weekData.map(day => {
              const hasEntry = day.score !== null;
              return (
                <View key={getDateKey(day.date)} style={styles.dashboardBarItem}>
                  <Text style={styles.dashboardDay}>
                    {day.date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}
                  </Text>
                  <View style={styles.dashboardBarArea}>
                    {hasEntry && (
                      <Text style={styles.dashboardBarEmoji}>{day.emoji}</Text>
                    )}
                    <View style={styles.dashboardBarTrack}>
                      {hasEntry && (
                        <View
                          style={[
                            styles.dashboardBar,
                            {
                              height: `${Math.max(day.score * 10, 8)}%`,
                              backgroundColor:
                                day.score >= 7
                                  ? '#1D9E75'
                                  : day.score >= 5
                                    ? '#FFC107'
                                    : '#FF6B6B'
                            }
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  <Text style={[styles.dashboardBarScore, !hasEntry && styles.emptyScore]}>
                    {hasEntry ? day.score.toFixed(1) : '–'}
                  </Text>
                  <Text style={styles.dashboardBarDate}>{day.date.getDate()}</Text>
                  {day.entries.length > 1 && (
                    <Text style={styles.entryCount}>{day.entries.length} logs</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.chatBanner} onPress={() => navigation.navigate('Chat')}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chatTitle}>🤖 {t.aiCoach}</Text>
          <Text style={styles.chatSub}>{t.aiCoachSub}</Text>
        </View>
        <Text style={styles.chatArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        <View style={styles.grid}>
          {features.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.card, { backgroundColor: item.color }]}
              onPress={item.action}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.recentSessions}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SessionLogs')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>
        {recentSessions.length ? (
          recentSessions.map(session => (
            <TouchableOpacity
              key={session.id}
              style={styles.recentSessionCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('SessionLogs')}
            >
              <View style={styles.recentSessionTop}>
                <View style={styles.recentSessionInfo}>
                  <Text style={styles.recentTherapist}>{session.therapist}</Text>
                  <Text style={styles.recentSessionMeta}>
                    {session.date
                      ? new Date(session.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Date unavailable'}{' '}
                    • {session.time}
                  </Text>
                  <Text style={styles.recentSessionMeta}>
                    {session.type} • {session.duration || '45 min'}
                  </Text>
                </View>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>
                    {session.status || 'Upcoming'}
                  </Text>
                </View>
              </View>
              <View style={styles.recentSessionFooter}>
                <Text style={styles.paymentPaid}>
                  {session.paymentStatus === 'Paid' ? '✓ Paid' : 'Booking confirmed'}
                </Text>
                <Text style={styles.sessionArrow}>View details →</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>{t.noSessions}</Text>
          <Text style={styles.emptySub}>{t.bookFirst}</Text>
          <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('FindTherapist')}>
            <Text style={styles.bookBtnText}>{t.bookNow}</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', padding: 24, paddingTop: 55 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' },
  greetingSub: { fontSize: 14, color: '#E0DEFF', marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  riskCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3, borderLeftWidth: 5 },
  riskTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  riskSub: { fontSize: 12, color: '#888', marginTop: 2 },
  riskBadge: { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 64 },
  riskScore: { fontSize: 22, fontWeight: '700' },
  riskLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  seeAll: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 2 },
  moodBtn: { alignItems: 'center', padding: 8, borderRadius: 12, flex: 1, borderWidth: 2, borderColor: 'transparent' },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 10, color: '#555', marginTop: 4, fontWeight: '500', textAlign: 'center' },
  moodProgressCard: { marginHorizontal: 16, marginVertical: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3 },
  moodProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  moodProgressInfo: { flex: 1, paddingRight: 10 },
  moodProgressTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  noAverageText: { fontSize: 12, color: '#777', marginTop: 5, maxWidth: 230, lineHeight: 17 },
  averageText: { fontSize: 13, color: '#666', marginTop: 5 },
  averageValue: { color: '#6C63FF', fontWeight: '800' },
  viewHistory: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginTop: 3 },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingVertical: 6 },
  weekArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0EFFF', alignItems: 'center', justifyContent: 'center' },
  weekArrowDisabled: { opacity: 0.35 },
  weekArrowText: { fontSize: 25, color: '#6C63FF', lineHeight: 27 },
  weekLabelBox: { alignItems: 'center' },
  weekLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  weekCaption: { fontSize: 10, color: '#888', marginTop: 2 },
  dashboardChart: { height: 180, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 },
  dashboardBarItem: { flex: 1, alignItems: 'center' },
  dashboardDay: { fontSize: 11, fontWeight: '700', color: '#666', marginBottom: 5 },
  dashboardBarArea: { height: 102, justifyContent: 'flex-end', alignItems: 'center' },
  dashboardBarEmoji: { fontSize: 14, marginBottom: 3 },
  dashboardBarTrack: { width: 24, height: 82, borderRadius: 7, backgroundColor: '#F0EFFF', justifyContent: 'flex-end', overflow: 'hidden' },
  dashboardBar: { width: '100%', borderRadius: 7 },
  dashboardBarScore: { color: '#333', fontSize: 10, fontWeight: '700', marginTop: 4 },
  emptyScore: { color: '#bbb' },
  dashboardBarDate: { color: '#888', fontSize: 9, marginTop: 2 },
  entryCount: { color: '#6C63FF', fontSize: 7, fontWeight: '600', marginTop: 2 },
  chatBanner: { margin: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  chatTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  chatSub: { fontSize: 12, color: '#aaa', marginTop: 4 },
  chatArrow: { fontSize: 24, color: '#6C63FF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 16, padding: 18, marginBottom: 12, elevation: 3 },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  recentSessionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#6C63FF' },
  recentSessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recentSessionInfo: { flex: 1, paddingRight: 10 },
  recentTherapist: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  recentSessionMeta: { fontSize: 12, color: '#777', marginTop: 5 },
  upcomingBadge: { backgroundColor: '#E3F2FD', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  upcomingBadgeText: { color: '#1565C0', fontSize: 10, fontWeight: '700' },
  recentSessionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 12, paddingTop: 10 },
  paymentPaid: { color: '#1D9E75', fontSize: 11, fontWeight: '700' },
  sessionArrow: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 2 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySub: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  bookBtn: { backgroundColor: '#6C63FF', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, marginTop: 16 },
  bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
