import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPendingRequests, confirmSessionApi, rejectSessionApi } from '../utils/apiService';

export default function PsychAppointmentsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const result = await getPendingRequests();
      // Map backend data to match UI structure
      const mapped = result.data.map(session => ({
        id: session._id,
        patient: session.patientId?.name || 'Unknown',
        date: new Date(session.dateTime).toLocaleDateString(),
        time: new Date(session.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: session.sessionType,
        reason: session.notes || 'Session request',
        status: session.status.toLowerCase(),
        riskLevel: session.riskLevel
      }));
      setRequests(mapped);
    } catch (error) {
      console.error('Appointments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === 'confirmed') {
        await confirmSessionApi(id, '');
      } else {
        await rejectSessionApi(id);
      }
      await loadRequests(); // Refresh list
      Alert.alert(
        status === 'confirmed' ? 'Appointment confirmed' : 'Appointment declined',
        status === 'confirmed' ? 'The patient will receive a confirmation.' : 'The time slot is available again.'
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const visibleRequests = requests.filter(item => filter === 'all' || item.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{requests.filter(item => item.status === 'pending').length}</Text>
          <Text style={styles.summaryLabel}>Pending requests</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, styles.greenText]}>{requests.filter(item => item.status === 'confirmed').length}</Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {['all', 'pending', 'confirmed'].map(item => (
          <TouchableOpacity key={item} style={[styles.filterButton, filter === item && styles.filterButtonActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleRequests.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.patient[0]}</Text></View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.patient}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>
              <View style={[styles.badge, item.status === 'confirmed' ? styles.confirmedBadge : styles.pendingBadge]}>
                <Text style={[styles.badgeText, item.status === 'confirmed' ? styles.confirmedText : styles.pendingText]}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={styles.detailText}>{item.date}</Text>
              <Text style={styles.detailText}>{item.time}</Text>
              <Text style={styles.detailText}>{item.type}</Text>
            </View>

            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.declineButton} onPress={() => updateStatus(item.id, 'declined')}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveButton} onPress={() => updateStatus(item.id, 'confirmed')}>
                  <Text style={styles.approveText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {visibleRequests.length === 0 && <Text style={styles.emptyText}>No appointments in this category.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { color: '#fff', fontSize: 28, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24 },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  summaryValue: { color: '#6C63FF', fontSize: 24, fontWeight: '700' },
  greenText: { color: '#1D9E75' },
  summaryLabel: { color: '#777', fontSize: 12, marginTop: 3 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  filterButton: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8 },
  filterButtonActive: { backgroundColor: '#6C63FF' },
  filterText: { color: '#555', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8E6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#6C63FF', fontSize: 19, fontWeight: '700' },
  patientInfo: { flex: 1 },
  patientName: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  reason: { color: '#777', fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  pendingBadge: { backgroundColor: '#FFF4D6' },
  confirmedBadge: { backgroundColor: '#E8F5E9' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  pendingText: { color: '#C47B00' },
  confirmedText: { color: '#1D9E75' },
  details: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8F8FC', borderRadius: 10, padding: 12, marginTop: 14 },
  detailText: { color: '#555', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  declineButton: { flex: 1, borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 10, padding: 11, alignItems: 'center' },
  declineText: { color: '#FF6B6B', fontWeight: '700' },
  approveButton: { flex: 1, backgroundColor: '#1D9E75', borderRadius: 10, padding: 11, alignItems: 'center' },
  approveText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
});