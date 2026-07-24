// app/screens/SessionLogsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { request } from '../utils/apiService';

const STATUS_TABS = [
  { label: 'Upcoming', statuses: ['Pending', 'Confirmed'] },
  { label: 'Completed', statuses: ['Completed'] },
  { label: 'Cancelled', statuses: ['Cancelled', 'Rejected'] },
];

const STATUS_COLORS = {
  Pending:   { bg: '#FFF9C4', text: '#F59E0B' },
  Confirmed: { bg: '#E8F5E9', text: '#1D9E75' },
  Completed: { bg: '#E8EAF6', text: '#6C63FF' },
  Cancelled: { bg: '#FFEBEE', text: '#FF6B6B' },
  Rejected:  { bg: '#FFEBEE', text: '#FF6B6B' },
};

const TYPE_ICONS = { Video: '📹', Audio: '🎙️', Text: '💬' };

export default function SessionLogsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const result = await request({ path: '/sessions/my' });
      setSessions(result?.data || []);
    } catch (error) {
      console.error('Sessions error:', error.message);
      Alert.alert('Error', 'Could not load sessions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ✅ Highlight recent booking if coming from payment
  useEffect(() => {
    if (route.params?.recentBookingId) {
      setActiveTab(0); // Switch to Upcoming tab
    }
  }, [route.params]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const filteredSessions = sessions.filter(s =>
    STATUS_TABS[activeTab].statuses.includes(s.status)
  );

  const handleCancel = async (sessionId) => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await request({
                path: `/sessions/cancel/${sessionId}`,
                method: 'DELETE'
              });
              Alert.alert('Cancelled', 'Session has been cancelled.');
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not cancel session.');
            }
          }
        }
      ]
    );
  };

  const handleRate = (session) => {
    navigation.navigate('RateSession', { session });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sessions</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab, index) => {
          const count = sessions.filter(s =>
            tab.statuses.includes(s.status)
          ).length;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, activeTab === index && styles.tabActive]}
              onPress={() => setActiveTab(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.badge, activeTab === index && styles.badgeActive]}>
                  <Text style={[styles.badgeText, activeTab === index && styles.badgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sessions List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C63FF']} />
        }
      >
        {filteredSessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {activeTab === 0 ? '📅' : activeTab === 1 ? '✅' : '❌'}
            </Text>
            <Text style={styles.emptyTitle}>
              No {STATUS_TABS[activeTab].label} Sessions
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 0
                ? 'Book a session with a therapist to get started'
                : activeTab === 1
                ? 'Your completed sessions will appear here'
                : 'No cancelled sessions'}
            </Text>
            {activeTab === 0 && (
              <TouchableOpacity
                style={styles.findBtn}
                onPress={() => navigation.navigate('FindTherapist')}
              >
                <Text style={styles.findBtnText}>Find a Therapist</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredSessions.map(session => {
            const psychiatrist = session.psychiatristId;
            const statusStyle = STATUS_COLORS[session.status] || STATUS_COLORS.Pending;
            const sessionDate = new Date(session.dateTime);
            const isPast = sessionDate < new Date();

            return (
              <View key={session._id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.doctorAvatarText}>👨‍⚕️</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.doctorName}>
                      {psychiatrist?.name || 'Therapist'}
                    </Text>
                    <Text style={styles.specialty}>
                      {psychiatrist?.specializations?.[0] || 'Psychiatrist'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {session.status}
                    </Text>
                  </View>
                </View>

                {/* Session Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>
                      {sessionDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕐</Text>
                    <Text style={styles.detailText}>
                      {sessionDate.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>
                      {TYPE_ICONS[session.sessionType] || '💬'}
                    </Text>
                    <Text style={styles.detailText}>{session.sessionType} Session</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>💰</Text>
                    <Text style={styles.detailText}>PKR {session.agreedRate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>
                      {session.isPaid ? '✅' : '⏳'}
                    </Text>
                    <Text style={[
                      styles.detailText,
                      { color: session.isPaid ? '#1D9E75' : '#F59E0B' }
                    ]}>
                      {session.isPaid ? 'Paid' : 'Payment Pending'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  {/* Join button for confirmed upcoming sessions */}
                  {session.status === 'Confirmed' && !isPast ? (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={() => navigation.navigate('TwilioCall', {
                        role: 'patient',
                        session: {
                          id: session._id,
                          therapist: session.psychiatristId?.name || 'Your Therapist',
                          patient: 'You',
                          type: session.sessionType || 'Video',
                          meetingLink: session.meetingLink || ''
                        }
                      })}
                    >
                      <Text style={styles.joinBtnText}>📹 Join Session</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Cancel button for pending/confirmed upcoming */}
                  {['Pending', 'Confirmed'].includes(session.status) && !isPast && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancel(session._id)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {/* Rate button for completed unrated sessions */}
                  {session.status === 'Completed' && !session.patientRating && (
                    <TouchableOpacity
                      style={styles.rateBtn}
                      onPress={() => handleRate(session)}
                    >
                      <Text style={styles.rateBtnText}>⭐ Rate Session</Text>
                    </TouchableOpacity>
                  )}

                  {/* Show rating if already rated */}
                  {session.status === 'Completed' && session.patientRating && (
                    <View style={styles.ratedRow}>
                      <Text style={styles.ratedText}>
                        Your rating: {'⭐'.repeat(session.patientRating)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  header: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  badge: {
    backgroundColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#888' },
  badgeTextActive: { color: '#fff' },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  findBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doctorAvatarText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  specialty: { fontSize: 12, color: '#6C63FF', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 13, color: '#555' },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  joinBtn: {
    flex: 1,
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#FF6B6B', fontWeight: '700', fontSize: 13 },
  rateBtn: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ratedRow: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  ratedText: { fontSize: 13, color: '#666' },
});