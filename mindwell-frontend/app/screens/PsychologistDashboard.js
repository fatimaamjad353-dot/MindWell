import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getRatings } from '../utils/ratingStorage';
import { getProfile } from '../utils/profileStorage';

export default function PsychologistDashboard({ route, navigation }) {
  const { t } = useLanguage();
  const user = route.params?.user;
  const [ratings, setRatings] = useState([]);
  const [profile, setProfile] = useState(user || {});

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getRatings(),
        getProfile({ ...user, role: 'psychologist' })
      ]).then(([savedRatings, savedProfile]) => {
        setRatings(savedRatings);
        setProfile({ ...savedProfile, role: 'psychologist' });
      });
    }, [user])
  );

  const averageRating = useMemo(() => {
    if (!ratings.length) return null;
    return (
      ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length
    ).toFixed(1);
  }, [ratings]);

  const performanceTrend = useMemo(
    () =>
      [...ratings]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-7),
    [ratings]
  );

  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: ratings.filter(rating => rating.stars === stars).length,
        percent: ratings.length
          ? (ratings.filter(rating => rating.stars === stars).length / ratings.length) * 100
          : 0
      })),
    [ratings]
  );

  const positiveFeedback = useMemo(() => {
    if (!ratings.length) return null;
    const positive = ratings.filter(rating => rating.stars >= 4).length;
    return Math.round((positive / ratings.length) * 100);
  }, [ratings]);

  const performanceMessage = useMemo(() => {
    if (!averageRating) return 'Patient feedback will build your performance graph.';
    const score = Number(averageRating);
    if (score >= 4.5) return 'Excellent patient experience. Keep up the thoughtful care.';
    if (score >= 4) return 'Strong performance with consistently positive feedback.';
    if (score >= 3) return 'Good foundation. Patient notes can highlight areas to improve.';
    return 'Recent feedback suggests reviewing patient comments and follow-up practices.';
  }, [averageRating]);

  const stats = [
    { label: t.sessionsToday, value: '3', emoji: '📅', color: '#6C63FF' },
    { label: t.myPatients, value: '24', emoji: '👥', color: '#1D9E75' },
    { label: t.earnings, value: 'PKR 72K', emoji: '💰', color: '#F4A261' },
    { label: 'Rating', value: '4.9 ⭐', emoji: '🏆', color: '#FF6B6B' },
  ];

  const upcomingSessions = [
    { patient: 'Sarah M.', time: '10:00 AM', type: 'Video', risk: 'high' },
    { patient: 'Ahmed K.', time: '12:00 PM', type: 'Audio', risk: 'medium' },
    { patient: 'Fatima R.', time: '3:00 PM', type: 'Text', risk: 'low' },
  ];

  const features = [
    { emoji: '👥', title: t.myPatients, subtitle: 'View patient summaries', color: '#6C63FF', screen: 'PsychPatientList' },
    { emoji: '📅', title: t.mySchedule, subtitle: 'Manage availability', color: '#1D9E75', screen: 'PsychSchedule' },
    { emoji: '💰', title: t.earnings, subtitle: 'Track payments', color: '#F4A261', screen: 'PsychEarnings' },
    { emoji: '⚙️', title: t.settings, subtitle: 'App preferences', color: '#845EC2', screen: 'Settings' },
  ];

  const riskColor = (r) => r === 'high' ? '#FF6B6B' : r === 'medium' ? '#FFC107' : '#1D9E75';

  const joinSession = (session, index) => {
    const type = String(session.type || 'Video').toLowerCase();
    navigation.navigate(type === 'text' ? 'TextSession' : 'TwilioCall', {
      role: 'psychologist',
      session: {
        id: `psych-session-${index}`,
        patient: session.patient,
        time: session.time,
        type: session.type
      }
    });
  };

  const clinicalFeatures = [
    { emoji: 'REQ', title: 'Appointments', subtitle: 'Review booking requests', color: '#0081CF', screen: 'PsychAppointments' },
  ];

  const dashboardStats = stats.map(stat =>
    stat.label === 'Rating'
      ? {
          ...stat,
          label: 'Patient Rating',
          value: averageRating ? `${averageRating} ★` : 'No ratings',
          emoji: '★'
        }
      : stat
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{t.welcomeDoctor} {user?.name || 'Doctor'} 👨‍⚕️</Text>
            <Text style={styles.greetingSub}>3 {t.sessionsToday}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerSettings}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings', {
              user: { ...profile, role: 'psychologist' }
            })}
          >
            <View style={styles.avatar}>
              {profile?.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name[0].toUpperCase() : 'D'}
                </Text>
              )}
            </View>
            <View style={styles.settingsBadge}>
              <Text style={styles.settingsBadgeText}>⚙</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <View style={styles.performanceHeading}>
              <Text style={styles.performanceTitle}>Performance Overview</Text>
              <Text style={styles.performanceMessage}>{performanceMessage}</Text>
            </View>
            <View style={styles.averageBadge}>
              <Text style={styles.averageValue}>{averageRating || '—'}</Text>
              <Text style={styles.averageStars}>★★★★★</Text>
            </View>
          </View>

          {ratings.length ? (
            <>
              <View style={styles.performanceMetrics}>
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>{ratings.length}</Text>
                  <Text style={styles.metricLabel}>Reviews</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>{positiveFeedback}%</Text>
                  <Text style={styles.metricLabel}>Positive</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>{averageRating}</Text>
                  <Text style={styles.metricLabel}>Average</Text>
                </View>
              </View>

              <Text style={styles.graphTitle}>Recent Patient Ratings</Text>
              <View style={styles.dotGraph}>
                <View style={styles.graphScale}>
                  {[5, 4, 3, 2, 1].map(value => (
                    <Text key={value} style={styles.graphScaleText}>{value}</Text>
                  ))}
                </View>
                <View style={styles.dotPlot}>
                  {[0, 1, 2, 3, 4].map(line => (
                    <View key={line} style={[styles.dotGridLine, { top: line * 25 }]} />
                  ))}
                  <View style={styles.dotColumns}>
                    {performanceTrend.map((rating, index) => (
                      <View key={rating.id} style={styles.dotColumn}>
                        <View
                          style={[
                            styles.ratingDot,
                            {
                              top: (5 - rating.stars) * 25 - 8,
                              backgroundColor:
                                rating.stars >= 4
                                  ? '#1D9E75'
                                  : rating.stars === 3
                                    ? '#FFC107'
                                    : '#FF6B6B'
                            }
                          ]}
                        >
                          <Text style={styles.ratingDotText}>{rating.stars}</Text>
                        </View>
                        <Text style={styles.dotLabel}>R{index + 1}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.performanceEmpty}>
              <Text style={styles.performanceEmptyIcon}>📊</Text>
              <Text style={styles.performanceEmptyTitle}>No performance data yet</Text>
              <Text style={styles.performanceEmptyText}>
                Patient ratings after completed sessions will appear here.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsGrid}>
        {dashboardStats.map((s, i) => (
          <View key={i} style={[styles.statCard, { borderLeftColor: s.color }]}>
            <Text style={styles.statEmoji}>{s.emoji}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Sessions</Text>
        {upcomingSessions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.sessionCard}
            onPress={() => navigation.navigate('PsychPatientList')}
          >
            <View style={styles.sessionLeft}>
              <Text style={styles.sessionPatient}>{s.patient}</Text>
              <Text style={styles.sessionMeta}>{s.time} • {s.type}</Text>
            </View>
            <View style={styles.sessionRight}>
              <View style={[styles.riskBadge, { backgroundColor: riskColor(s.risk) + '20' }]}>
                <Text style={[styles.riskText, { color: riskColor(s.risk) }]}>{s.risk} risk</Text>
              </View>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => joinSession(s, i)}
              >
                <Text style={styles.joinText}>{t.joinNow}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        <View style={styles.grid}>
          {[...clinicalFeatures, ...features].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.card, { backgroundColor: item.color }]}
              onPress={() =>
                item.screen === 'Settings'
                  ? navigation.navigate('Settings', { user: { ...user, role: 'psychologist' } })
                  : navigation.navigate(item.screen)
              }
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {false && <View style={styles.section}>
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <View style={styles.performanceHeading}>
              <Text style={styles.performanceTitle}>Performance Overview</Text>
              <Text style={styles.performanceMessage}>{performanceMessage}</Text>
            </View>
            <View style={styles.averageBadge}>
              <Text style={styles.averageValue}>{averageRating || '—'}</Text>
              <Text style={styles.averageStars}>★★★★★</Text>
            </View>
          </View>

          {ratings.length ? (
            <>
              <View style={styles.performanceMetrics}>
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>{ratings.length}</Text>
                  <Text style={styles.metricLabel}>Reviews</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>{positiveFeedback}%</Text>
                  <Text style={styles.metricLabel}>Positive</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.performanceMetric}>
                  <Text style={styles.metricValue}>
                    {Math.max(...ratings.map(rating => rating.stars))}
                  </Text>
                  <Text style={styles.metricLabel}>Highest</Text>
                </View>
              </View>

              <Text style={styles.graphTitle}>Recent Rating Trend</Text>
              <View style={styles.performanceGraph}>
                {performanceTrend.map((rating, index) => (
                  <View key={rating.id} style={styles.performanceBarItem}>
                    <Text style={styles.performanceBarValue}>{rating.stars}</Text>
                    <View style={styles.performanceBarTrack}>
                      <View
                        style={[
                          styles.performanceBar,
                          {
                            height: `${rating.stars * 20}%`,
                            backgroundColor:
                              rating.stars >= 4
                                ? '#1D9E75'
                                : rating.stars === 3
                                  ? '#FFC107'
                                  : '#FF6B6B'
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.performanceBarLabel}>R{index + 1}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.graphTitle}>Rating Distribution</Text>
              {ratingDistribution.map(item => (
                <View key={item.stars} style={styles.distributionRow}>
                  <Text style={styles.distributionLabel}>{item.stars} ★</Text>
                  <View style={styles.distributionTrack}>
                    <View
                      style={[
                        styles.distributionFill,
                        { width: `${item.percent}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.distributionCount}>{item.count}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.performanceEmpty}>
              <Text style={styles.performanceEmptyIcon}>📊</Text>
              <Text style={styles.performanceEmptyTitle}>No performance data yet</Text>
              <Text style={styles.performanceEmptyText}>
                This graph will update when patients submit ratings after completed sessions.
              </Text>
            </View>
          )}
        </View>
      </View>}

      <View style={styles.section}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.sectionTitle}>Patient Feedback</Text>
          <Text style={styles.feedbackCount}>
            {ratings.length} review{ratings.length === 1 ? '' : 's'}
          </Text>
        </View>

        {ratings.length ? (
          ratings.slice(0, 3).map(rating => (
            <View key={rating.id} style={styles.feedbackCard}>
              <View style={styles.feedbackTop}>
                <Text style={styles.feedbackTherapist}>{rating.therapist}</Text>
                <Text style={styles.feedbackStars}>
                  {'★'.repeat(rating.stars)}{'☆'.repeat(5 - rating.stars)}
                </Text>
              </View>
              <Text style={styles.feedbackNote}>{rating.note}</Text>
              <Text style={styles.feedbackDate}>
                Session: {rating.sessionDate || 'Date unavailable'}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noFeedbackCard}>
            <Text style={styles.noFeedbackIcon}>☆</Text>
            <Text style={styles.noFeedbackTitle}>No patient feedback yet</Text>
            <Text style={styles.noFeedbackText}>
              Ratings and notes submitted after completed sessions will appear here.
            </Text>
          </View>
        )}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', padding: 24, paddingTop: 55 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  greetingSub: { fontSize: 14, color: '#E0F5EF', marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSettings: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  settingsBadge: { position: 'absolute', right: 0, bottom: 0, width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  settingsBadgeText: { color: '#1D9E75', fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, borderLeftWidth: 4 },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statVal: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  performanceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3 },
  performanceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  performanceHeading: { flex: 1, paddingRight: 12 },
  performanceTitle: { color: '#1a1a2e', fontSize: 17, fontWeight: '800' },
  performanceMessage: { color: '#777', fontSize: 11, lineHeight: 16, marginTop: 4 },
  averageBadge: { minWidth: 68, borderRadius: 12, backgroundColor: '#FFF9E6', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  averageValue: { color: '#B26A00', fontSize: 21, fontWeight: '800' },
  averageStars: { color: '#FFC107', fontSize: 8, letterSpacing: -1 },
  performanceMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#F7F7FC', borderRadius: 12, paddingVertical: 12, marginTop: 16 },
  performanceMetric: { flex: 1, alignItems: 'center' },
  metricValue: { color: '#1D9E75', fontSize: 18, fontWeight: '800' },
  metricLabel: { color: '#777', fontSize: 10, marginTop: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: '#DDD' },
  graphTitle: { color: '#333', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  performanceGraph: { height: 145, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', backgroundColor: '#FAFAFC', borderRadius: 12, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },
  dotGraph: { height: 145, flexDirection: 'row', backgroundColor: '#FAFAFC', borderRadius: 12, paddingVertical: 10, paddingRight: 8 },
  graphScale: { width: 24, height: 105, justifyContent: 'space-between', alignItems: 'center' },
  graphScaleText: { color: '#999', fontSize: 9 },
  dotPlot: { flex: 1, height: 125, position: 'relative' },
  dotGridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#E8E8EE' },
  dotColumns: { position: 'absolute', left: 0, right: 0, top: 0, height: 125, flexDirection: 'row' },
  dotColumn: { flex: 1, height: 125, alignItems: 'center', position: 'relative' },
  ratingDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  ratingDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dotLabel: { position: 'absolute', bottom: 0, color: '#999', fontSize: 9 },
  performanceBarItem: { flex: 1, alignItems: 'center', maxWidth: 42 },
  performanceBarValue: { color: '#555', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  performanceBarTrack: { width: 24, height: 92, justifyContent: 'flex-end', backgroundColor: '#E9E9F2', borderRadius: 7, overflow: 'hidden' },
  performanceBar: { width: '100%', borderRadius: 7 },
  performanceBarLabel: { color: '#999', fontSize: 9, marginTop: 4 },
  distributionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  distributionLabel: { width: 30, color: '#555', fontSize: 11, fontWeight: '600' },
  distributionTrack: { flex: 1, height: 9, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  distributionFill: { height: '100%', backgroundColor: '#FFC107', borderRadius: 5 },
  distributionCount: { width: 24, color: '#777', fontSize: 11, textAlign: 'right' },
  performanceEmpty: { alignItems: 'center', paddingVertical: 24 },
  performanceEmptyIcon: { fontSize: 38 },
  performanceEmptyTitle: { color: '#333', fontSize: 15, fontWeight: '700', marginTop: 8 },
  performanceEmptyText: { color: '#777', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
  sessionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  sessionLeft: {},
  sessionPatient: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  sessionMeta: { fontSize: 13, color: '#888', marginTop: 4 },
  sessionRight: { alignItems: 'flex-end', gap: 6 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  riskText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  joinBtn: { backgroundColor: '#1D9E75', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 16, padding: 18, marginBottom: 12, elevation: 3 },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackCount: { color: '#1D9E75', fontSize: 12, fontWeight: '700', marginBottom: 12 },
  feedbackCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#FFC107' },
  feedbackTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackTherapist: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a1a2e', marginRight: 8 },
  feedbackStars: { color: '#FFC107', fontSize: 15, letterSpacing: 1 },
  feedbackNote: { color: '#555', fontSize: 13, lineHeight: 19, marginTop: 9 },
  feedbackDate: { color: '#999', fontSize: 10, marginTop: 8 },
  noFeedbackCard: { backgroundColor: '#fff', borderRadius: 14, padding: 22, alignItems: 'center', elevation: 2 },
  noFeedbackIcon: { color: '#FFC107', fontSize: 34 },
  noFeedbackTitle: { color: '#333', fontSize: 15, fontWeight: '700', marginTop: 6 },
  noFeedbackText: { color: '#777', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
});
