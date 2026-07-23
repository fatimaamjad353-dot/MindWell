// app/screens/PsychPatientSummaryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { getPsychologistPatientSummary } from '../utils/apiService';

const RISK_COLORS = {
  High:   { bg: '#FFEBEE', text: '#FF6B6B', border: '#FF6B6B' },
  Medium: { bg: '#FFF9C4', text: '#F59E0B', border: '#F59E0B' },
  Low:    { bg: '#E8F5E9', text: '#1D9E75', border: '#1D9E75' },
};

const MOOD_EMOJIS = {
  Happy: '😊', Sad: '😢', Anxious: '😰',
  Depressed: '😞', Angry: '😠', Stressed: '😤',
  Neutral: '😐', Hopeful: '🙂', Terrible: '😣',
  Good: '🙂', Low: '😔'
};

const SEVERITY_COLORS = {
  Severe:   { bg: '#FFEBEE', text: '#FF6B6B' },
  Moderate: { bg: '#FFF9C4', text: '#F59E0B' },
  Mild:     { bg: '#E8F5E9', text: '#1D9E75' },
  Unknown:  { bg: '#F5F5F5', text: '#888' },
};

export default function PsychPatientSummaryScreen({ navigation, route }) {
  const patientId = route.params?.patientId;
  const patientName = route.params?.patientName;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadSummary = useCallback(async () => {
    try {
      setError(null);
      console.log('🔍 Loading summary for patientId:', patientId);

      if (!patientId) {
        setError('No patient ID provided');
        setLoading(false);
        return;
      }

      // ✅ Use the dedicated API function
      const result = await getPsychologistPatientSummary(patientId);
      console.log('✅ Summary loaded:', JSON.stringify(result?.data?.patient));
      setSummary(result.data);

    } catch (err) {
      console.error('❌ Summary error:', err.message);
      setError(err.message || 'Could not load patient summary');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading patient summary...</Text>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could not load summary</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadSummary}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: '#888', marginTop: 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskCategory = summary.riskAssessment?.riskCategory || 'Low';
  const riskStyle = RISK_COLORS[riskCategory] || RISK_COLORS.Low;
  const severityStyle = SEVERITY_COLORS[summary.diagnosis?.severity] || SEVERITY_COLORS.Unknown;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Patient Summary</Text>
          <Text style={styles.headerSubtitle}>
            {summary.patient?.name || patientName}
          </Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {/* Urgent Alert Banner */}
      {summary.riskAssessment?.urgentHelp && (
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentIcon}>🆘</Text>
          <View style={styles.urgentText}>
            <Text style={styles.urgentTitle}>Urgent Attention Required</Text>
            <Text style={styles.urgentSub}>
              This patient may need immediate professional support
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'moods', 'chats', 'resources'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive
            ]}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Patient Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👤 Patient Information</Text>
              <InfoRow label="Name" value={summary.patient?.name || 'N/A'} />
              <InfoRow label="Email" value={summary.patient?.email || 'N/A'} />
              <InfoRow label="Phone" value={summary.patient?.phone_no || 'N/A'} />
              <InfoRow
                label="Member Since"
                value={summary.patient?.memberSince
                  ? new Date(summary.patient.memberSince).toLocaleDateString()
                  : 'N/A'}
              />
            </View>

            {/* Risk Assessment */}
            <View style={[styles.card, {
              borderLeftWidth: 4,
              borderLeftColor: riskStyle.border
            }]}>
              <Text style={styles.cardTitle}>⚠️ Risk Assessment</Text>
              <View style={styles.riskRow}>
                <View style={[styles.riskBadge, { backgroundColor: riskStyle.bg }]}>
                  <Text style={[styles.riskBadgeText, { color: riskStyle.text }]}>
                    {riskCategory} Risk
                  </Text>
                </View>
                <Text style={styles.riskScore}>
                  Score: {summary.riskAssessment?.riskScore ?? 0}/10
                </Text>
              </View>
              {summary.riskAssessment?.lastUpdated && (
                <Text style={styles.riskDate}>
                  Last updated:{' '}
                  {new Date(summary.riskAssessment.lastUpdated).toLocaleDateString()}
                </Text>
              )}
            </View>

            {/* AI Diagnosis */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧠 AI Diagnosis</Text>
              {summary.diagnosis?.label ? (
                <>
                  <View style={styles.diagnosisRow}>
                    <Text style={styles.diagnosisLabel}>
                      {summary.diagnosis.label}
                    </Text>
                    {summary.diagnosis.confidence && (
                      <Text style={styles.diagnosisConf}>
                        {parseFloat(summary.diagnosis.confidence).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                  {summary.diagnosis.severity && (
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: severityStyle.bg }
                    ]}>
                      <Text style={[
                        styles.severityText,
                        { color: severityStyle.text }
                      ]}>
                        {summary.diagnosis.severity} Severity
                      </Text>
                    </View>
                  )}
                  {summary.diagnosis.aiNotes && (
                    <Text style={styles.aiNotes}>
                      {summary.diagnosis.aiNotes}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.noData}>No diagnosis detected yet</Text>
              )}
            </View>

            {/* Mood Overview */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Mood Overview</Text>
              <View style={styles.moodStatsRow}>
                <View style={styles.moodStat}>
                  <Text style={styles.moodStatValue}>
                    {summary.moodAnalysis?.averageMoodScore ?? 0}/10
                  </Text>
                  <Text style={styles.moodStatLabel}>Avg Score</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.moodStat}>
                  <Text style={styles.moodStatValue}>
                    {MOOD_EMOJIS[summary.moodAnalysis?.dominantMood] || '😐'}
                  </Text>
                  <Text style={styles.moodStatLabel}>
                    {summary.moodAnalysis?.dominantMood || 'Neutral'}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.moodStat}>
                  <Text style={styles.moodStatValue}>
                    {summary.moodAnalysis?.totalEntries ?? 0}
                  </Text>
                  <Text style={styles.moodStatLabel}>Entries</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.moodStat}>
                  <Text style={[styles.moodStatValue, {
                    color: summary.moodAnalysis?.moodTrend === 'Improving'
                      ? '#1D9E75'
                      : summary.moodAnalysis?.moodTrend === 'Declining'
                        ? '#FF6B6B' : '#888'
                  }]}>
                    {summary.moodAnalysis?.moodTrend === 'Improving' ? '↑'
                      : summary.moodAnalysis?.moodTrend === 'Declining' ? '↓' : '→'}
                  </Text>
                  <Text style={styles.moodStatLabel}>
                    {summary.moodAnalysis?.moodTrend || 'Stable'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommended Specializations */}
            {summary.recommendations?.specializations?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 Recommended Specializations</Text>
                {summary.recommendations.specializations.map((spec, i) => (
                  <View key={i} style={styles.specItem}>
                    <Text style={styles.specDot}>•</Text>
                    <Text style={styles.specText}>{spec}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── MOODS TAB ── */}
        {activeTab === 'moods' && (
          <>
            <Text style={styles.sectionTitle}>Recent Mood Entries</Text>
            {!summary.moodAnalysis?.recentMoods?.length ? (
              <EmptyState icon="📊" title="No mood entries yet" />
            ) : (
              summary.moodAnalysis.recentMoods.map((mood, i) => (
                <View key={i} style={styles.moodCard}>
                  <View style={styles.moodCardLeft}>
                    <Text style={styles.moodEmoji}>
                      {MOOD_EMOJIS[mood.type] || '😐'}
                    </Text>
                    <View>
                      <Text style={styles.moodType}>{mood.type}</Text>
                      <Text style={styles.moodDate}>
                        {mood.date
                          ? new Date(mood.date).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.moodCardRight}>
                    <Text style={styles.moodScore}>{mood.score}/10</Text>
                    <View style={[
                      styles.riskPill,
                      { backgroundColor: RISK_COLORS[mood.risk]?.bg || '#F5F5F5' }
                    ]}>
                      <Text style={[
                        styles.riskPillText,
                        { color: RISK_COLORS[mood.risk]?.text || '#888' }
                      ]}>
                        {mood.risk || 'Low'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ── CHATS TAB ── */}
        {activeTab === 'chats' && (
          <>
            <Text style={styles.sectionTitle}>AI Chat History</Text>
            {!summary.chatInsights?.length ? (
              <EmptyState icon="💬" title="No chat history yet" />
            ) : (
              summary.chatInsights.map((chat, i) => (
                <View key={i} style={styles.chatCard}>
                  <View style={styles.chatCardHeader}>
                    <View style={[
                      styles.chatRiskBadge,
                      {
                        backgroundColor: RISK_COLORS[chat.riskLevel]?.bg || '#F5F5F5'
                      }
                    ]}>
                      <Text style={[
                        styles.chatRiskText,
                        { color: RISK_COLORS[chat.riskLevel]?.text || '#888' }
                      ]}>
                        {chat.riskLevel || 'Low'} Risk
                      </Text>
                    </View>
                    <Text style={styles.chatDate}>
                      {chat.date
                        ? new Date(chat.date).toLocaleDateString()
                        : 'N/A'}
                    </Text>
                  </View>
                  {chat.diagnosis && (
                    <Text style={styles.chatDiagnosis}>
                      🧠 {chat.diagnosis}
                      {chat.severity ? ` · ${chat.severity}` : ''}
                    </Text>
                  )}
                  {chat.lastMessage && (
                    <Text style={styles.chatLastMsg} numberOfLines={2}>
                      "{chat.lastMessage}"
                    </Text>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* ── RESOURCES TAB ── */}
        {activeTab === 'resources' && (
          <>
            <Text style={styles.sectionTitle}>Recommended Resources</Text>
            {!summary.recommendations?.resources?.length ? (
              <EmptyState icon="📚" title="No resources yet" />
            ) : (
              summary.recommendations.resources.map((resource, i) => (
                <View key={i} style={styles.resourceCard}>
                  <View style={styles.resourceHeader}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <View style={styles.resourceTypeBadge}>
                      <Text style={styles.resourceTypeText}>{resource.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.resourceDesc}>{resource.description}</Text>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ─── Helper Components ────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const EmptyState = ({ icon, title }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyText}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  centered: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24
  },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  errorMsg: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
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
  urgentBanner: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
    gap: 10,
  },
  urgentIcon: { fontSize: 24 },
  urgentText: { flex: 1 },
  urgentTitle: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  urgentSub: { fontSize: 12, color: '#E53935', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 2,
  },
  tab: {
    flex: 1, paddingVertical: 8,
    alignItems: 'center', borderRadius: 16,
  },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700',
    color: '#1a1a2e', marginBottom: 12
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700',
    color: '#1a1a2e', marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: {
    fontSize: 13, fontWeight: '600',
    color: '#333', flex: 1, textAlign: 'right'
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, marginBottom: 8
  },
  riskBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20
  },
  riskBadgeText: { fontSize: 13, fontWeight: '700' },
  riskScore: { fontSize: 14, color: '#555' },
  riskDate: { fontSize: 11, color: '#aaa', marginTop: 4 },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  diagnosisLabel: { fontSize: 18, fontWeight: '800', color: '#6C63FF' },
  diagnosisConf: { fontSize: 13, color: '#888' },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20, marginBottom: 10
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  aiNotes: {
    fontSize: 13, color: '#555',
    fontStyle: 'italic', lineHeight: 20
  },
  noData: {
    fontSize: 14, color: '#aaa',
    textAlign: 'center', paddingVertical: 12
  },
  moodStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  moodStat: { alignItems: 'center', gap: 4, flex: 1 },
  moodStatValue: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  moodStatLabel: { fontSize: 10, color: '#888' },
  statDivider: { width: 1, height: 32, backgroundColor: '#e0e0e0' },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, paddingVertical: 5
  },
  specDot: { color: '#6C63FF', fontSize: 16 },
  specText: { fontSize: 14, color: '#444' },
  moodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14, marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', elevation: 2,
  },
  moodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  moodEmoji: { fontSize: 28 },
  moodType: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  moodDate: { fontSize: 11, color: '#888', marginTop: 2 },
  moodCardRight: { alignItems: 'flex-end', gap: 6 },
  moodScore: { fontSize: 16, fontWeight: '800', color: '#6C63FF' },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10
  },
  riskPillText: { fontSize: 11, fontWeight: '600' },
  chatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  chatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  chatRiskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10
  },
  chatRiskText: { fontSize: 11, fontWeight: '700' },
  chatDate: { fontSize: 11, color: '#888' },
  chatDiagnosis: {
    fontSize: 13, color: '#6C63FF',
    fontWeight: '600', marginBottom: 6
  },
  chatLastMsg: {
    fontSize: 13, color: '#555',
    fontStyle: 'italic', lineHeight: 18
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6, gap: 8,
  },
  resourceTitle: {
    fontSize: 14, fontWeight: '700',
    color: '#1a1a2e', flex: 1
  },
  resourceTypeBadge: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8,
  },
  resourceTypeText: { fontSize: 10, color: '#6C63FF', fontWeight: '600' },
  resourceDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#888' },
});