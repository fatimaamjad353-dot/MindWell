// app/screens/RecommendationsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { request } from '../utils/apiService';

const RISK_COLORS = {
  High:   { bg: '#FFEBEE', text: '#FF6B6B', label: 'HIGH RISK' },
  Medium: { bg: '#FFF9C4', text: '#F59E0B', label: 'MEDIUM RISK' },
  Low:    { bg: '#E8F5E9', text: '#1D9E75', label: 'LOW RISK' },
};

const SEVERITY_COLORS = {
  Severe:   { bg: '#FFEBEE', text: '#FF6B6B' },
  Moderate: { bg: '#FFF9C4', text: '#F59E0B' },
  Mild:     { bg: '#E8F5E9', text: '#1D9E75' },
};

export default function RecommendationsScreen({ navigation }) {
  const [triage, setTriage] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  const loadData = useCallback(async () => {
    try {
      // ── 1. Get triage/patient summary ──────────────────────
      const triageResult = await request({
        path: '/ai/recommender/triage'
      });
      const triageData = triageResult?.data;
      setTriage(triageData);

      // ── 2. Get matched therapists ──────────────────────────
      const therapistResult = await request({
        path: '/ai/recommender/recommend',
        method: 'POST'
      });
      setTherapists(therapistResult?.data?.recommendedTherapists || []);

      // ── 3. Get resources based on diagnosis ────────────────
      const diagnosis = triageData?.patientAnalysis?.diagnosis;
      if (diagnosis) {
        const resourceResult = await request({
          path: `/ai/recommender/resources/${encodeURIComponent(diagnosis)}`
        });
        setResources(resourceResult?.data?.resources || []);
      } else {
        // Get general resources
        const resourceResult = await request({
          path: '/ai/recommender/resources/General'
        });
        setResources(resourceResult?.data?.resources || []);
      }

    } catch (error) {
      console.error('Recommendations error:', error.message);
      Alert.alert('Error', 'Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Analyzing your wellness data...</Text>
      </View>
    );
  }

  const analysis = triage?.patientAnalysis;
  const riskCategory = analysis?.riskScore >= 7 ? 'High'
    : analysis?.riskScore >= 4 ? 'Medium' : 'Low';
  const riskStyle = RISK_COLORS[riskCategory] || RISK_COLORS.Low;
  const severityStyle = SEVERITY_COLORS[analysis?.severity] || null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recommendations</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['summary', 'therapists', 'resources'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'summary' ? '📊 Summary'
                : tab === 'therapists' ? '👨‍⚕️ Therapists'
                : '📚 Self-Care'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6C63FF']}
          />
        }
      >

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>

            {/* Risk Score Card */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: riskStyle.text }]}>
              <View style={styles.riskHeader}>
                <View>
                  <Text style={styles.cardTitle}>Your Clinical Summary</Text>
                  <Text style={styles.cardSubtitle}>
                    Built from your mood logs and AI chat signals
                  </Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskStyle.bg }]}>
                  <Text style={[styles.riskScore, { color: riskStyle.text }]}>
                    {analysis?.riskScore || 0}/10
                  </Text>
                  <Text style={[styles.riskLabel, { color: riskStyle.text }]}>
                    {riskStyle.label}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {analysis?.averageMoodScore || 0}/10
                  </Text>
                  <Text style={styles.statLabel}>Avg Mood</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {analysis?.dominantMood || 'Neutral'}
                  </Text>
                  <Text style={styles.statLabel}>Dominant Mood</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {analysis?.moodEntryCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Mood Logs</Text>
                </View>
              </View>
            </View>

            {/* Diagnosis Card */}
            {analysis?.diagnosis ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🧠 AI Detected Pattern</Text>
                <View style={styles.diagnosisRow}>
                  <Text style={styles.diagnosisLabel}>{analysis.diagnosis}</Text>
                  <Text style={styles.diagnosisConf}>
                    {analysis?.confidence
                      ? `${parseFloat(analysis.confidence).toFixed(1)}% confidence`
                      : ''}
                  </Text>
                </View>
                {analysis?.severity && severityStyle && (
                  <View style={[styles.severityBadge, { backgroundColor: severityStyle.bg }]}>
                    <Text style={[styles.severityText, { color: severityStyle.text }]}>
                      {analysis.severity} Severity
                    </Text>
                  </View>
                )}
                {analysis?.urgentHelp && (
                  <View style={styles.urgentAlert}>
                    <Text style={styles.urgentText}>
                      🆘 Based on your data, we strongly recommend speaking with a professional soon.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🧠 AI Pattern Detection</Text>
                <Text style={styles.noDataText}>
                  Chat with our AI Coach to get a personalized diagnosis and recommendations.
                </Text>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => navigation.navigate('Chat')}
                >
                  <Text style={styles.chatBtnText}>Open AI Coach →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent Moods */}
            {triage?.recentMoods?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Recent Mood History</Text>
                {triage.recentMoods.map((mood, i) => (
                  <View key={i} style={styles.moodRow}>
                    <View style={styles.moodLeft}>
                      <Text style={styles.moodDot}>●</Text>
                      <View>
                        <Text style={styles.moodType}>{mood.moodType}</Text>
                        <Text style={styles.moodDate}>
                          {new Date(mood.timestamp).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.moodRight}>
                      <Text style={styles.moodScore}>{mood.moodScore}/10</Text>
                      <View style={[
                        styles.riskPill,
                        {
                          backgroundColor: RISK_COLORS[mood.riskLevel]?.bg || '#F5F5F5'
                        }
                      ]}>
                        <Text style={[
                          styles.riskPillText,
                          { color: RISK_COLORS[mood.riskLevel]?.text || '#888' }
                        ]}>
                          {mood.riskLevel || 'Low'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recommended Specializations */}
            {triage?.recommendedSpecializations?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 Recommended Specializations</Text>
                {triage.recommendedSpecializations.map((spec, i) => (
                  <View key={i} style={styles.specRow}>
                    <Text style={styles.specDot}>•</Text>
                    <Text style={styles.specText}>{spec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Sharing with psychiatrist info */}
            <View style={[styles.card, styles.sharingCard]}>
              <Text style={styles.sharingTitle}>🔒 Sharing with Psychiatrist</Text>
              <Text style={styles.sharingText}>
                Your psychiatrist can view this summary, risk score, mood trend, and AI insights to better help you.
              </Text>
            </View>

          </View>
        )}

        {/* ── THERAPISTS TAB ── */}
        {activeTab === 'therapists' && (
          <View style={styles.tabContent}>
            {therapists.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>👨‍⚕️</Text>
                <Text style={styles.emptyTitle}>No Matched Therapists</Text>
                <Text style={styles.emptySubtitle}>
                  Log your mood and chat with AI Coach to get personalized therapist matches
                </Text>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => navigation.navigate('Chat')}
                >
                  <Text style={styles.chatBtnText}>Chat with AI Coach</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.matchTitle}>
                  {therapists.length} Matched Psychiatrist{therapists.length !== 1 ? 's' : ''}
                </Text>
                {therapists.map((therapist, i) => (
                  <View key={therapist._id || i} style={styles.therapistCard}>
                    <View style={styles.therapistHeader}>
                      <View style={styles.therapistAvatar}>
                        <Text style={styles.therapistAvatarText}>
                          {therapist.name?.[0]?.toUpperCase() || '👨‍⚕️'}
                        </Text>
                      </View>
                      <View style={styles.therapistInfo}>
                        <Text style={styles.therapistName}>{therapist.name}</Text>
                        <Text style={styles.therapistSpec}>
                          {therapist.specializations?.[0] || 'General Psychiatry'}
                        </Text>
                        <Text style={styles.therapistMeta}>
                          ⭐ {therapist.avg_rating || '4.5'} ·
                          {therapist.experience_years
                            ? ` ${therapist.experience_years} yrs exp`
                            : ' Experienced'} ·
                          PKR {therapist.session_rate || 2500}
                        </Text>
                      </View>
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>Matched</Text>
                      </View>
                    </View>

                    {therapist.hospital ? (
                      <Text style={styles.therapistHospital}>
                        🏥 {therapist.hospital}
                      </Text>
                    ) : null}

                    <View style={styles.therapistActions}>
                      <View style={[
                        styles.availabilityBadge,
                        { backgroundColor: therapist.isAvailable ? '#E8F5E9' : '#FFEBEE' }
                      ]}>
                        <Text style={[
                          styles.availabilityText,
                          { color: therapist.isAvailable ? '#1D9E75' : '#FF6B6B' }
                        ]}>
                          {therapist.isAvailable ? '● Available' : '● Unavailable'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => navigation.navigate('Booking', {
                          therapist: {
                            id: therapist._id,
                            name: therapist.name,
                            specialty: therapist.specializations?.[0] || 'Psychiatry',
                            fee: therapist.session_rate || 2500,
                            emoji: '👨‍⚕️'
                          }
                        })}
                        disabled={!therapist.isAvailable}
                      >
                        <Text style={styles.bookBtnText}>Book Session →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ── RESOURCES TAB ── */}
        {activeTab === 'resources' && (
          <View style={styles.tabContent}>
            {resources.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>No Resources Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Resources will appear based on your AI diagnosis
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.matchTitle}>
                  Self-Care Resources
                  {analysis?.diagnosis ? ` for ${analysis.diagnosis}` : ''}
                </Text>
                {resources.map((resource, i) => (
                  <View key={i} style={styles.resourceCard}>
                    <View style={styles.resourceHeader}>
                      <Text style={styles.resourceTitle}>{resource.title}</Text>
                      <View style={styles.resourceTypeBadge}>
                        <Text style={styles.resourceTypeText}>{resource.type}</Text>
                      </View>
                    </View>
                    <Text style={styles.resourceDesc}>{resource.description}</Text>
                    {resource.link && (
                      <Text style={styles.resourceLink}>🔗 View Resource</Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 2,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#888', marginBottom: 14 },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  riskBadge: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
  },
  riskScore: { fontSize: 22, fontWeight: '800' },
  riskLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 3 },
  statDivider: { width: 1, height: 32, backgroundColor: '#f0f0f0' },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  diagnosisLabel: { fontSize: 20, fontWeight: '800', color: '#6C63FF' },
  diagnosisConf: { fontSize: 12, color: '#888' },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  urgentAlert: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  urgentText: { fontSize: 13, color: '#C62828', lineHeight: 18 },
  noDataText: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 14 },
  chatBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  moodLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodDot: { color: '#6C63FF', fontSize: 10 },
  moodType: { fontSize: 13, fontWeight: '600', color: '#333' },
  moodDate: { fontSize: 11, color: '#888', marginTop: 2 },
  moodRight: { alignItems: 'flex-end', gap: 4 },
  moodScore: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  riskPillText: { fontSize: 10, fontWeight: '600' },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  specDot: { color: '#6C63FF', fontSize: 16 },
  specText: { fontSize: 14, color: '#444' },
  sharingCard: { borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  sharingTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  sharingText: { fontSize: 13, color: '#666', lineHeight: 20 },
  matchTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },
  therapistCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  therapistHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  therapistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  therapistAvatarText: { fontSize: 20, fontWeight: '800', color: '#6C63FF' },
  therapistInfo: { flex: 1 },
  therapistName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  therapistSpec: { fontSize: 13, color: '#6C63FF', marginTop: 2 },
  therapistMeta: { fontSize: 11, color: '#888', marginTop: 4 },
  matchBadge: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchText: { fontSize: 11, color: '#6C63FF', fontWeight: '700' },
  therapistHospital: { fontSize: 12, color: '#666', marginBottom: 10 },
  therapistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  availabilityText: { fontSize: 12, fontWeight: '600' },
  bookBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  resourceTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  resourceTypeBadge: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resourceTypeText: { fontSize: 10, color: '#6C63FF', fontWeight: '600' },
  resourceDesc: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 6 },
  resourceLink: { fontSize: 12, color: '#6C63FF', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
});