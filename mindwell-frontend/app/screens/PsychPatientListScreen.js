// app/screens/PsychPatientListScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { request } from '../utils/apiService';

const RISK_COLORS = {
  High:   { bg: '#FFEBEE', text: '#FF6B6B', border: '#FF6B6B' },
  Medium: { bg: '#FFF9C4', text: '#F59E0B', border: '#F59E0B' },
  Low:    { bg: '#E8F5E9', text: '#1D9E75', border: '#1D9E75' },
};

export default function PsychPatientListScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const loadPatients = useCallback(async () => {
    try {
      const result = await request({ path: '/psychiatrist/patients' });
      const data = result?.data || [];
      setPatients(data);
      setFiltered(data);
    } catch (error) {
      console.error('Patients error:', error.message);
      Alert.alert('Error', 'Could not load patients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // ─── Search + Filter ──────────────────────────────────────────
  useEffect(() => {
    let result = patients;

    if (activeFilter !== 'All') {
      result = result.filter(p => p.riskLevel === activeFilter);
    }

    if (search.trim()) {
      result = result.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.diagnosis?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(result);
  }, [search, activeFilter, patients]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const getRiskCount = (level) =>
    patients.filter(p => p.riskLevel === level).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading patients...</Text>
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>My Patients</Text>
          <Text style={styles.headerSubtitle}>{patients.length} total</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or diagnosis..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Risk Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'High', 'Medium', 'Low'].map(filter => {
          const count = filter === 'All' ? patients.length : getRiskCount(filter);
          const riskStyle = RISK_COLORS[filter];
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterBtn,
                activeFilter === filter && styles.filterBtnActive,
                activeFilter === filter && riskStyle && { backgroundColor: riskStyle.bg }
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter && riskStyle && { color: riskStyle.text }
              ]}>
                {filter} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Patient List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6C63FF']}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'No patients found' : 'No patients yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term'
                : 'Patients who book sessions with you will appear here'}
            </Text>
          </View>
        ) : (
          filtered.map((patient) => {
            const riskStyle = RISK_COLORS[patient.riskLevel] || RISK_COLORS.Low;

            return (
              <TouchableOpacity
                key={patient.id || patient._id}
                style={[styles.patientCard, { borderLeftColor: riskStyle.border }]}
                onPress={() => navigation.navigate('PsychPatientSummary', {
                  // ✅ Fixed: use _id which is what backend returns
                  patientId: patient.id || patient._id,
                  patientName: patient.name
                })}
                activeOpacity={0.7}
              >
                {/* Patient Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {patient.name?.[0]?.toUpperCase() || '👤'}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientEmail}>{patient.email}</Text>
                    {patient.phone_no && (
                      <Text style={styles.patientPhone}>📞 {patient.phone_no}</Text>
                    )}
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: riskStyle.bg }]}>
                    <Text style={[styles.riskText, { color: riskStyle.text }]}>
                      {patient.riskLevel || 'Low'}
                    </Text>
                  </View>
                </View>

                {/* Patient Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{patient.totalSessions || 0}</Text>
                    <Text style={styles.statLabel}>Sessions</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[
                      styles.statValue,
                      { color: patient.diagnosis ? '#6C63FF' : '#aaa' }
                    ]}>
                      {patient.diagnosis || 'None'}
                    </Text>
                    <Text style={styles.statLabel}>Diagnosis</Text>
                  </View>
                </View>

                {/* View Summary Button */}
                <View style={styles.cardFooter}>
                  <Text style={styles.viewSummary}>View Full Summary →</Text>
                </View>
              </TouchableOpacity>
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
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  searchRow: { backgroundColor: '#fff', padding: 12, elevation: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  clearBtn: { color: '#aaa', fontSize: 16, padding: 4 },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0EFFF',
  },
  filterBtnActive: { elevation: 2 },
  filterText: { fontSize: 12, fontWeight: '600', color: '#888' },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    borderLeftWidth: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#6C63FF' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  patientEmail: { fontSize: 12, color: '#888', marginTop: 2 },
  patientPhone: { fontSize: 12, color: '#666', marginTop: 2 },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
  },
  riskText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e0e0e0' },
  cardFooter: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 10,
  },
  viewSummary: { fontSize: 13, color: '#6C63FF', fontWeight: '700' },
});