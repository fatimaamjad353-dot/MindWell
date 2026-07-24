// app/screens/PsychAppointmentsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, FlatList, StyleSheet, Text,
  TouchableOpacity, View, ActivityIndicator,
  RefreshControl, ScrollView
} from 'react-native';
import { getPsychiatristSessions, confirmSessionApi, rejectSessionApi } from '../utils/apiService';

const STATUS = {
  ALL: 'all',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

const RISK_COLORS = {
  High:   { bg: '#FFEBEE', text: '#FF6B6B' },
  Medium: { bg: '#FFF9C4', text: '#F59E0B' },
  Low:    { bg: '#E8F5E9', text: '#1D9E75' },
};

export default function PsychAppointmentsScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(STATUS.ALL);
  const [actionLoading, setActionLoading] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      const result = await getPsychiatristSessions();
      const mapped = (result?.data || []).map(session => ({
        id: session._id,
        patient: session.patientId?.name || 'Unknown',
        patientEmail: session.patientId?.email || '',
        date: new Date(session.dateTime).toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric'
        }),
        time: new Date(session.dateTime).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit'
        }),
        type: session.sessionType,
        reason: session.notes || 'Session request',
        status: session.status,
        riskLevel: session.riskLevel || 'Low',
        diagnosis: session.diagnosis || null,
        agreedRate: session.agreedRate || 0,
        isPaid: session.isPaid || false,
      }));
      setSessions(mapped);
    } catch (error) {
      Alert.alert('Error', 'Could not load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const onRefresh = () => { setRefreshing(true); loadSessions(); };

  const handleConfirm = (id) => {
    Alert.alert('Confirm Appointment', 'Confirm this session request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(id);
          try {
            await confirmSessionApi(id, { meetingLink: '' });
            Alert.alert('✅ Confirmed', 'Session confirmed.');
            loadSessions();
          } catch (error) {
            Alert.alert('Error', error.message || 'Could not confirm');
          } finally { setActionLoading(null); }
        }
      }
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('Reject Appointment', 'Reject this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await rejectSessionApi(id);
            Alert.alert('Session rejected.');
            loadSessions();
          } catch (error) {
            Alert.alert('Error', error.message || 'Could not reject');
          } finally { setActionLoading(null); }
        }
      }
    ]);
  };

  const visibleSessions = sessions.filter(item =>
    filter === STATUS.ALL || item.status === filter
  );

  const pendingCount   = sessions.filter(s => s.status === STATUS.PENDING).length;
  const confirmedCount = sessions.filter(s => s.status === STATUS.CONFIRMED).length;
  const completedCount = sessions.filter(s => s.status === STATUS.COMPLETED).length;
  const rejectedCount  = sessions.filter(
    s => s.status === STATUS.REJECTED || s.status === STATUS.CANCELLED
  ).length;

  const renderCard = ({ item }) => {
    const riskStyle = RISK_COLORS[item.riskLevel] || RISK_COLORS.Low;
    const isActioning = actionLoading === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.patient?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient}</Text>
            <Text style={styles.patientEmail}>{item.patientEmail}</Text>
            <Text style={styles.reason}>{item.reason}</Text>
          </View>
          <View style={[
            styles.badge,
            item.status === STATUS.CONFIRMED ? styles.confirmedBadge :
            item.status === STATUS.COMPLETED ? styles.completedBadge :
            (item.status === STATUS.REJECTED || item.status === STATUS.CANCELLED) ? styles.rejectedBadge :
            styles.pendingBadge
          ]}>
            <Text style={[
              styles.badgeText,
              item.status === STATUS.CONFIRMED ? styles.confirmedText :
              item.status === STATUS.COMPLETED ? styles.completedText :
              (item.status === STATUS.REJECTED || item.status === STATUS.CANCELLED) ? styles.rejectedText :
              styles.pendingText
            ]}>
              {item.status}
            </Text>
          </View>
        </View>

        {item.riskLevel !== 'Low' && (
          <View style={[styles.riskBadge, { backgroundColor: riskStyle.bg }]}>
            <Text style={[styles.riskText, { color: riskStyle.text }]}>
              {item.riskLevel === 'High' ? '🔴' : '🟡'} {item.riskLevel} Risk
              {item.diagnosis ? ` · ${item.diagnosis}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>{item.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{item.time}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>
              {item.type === 'Video' ? '📹' : item.type === 'Audio' ? '🎙️' : '💬'}
            </Text>
            <Text style={styles.detailText}>{item.type}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>PKR {item.agreedRate}</Text>
          </View>
        </View>

        {item.status === STATUS.PENDING && (
          isActioning ? (
            <ActivityIndicator color="#1D9E75" style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineButton} onPress={() => handleReject(item.id)}>
                <Text style={styles.declineText}>❌ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveButton} onPress={() => handleConfirm(item.id)}>
                <Text style={styles.approveText}>✅ Confirm</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {item.status === STATUS.CONFIRMED && (
          <View style={styles.paidRow}>
            <Text style={[styles.paidText, { color: item.isPaid ? '#1D9E75' : '#F59E0B' }]}>
              {item.isPaid ? '✓ Paid' : '⏳ Payment Pending'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    // ✅ Use View as root — NOT ScrollView — so header/tabs stay fixed
    <View style={styles.container}>

      {/* Header — always visible */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Summary Cards — always visible */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#1D9E75' }]}>{confirmedCount}</Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#6C63FF' }]}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>{rejectedCount}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      {/* Filter Tabs — always visible */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { key: STATUS.ALL,       label: 'All' },
            { key: STATUS.PENDING,   label: 'Pending' },
            { key: STATUS.CONFIRMED, label: 'Confirmed' },
            { key: STATUS.COMPLETED, label: 'Completed' },
            { key: STATUS.REJECTED,  label: 'Rejected' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterButton, filter === item.key && styles.filterButtonActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ✅ FlatList takes remaining space — tabs stay fixed above */}
      <FlatList
        data={visibleSessions}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1D9E75']}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              No {filter === STATUS.ALL ? '' : filter} appointments
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
  header: {
    backgroundColor: '#1D9E75',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, paddingTop: 50
  },
  back: { color: '#fff', fontSize: 28, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24 },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', elevation: 2 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: '#777', fontSize: 10, marginTop: 2 },
  filterWrapper: { backgroundColor: '#fff', paddingVertical: 8, elevation: 1 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  filterButton: {
    backgroundColor: '#F0EFFF', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 8
  },
  filterButtonActive: { backgroundColor: '#1D9E75' },
  filterText: { color: '#555', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 30 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#E8E6FF', alignItems: 'center',
    justifyContent: 'center', marginRight: 12
  },
  avatarText: { color: '#6C63FF', fontSize: 19, fontWeight: '700' },
  patientInfo: { flex: 1 },
  patientName: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  patientEmail: { color: '#999', fontSize: 11, marginTop: 2 },
  reason: { color: '#777', fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  pendingBadge: { backgroundColor: '#FFF4D6' },
  confirmedBadge: { backgroundColor: '#E8F5E9' },
  completedBadge: { backgroundColor: '#E8EAF6' },
  rejectedBadge: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pendingText: { color: '#C47B00' },
  confirmedText: { color: '#1D9E75' },
  completedText: { color: '#6C63FF' },
  rejectedText: { color: '#FF6B6B' },
  riskBadge: { borderRadius: 8, padding: 8, marginTop: 10 },
  riskText: { fontSize: 12, fontWeight: '600' },
  details: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#F8F8FC', borderRadius: 10,
    padding: 12, marginTop: 12, gap: 8
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIcon: { fontSize: 13 },
  detailText: { color: '#555', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  declineButton: {
    flex: 1, borderWidth: 1.5, borderColor: '#FF6B6B',
    borderRadius: 10, padding: 11, alignItems: 'center'
  },
  declineText: { color: '#FF6B6B', fontWeight: '700' },
  approveButton: {
    flex: 1, backgroundColor: '#1D9E75',
    borderRadius: 10, padding: 11, alignItems: 'center'
  },
  approveText: { color: '#fff', fontWeight: '700' },
  paidRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 12, paddingTop: 10 },
  paidText: { fontSize: 12, fontWeight: '600' },
});