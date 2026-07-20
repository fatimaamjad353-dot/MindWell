import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getPsychiatristEarnings } from '../utils/apiService';

export default function PsychEarningsScreen({ navigation }) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState('month');
  const [earningsData, setEarningsData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadEarnings = async () => {
      try {
        const result = await getPsychiatristEarnings();
        setEarningsData(result.data);
        const mapped = result.data.sessions.map(s => ({
          patient: s.patientId?.name || 'Patient',
          date: new Date(s.dateTime || s.createdAt).toLocaleDateString(),
          type: `${s.sessionType} Session`,
          amount: s.agreedRate,
          status: s.isPaid ? 'paid' : 'pending'
        }));
        setTransactions(mapped);
      } catch (error) {
        console.error('Earnings error:', error);
      }
    };
    loadEarnings();
  }, []);

  const total = earningsData?.totalEarnings || 0;
  const pending = transactions.reduce((sum, t) => t.status === 'pending' ? sum + t.amount : sum, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.earnings}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.periodRow}>
          {['week', 'month', 'year'].map((p) => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.totalLabel}>Total Earned</Text>
        <Text style={styles.totalAmount}>PKR {total.toLocaleString()}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{transactions.filter(t => t.status === 'paid').length}</Text>
            <Text style={styles.statLabel}>Sessions Paid</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#FFC107' }]}>PKR {pending.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>PKR {Math.round(total / (transactions.filter(t => t.status === 'paid').length || 1)).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Per Session</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.map((tx, i) => (
          <View key={i} style={styles.txCard}>
            <View style={styles.txLeft}>
              <Text style={styles.txPatient}>{tx.patient}</Text>
              <Text style={styles.txMeta}>{tx.type} • {tx.date}</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={styles.txAmount}>PKR {tx.amount.toLocaleString()}</Text>
              <View style={[styles.txBadge, { backgroundColor: tx.status === 'paid' ? '#E8F5E9' : '#FFF9C4' }]}>
                <Text style={[styles.txBadgeText, { color: tx.status === 'paid' ? '#1D9E75' : '#F57F17' }]}>
                  {tx.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  summaryCard: { backgroundColor: '#1D9E75', padding: 24, alignItems: 'center' },
  periodRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 4, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  periodBtnActive: { backgroundColor: '#fff' },
  periodText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  periodTextActive: { color: '#1D9E75' },
  totalLabel: { fontSize: 14, color: '#E0F5EF' },
  totalAmount: { fontSize: 36, fontWeight: '700', color: '#fff', marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 24 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: '#E0F5EF', marginTop: 2 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  txCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  txLeft: {},
  txPatient: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  txMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 16, fontWeight: '700', color: '#1D9E75' },
  txBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  txBadgeText: { fontSize: 11, fontWeight: '600' },
});