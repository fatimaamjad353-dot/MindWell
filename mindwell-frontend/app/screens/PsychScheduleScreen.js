// app/screens/PsychScheduleScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { request } from '../utils/apiService';

const STATUS_TABS = [
  { label: 'Pending',   statuses: ['Pending'] },
  { label: 'Confirmed', statuses: ['Confirmed'] },
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

export default function PsychScheduleScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      const result = await request({ path: '/psychiatrist/sessions' });
      setSessions(result?.data || []);
    } catch (error) {
      console.error('Sessions error:', error.message);
      Alert.alert('Error', 'Could not load sessions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const filteredSessions = sessions.filter(s =>
    STATUS_TABS[activeTab].statuses.includes(s.status)
  );

  // ─── Confirm session ──────────────────────────────────────────
  const handleConfirm = async (sessionId) => {
    Alert.alert(
      'Confirm Session',
      'Confirm this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(sessionId);
            try {
              await request({
                path: `/psychiatrist/sessions/${sessionId}/confirm`,
                method: 'PATCH',
                body: { meetingLink: '' }
              });
              Alert.alert('✅ Confirmed', 'Session has been confirmed.');
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not confirm session.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // ─── Reject session ───────────────────────────────────────────
  const handleReject = async (sessionId) => {
    Alert.alert(
      'Reject Session',
      'Are you sure you want to reject this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(sessionId);
            try {
              await request({
                path: `/psychiatrist/sessions/${sessionId}/reject`,
                method: 'PATCH'
              });
              Alert.alert('Session rejected.');
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not reject session.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // ─── Complete session ─────────────────────────────────────────
  const handleComplete = async (sessionId) => {
    Alert.alert(
      'Complete Session',
      'Mark this session as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setActionLoading(sessionId);
            try {
              await request({
                path: `/psychiatrist/sessions/${sessionId}/complete`,
                method: 'PATCH'
              });
              Alert.alert('✅ Session marked as completed.');
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not complete session.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading schedule...</Text>
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
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabs}
      >
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
      </ScrollView>

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
              {activeTab === 0 ? '⏳' : activeTab === 1 ? '✅' :
               activeTab === 2 ? '🏁' : '❌'}
            </Text>
            <Text style={styles.emptyTitle}>
              No {STATUS_TABS[activeTab].label} Sessions
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 0
                ? 'New appointment requests will appear here'
                : activeTab === 1
                ? 'Confirmed sessions will appear here'
                : activeTab === 2
                ? 'Completed sessions will appear here'
                : 'No cancelled sessions'}
            </Text>
          </View>
        ) : (
          filteredSessions.map(session => {
            const patient = session.patientId;
            const statusStyle = STATUS_COLORS[session.status] || STATUS_COLORS.Pending;
            const sessionDate = new Date(session.dateTime);
            const isLoading = actionLoading === session._id;

            return (
              <View key={session._id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>👤</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.patientName}>
                      {patient?.name || 'Patient'}
                    </Text>
                    <Text style={styles.patientEmail}>
                      {patient?.email || ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {session.status}
                    </Text>
                  </View>
                </View>

                {/* Risk Level */}
                {session.riskLevel && session.riskLevel !== 'Low' && (
                  <View style={[
                    styles.riskBadge,
                    { backgroundColor: session.riskLevel === 'High' ? '#FFEBEE' : '#FFF9C4' }
                  ]}>
                    <Text style={[
                      styles.riskText,
                      { color: session.riskLevel === 'High' ? '#FF6B6B' : '#F59E0B' }
                    ]}>
                      {session.riskLevel === 'High' ? '🔴' : '🟡'} {session.riskLevel} Risk Patient
                    </Text>
                  </View>
                )}

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
                  {session.notes ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📝</Text>
                      <Text style={styles.detailText}>{session.notes}</Text>
                    </View>
                  ) : null}
                  {session.diagnosis && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🧠</Text>
                      <Text style={styles.detailText}>
                        {session.diagnosis} ({session.riskLevel} Risk)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {isLoading ? (
                  <ActivityIndicator color="#6C63FF" style={{ marginTop: 8 }} />
                ) : (
                  <View style={styles.cardActions}>
                    {/* Pending — confirm or reject */}
                    {session.status === 'Pending' && (
                      <>
                        <TouchableOpacity
                          style={styles.confirmBtn}
                          onPress={() => handleConfirm(session._id)}
                        >
                          <Text style={styles.confirmBtnText}>✅ Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleReject(session._id)}
                        >
                          <Text style={styles.rejectBtnText}>❌ Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Confirmed — join or complete */}
                    {session.status === 'Confirmed' && (
                      <>
                        {/* ✅ Always show Join Session for confirmed sessions */}
                        <TouchableOpacity
                          style={styles.joinBtn}
                          onPress={() => navigation.navigate('TwilioCall', {
                            role: 'psychologist',
                            session: {
                              id: session._id,
                              patient: session.patientId?.name || 'Patient',
                              therapist: 'You',
                              type: session.sessionType || 'Video',
                              meetingLink: session.meetingLink || ''
                            }
                          })}
                        >
                          <Text style={styles.joinBtnText}>📹 Join Session</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.completeBtn}
                          onPress={() => handleComplete(session._id)}
                        >
                          <Text style={styles.completeBtnText}>🏁 Mark Complete</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Completed */}
                    {session.status === 'Completed' && (
                      <TouchableOpacity
                        style={styles.notesBtn}
                        onPress={() => navigation.navigate('PsychSessionNotes', { session })}
                      >
                        <Text style={styles.notesBtnText}>📝 Add Notes</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
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
  tabScroll: { backgroundColor: '#fff', maxHeight: 56 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0EFFF',
    gap: 6,
  },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  badge: {
    backgroundColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#666' },
  badgeTextActive: { color: '#fff' },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientAvatarText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  patientEmail: { fontSize: 12, color: '#888', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  riskBadge: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  riskText: { fontSize: 12, fontWeight: '600' },
  cardDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 13, color: '#555', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#FF6B6B', fontWeight: '700', fontSize: 13 },
  joinBtn: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  completeBtn: {
    flex: 1,
    backgroundColor: '#1D9E75',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  notesBtn: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  notesBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});