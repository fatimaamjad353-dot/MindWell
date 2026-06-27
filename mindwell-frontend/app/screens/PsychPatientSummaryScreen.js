import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getPatientClinicalSummary } from '../utils/patientSummaryStorage';

export default function PsychPatientSummaryScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { patient } = route.params || {};
  const [sharedSummary, setSharedSummary] = useState(null);

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

  const hasConsent = Boolean(sharedSummary?.consentGranted);
  const riskLevel = hasConsent ? sharedSummary.riskLevel : patient?.riskLevel;
  const riskScore = hasConsent ? sharedSummary.riskScore : patient?.riskScore;
  const riskColor = riskLevel === 'high' ? '#FF6B6B' : riskLevel === 'medium' ? '#FFC107' : '#1D9E75';
  const moodHistory = hasConsent
    ? sharedSummary.moodLogs.map(log => ({
        date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: Number(log.score || 0),
        note: log.note || log.mood || 'Mood check-in',
      }))
    : [];
  const summaryPoints = hasConsent
    ? sharedSummary.summaryPoints
    : ['Patient has not consented to share AI chat, search, or mood summary details.'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.patientSummary}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{patient?.name?.[0] || 'P'}</Text>
        </View>
        <Text style={styles.patientName}>{patient?.name || 'Patient'}</Text>
        <Text style={styles.patientIssue}>{hasConsent ? sharedSummary.recommendedSpecialties.join(' - ') : patient?.issue}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statVal}>{patient?.sessions || '-'}</Text><Text style={styles.statLabel}>Sessions</Text></View>
          <View style={styles.stat}><Text style={[styles.statVal, { color: riskColor }]}>{riskScore || '-'}</Text><Text style={styles.statLabel}>Risk Score</Text></View>
          <View style={styles.stat}><Text style={styles.statVal}>{patient?.age || '-'}</Text><Text style={styles.statLabel}>Age</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.riskAlert, { backgroundColor: `${riskColor}20`, borderLeftColor: riskColor }]}>
          <Text style={[styles.riskAlertTitle, { color: riskColor }]}>
            {hasConsent ? `${riskLevel?.toUpperCase()} RISK - CONSENTED SUMMARY` : 'CONSENT REQUIRED'}
          </Text>
          <Text style={styles.riskAlertSub}>
            {hasConsent
              ? 'Generated from consented mood logs and AI coach chat signals.'
              : 'Ask the patient to enable summary sharing from Recommendations before viewing details.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI-Generated Summary</Text>
        <View style={styles.summaryCard}>
          {summaryPoints.map(point => (
            <View key={point} style={styles.summaryItem}>
              <Text style={styles.summaryDot}>-</Text>
              <Text style={styles.summaryText}>{point}</Text>
            </View>
          ))}
          {hasConsent && (
            <View style={styles.themeRow}>
              {sharedSummary.recommendedSpecialties.map(item => (
                <View key={item} style={styles.themeTag}>
                  <Text style={styles.themeTagText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {hasConsent && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Mood History</Text>
          {moodHistory.length ? moodHistory.map((mood, index) => (
            <View key={`${mood.date}-${index}`} style={styles.moodItem}>
              <View style={styles.moodLeft}>
                <Text style={styles.moodDate}>{mood.date}</Text>
                <Text style={styles.moodNote}>{mood.note}</Text>
              </View>
              <View style={[styles.moodScore, { backgroundColor: mood.score >= 7 ? '#E8F5E9' : mood.score >= 5 ? '#FFF9C4' : '#FFEBEE' }]}>
                <Text style={[styles.moodScoreText, { color: mood.score >= 7 ? '#1D9E75' : mood.score >= 5 ? '#F57F17' : '#C62828' }]}>{mood.score}/10</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.emptyText}>No mood entries are available yet.</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Notes</Text>
        <TouchableOpacity style={styles.notesBtn} onPress={() => navigation.navigate('PsychSessionNotes', { patient })}>
          <Text style={styles.notesBtnText}>{t.addNotes}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sessionOnlyNote}>
        <Text style={styles.sessionOnlyTitle}>Clinical actions are session-only</Text>
        <Text style={styles.sessionOnlyText}>
          Join an active appointment to message this patient or share a prescription.
        </Text>
      </View>

      <TouchableOpacity style={styles.sessionBtn} onPress={() => navigation.navigate('PsychSessionNotes', { patient })}>
        <Text style={styles.sessionBtnText}>Start Session with {patient?.name || 'Patient'}</Text>
      </TouchableOpacity>
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 28, color: '#fff', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 30 },
  profileCard: { backgroundColor: '#6C63FF', alignItems: 'center', padding: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  patientName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  patientIssue: { fontSize: 14, color: '#E0DEFF', marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 24 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#E0DEFF', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  riskAlert: { borderRadius: 12, padding: 14, borderLeftWidth: 4 },
  riskAlertTitle: { fontSize: 15, fontWeight: '700' },
  riskAlertSub: { fontSize: 12, color: '#555', marginTop: 4 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  summaryItem: { flexDirection: 'row', marginBottom: 8 },
  summaryDot: { fontSize: 16, color: '#6C63FF', marginRight: 8 },
  summaryText: { fontSize: 14, color: '#333', flex: 1, lineHeight: 20 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  themeTag: { backgroundColor: '#F0EFFF', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5 },
  themeTagText: { color: '#6C63FF', fontSize: 10, fontWeight: '800' },
  moodItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, elevation: 2 },
  moodLeft: { flex: 1 },
  moodDate: { fontSize: 13, fontWeight: '600', color: '#333' },
  moodNote: { fontSize: 12, color: '#888', marginTop: 2 },
  moodScore: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  moodScoreText: { fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#888', fontSize: 12, textAlign: 'center', padding: 16 },
  notesBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#6C63FF', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2 },
  notesBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 15 },
  sessionOnlyNote: { backgroundColor: '#F0EFFF', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#845EC2' },
  sessionOnlyTitle: { color: '#44327A', fontSize: 13, fontWeight: '800' },
  sessionOnlyText: { color: '#6C6092', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sessionBtn: { backgroundColor: '#1D9E75', marginHorizontal: 16, marginTop: 10, paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 3 },
  sessionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bottomSpace: { height: 30 },
});
