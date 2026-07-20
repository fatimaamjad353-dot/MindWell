// app/screens/PsychPatientListScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getPatientClinicalSummary } from '../utils/patientSummaryStorage';
import { getPsychiatristPatients } from '../utils/apiService';

export default function PsychPatientListScreen({ navigation }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sharedSummary, setSharedSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadPatients = async () => {
        setLoading(true);
        try {
          const result = await getPsychiatristPatients();
          console.log('📋 Patients API response:', result);
          
          // ✅ Check if result.data exists and is an array
          if (result && result.data && Array.isArray(result.data)) {
            const mapped = result.data.map(p => ({
              id: p.id || p._id,
              name: p.name || 'Unknown',
              age: p.age || '-',
              sessions: p.totalSessions || 0,
              lastSession: p.lastSession || '-',
              riskScore: p.riskLevel === 'High' ? 8 : p.riskLevel === 'Medium' ? 5 : 2,
              riskLevel: p.riskLevel?.toLowerCase() || 'low',
              moodTrend: p.moodTrend || '➡️',
              issue: p.diagnosis || 'General consultation'
            }));
            setPatients(mapped);
          } else {
            console.warn('⚠️ No patients data received');
            setPatients([]);
          }
        } catch (error) {
          console.error('Patients error:', error);
          setPatients([]);
        } finally {
          setLoading(false);
        }
      };
      loadPatients();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPatientClinicalSummary().then(summary => {
        if (active) setSharedSummary(summary);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : p.riskLevel === filter;
    return matchSearch && matchFilter;
  });

  const showSharedSummary = sharedSummary?.consentGranted
    && (filter === 'all' || sharedSummary.riskLevel === filter)
    && (
      !search.trim()
      || 'consented patient summary'.includes(search.toLowerCase())
      || sharedSummary.recommendedSpecialties?.join(' ').toLowerCase().includes(search.toLowerCase())
    );

  const riskColor = (level) => level === 'high' ? '#FF6B6B' : level === 'medium' ? '#FFC107' : '#1D9E75';
  const riskBg = (level) => level === 'high' ? '#FFEBEE' : level === 'medium' ? '#FFF9C4' : '#E8F5E9';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{t.myPatients}</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.myPatients}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search patients..." 
          placeholderTextColor="#aaa" 
          value={search} 
          onChangeText={setSearch} 
        />
      </View>

      <View style={styles.filterRow}>
        {['all', 'high', 'medium', 'low'].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]} 
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'high' ? '🔴 High' : f === 'medium' ? '🟡 Medium' : '🟢 Low'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {showSharedSummary && (
          <TouchableOpacity
            style={[styles.card, styles.sharedCard]}
            onPress={() => navigation.navigate('PsychPatientSummary', {
              patient: {
                id: 'shared-local',
                name: 'Consented Patient',
                age: '-',
                sessions: '-',
                riskScore: sharedSummary.riskScore,
                riskLevel: sharedSummary.riskLevel,
                issue: sharedSummary.recommendedSpecialties?.join(', ') || 'General',
              }
            })}
          >
            <View style={styles.cardTop}>
              <View style={[styles.avatar, styles.sharedAvatar]}>
                <Text style={styles.avatarText}>P</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>Consented Patient Summary</Text>
                <Text style={styles.issue}>{sharedSummary.recommendedSpecialties?.join(', ') || 'General'}</Text>
                <Text style={styles.meta}>Shared from patient mood scores and AI coach chat signals</Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: riskBg(sharedSummary.riskLevel) }]}>
                <Text style={[styles.riskText, { color: riskColor(sharedSummary.riskLevel) }]}>{sharedSummary.riskScore}</Text>
                <Text style={[styles.riskLevel, { color: riskColor(sharedSummary.riskLevel) }]}>{sharedSummary.riskLevel}</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.trend}>Consent shared - tap for full summary</Text>
              <Text style={styles.viewBtnText}>{t.viewSummary} {'>'}</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No patients found</Text>
            <Text style={styles.emptyText}>Your patients will appear here once they book sessions with you.</Text>
          </View>
        ) : (
          filtered.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.card}
              onPress={() => navigation.navigate('PsychPatientSummary', { patient })}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{patient.name?.[0] || 'P'}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{patient.name}</Text>
                  <Text style={styles.issue}>{patient.issue}</Text>
                  <Text style={styles.meta}>Age: {patient.age} • {patient.sessions} sessions • Last: {patient.lastSession}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskBg(patient.riskLevel) }]}>
                  <Text style={[styles.riskText, { color: riskColor(patient.riskLevel) }]}>{patient.riskScore}</Text>
                  <Text style={[styles.riskLevel, { color: riskColor(patient.riskLevel) }]}>{patient.riskLevel}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.trend}>Mood Trend: {patient.moodTrend}</Text>
                <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('PsychPatientSummary', { patient })}>
                  <Text style={styles.viewBtnText}>{t.viewSummary} →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#666', fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 14, paddingHorizontal: 14, elevation: 3 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', elevation: 1 },
  filterBtnActive: { backgroundColor: '#6C63FF' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#555' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  sharedCard: { borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sharedAvatar: { backgroundColor: '#1D9E75' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  issue: { fontSize: 13, color: '#6C63FF', marginTop: 2 },
  meta: { fontSize: 11, color: '#888', marginTop: 4 },
  riskBadge: { alignItems: 'center', padding: 8, borderRadius: 12 },
  riskText: { fontSize: 18, fontWeight: '700' },
  riskLevel: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  trend: { fontSize: 13, color: '#555' },
  viewBtn: { backgroundColor: '#F0EFFF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  viewBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
});