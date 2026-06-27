import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatientClinicalSummary,
  setSummaryConsent,
} from '../utils/patientSummaryStorage';

const psychiatrists = [
  {
    id: 1,
    name: 'Dr. Ayesha Khan',
    specialty: 'Anxiety & Depression',
    tags: ['Anxiety', 'Low mood', 'Sleep difficulties'],
    experience: '8 years',
    rating: 4.9,
    fee: 2500,
    available: true,
    reason: 'Strong fit for anxiety, depression, and CBT-based care.',
  },
  {
    id: 2,
    name: 'Dr. Omar Farooq',
    specialty: 'Stress & Trauma',
    tags: ['Stress', 'Trauma support', 'Crisis-informed care'],
    experience: '12 years',
    rating: 4.8,
    fee: 3000,
    available: true,
    reason: 'Best for high stress, trauma recovery, and urgent risk monitoring.',
  },
  {
    id: 3,
    name: 'Dr. Sara Ahmed',
    specialty: 'Relationship & Family',
    tags: ['Relationship or family concerns', 'Low mood'],
    experience: '6 years',
    rating: 4.7,
    fee: 2000,
    available: false,
    reason: 'Helpful when relationship or family issues are part of the pattern.',
  },
  {
    id: 4,
    name: 'Dr. Ali Hassan',
    specialty: 'Youth & Adolescent',
    tags: ['Anxiety', 'Stress', 'Low mood'],
    experience: '10 years',
    rating: 4.9,
    fee: 2800,
    available: true,
    reason: 'Recommended for young adults with mixed anxiety and stress signals.',
  },
];

const selfCareRecommendations = [
  { id: 1, title: '4-7-8 Breathing', subtitle: 'Use when anxiety spikes.', duration: '5 min', category: 'Anxiety' },
  { id: 2, title: 'Thought Reframing', subtitle: 'Challenge repeated negative thoughts.', duration: '10 min', category: 'Low mood' },
  { id: 3, title: 'Sleep Wind-down', subtitle: 'Build a calmer bedtime routine.', duration: '8 min', category: 'Sleep difficulties' },
  { id: 4, title: 'Stress Journal', subtitle: 'Separate triggers from controllable next steps.', duration: '12 min', category: 'Stress' },
];

export default function RecommendationsScreen({ navigation }) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [savingConsent, setSavingConsent] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummary(await getPatientClinicalSummary());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const riskColor = summary?.riskScore >= 7 ? '#FF6B6B' : summary?.riskScore >= 4 ? '#FFC107' : '#1D9E75';
  const riskLabel = summary?.riskLevel ? summary.riskLevel.charAt(0).toUpperCase() + summary.riskLevel.slice(1) : 'Loading';

  const matchedPsychiatrists = useMemo(() => {
    if (!summary) return [];
    return psychiatrists
      .map(doctor => {
        const themeMatches = doctor.tags.filter(tag =>
          summary.themes.includes(tag) || summary.recommendedSpecialties.includes(tag)
        ).length;
        const specialtyMatch = summary.recommendedSpecialties.includes(doctor.specialty) ? 2 : 0;
        const urgencyBoost = summary.riskScore >= 7 && doctor.tags.includes('Crisis-informed care') ? 2 : 0;
        const availabilityBoost = doctor.available ? 1 : 0;
        const matchScore = themeMatches * 2 + specialtyMatch + urgencyBoost + availabilityBoost;

        return {
          ...doctor,
          matchScore,
          matchPercent: Math.min(98, 62 + matchScore * 7),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore || b.rating - a.rating);
  }, [summary]);

  const matchedSelfCare = useMemo(() => {
    if (!summary?.themes?.length) return selfCareRecommendations.slice(0, 2);
    return selfCareRecommendations.filter(item => summary.themes.includes(item.category));
  }, [summary]);

  const toggleConsent = async () => {
    if (!summary) return;
    setSavingConsent(true);
    const nextConsent = !summary.consentGranted;
    await setSummaryConsent(nextConsent);
    await loadSummary();
    setSavingConsent(false);
    Alert.alert(
      nextConsent ? 'Summary sharing enabled' : 'Summary sharing disabled',
      nextConsent
        ? 'Your psychiatrist can view your consented summary before and during sessions.'
        : 'Your detailed summary will no longer be shared with psychiatrists.'
    );
  };

  const bookRecommended = doctor => {
    navigation.navigate('FindTherapist', {
      recommendedDoctorId: doctor.id,
      recommendedSpecialties: summary?.recommendedSpecialties || [],
      patientSummary: summary,
    });
  };

  if (!summary) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{t.recommendations}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.loadingText}>Building your recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.recommendations}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Your clinical summary</Text>
            <Text style={styles.summarySub}>Built from mood scores, mood notes, and AI coach chat signals.</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
            <Text style={[styles.riskScore, { color: riskColor }]}>{summary.riskScore}/10</Text>
            <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel} risk</Text>
          </View>
        </View>

        <View style={styles.summaryPoints}>
          {summary.summaryPoints.map(point => (
            <Text key={point} style={styles.summaryPoint}>- {point}</Text>
          ))}
        </View>

        <View style={styles.tagsRow}>
          {summary.recommendedSpecialties.map(item => (
            <View key={item} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.consentCard, summary.consentGranted && styles.consentCardOn]}>
        <View style={styles.consentTextBlock}>
          <Text style={styles.consentTitle}>
            {summary.consentGranted ? 'Sharing with psychiatrist' : 'Share summary with consent'}
          </Text>
          <Text style={styles.consentSub}>
            {summary.consentGranted
              ? 'Your psychiatrist can view this summary, risk score, recent mood trend, and key chat themes.'
              : 'Enable sharing so your psychiatrist can prepare with your mood trend and chat-based concerns.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.consentButton, summary.consentGranted && styles.consentButtonOn]}
          onPress={toggleConsent}
          disabled={savingConsent}
        >
          <Text style={[styles.consentButtonText, summary.consentGranted && styles.consentButtonTextOn]}>
            {summary.consentGranted ? 'Revoke' : 'Allow'}
          </Text>
        </TouchableOpacity>
      </View>

      {summary.riskScore >= 7 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>Professional support is recommended</Text>
          <Text style={styles.alertText}>
            Your current summary shows elevated risk. Book a session with one of the matched psychiatrists below.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Matched psychiatrists</Text>
        {matchedPsychiatrists.map(doctor => (
          <TouchableOpacity key={doctor.id} style={styles.doctorCard} onPress={() => bookRecommended(doctor)}>
            <View style={styles.doctorTop}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorInitial}>{doctor.name.replace('Dr. ', '')[0]}</Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                <Text style={styles.doctorMeta}>{doctor.rating} rating - {doctor.experience} - PKR {doctor.fee}</Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchScore}>{doctor.matchPercent}%</Text>
                <Text style={styles.matchLabel}>match</Text>
              </View>
            </View>
            <Text style={styles.matchReason}>{doctor.reason}</Text>
            <View style={styles.doctorFooter}>
              <Text style={[styles.availability, { color: doctor.available ? '#1D9E75' : '#FF6B6B' }]}>
                {doctor.available ? 'Available' : 'Currently busy'}
              </Text>
              <Text style={styles.bookText}>Book matched session</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relevant self-care while you wait</Text>
        {matchedSelfCare.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.selfCareCard}
            onPress={() => Alert.alert(item.title, `${item.subtitle}\n\nDuration: ${item.duration}`)}
          >
            <View>
              <Text style={styles.selfCareTitle}>{item.title}</Text>
              <Text style={styles.selfCareSub}>{item.subtitle}</Text>
            </View>
            <Text style={styles.selfCareDuration}>{item.duration}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  loadingText: { color: '#555', textAlign: 'center', marginTop: 40 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, margin: 16, padding: 16, elevation: 3 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryInfo: { flex: 1, paddingRight: 12 },
  summaryTitle: { color: '#1a1a2e', fontSize: 17, fontWeight: '800' },
  summarySub: { color: '#777', fontSize: 12, lineHeight: 17, marginTop: 4 },
  riskBadge: { borderRadius: 14, padding: 10, alignItems: 'center', minWidth: 76 },
  riskScore: { fontSize: 18, fontWeight: '800' },
  riskLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  summaryPoints: { backgroundColor: '#F8F8FC', borderRadius: 12, padding: 12, marginTop: 14 },
  summaryPoint: { color: '#444', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  tag: { backgroundColor: '#F0EFFF', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6 },
  tagText: { color: '#6C63FF', fontSize: 11, fontWeight: '700' },
  consentCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2, borderLeftWidth: 4, borderLeftColor: '#F4A261' },
  consentCardOn: { borderLeftColor: '#1D9E75' },
  consentTextBlock: { flex: 1, paddingRight: 12 },
  consentTitle: { color: '#1a1a2e', fontSize: 15, fontWeight: '800' },
  consentSub: { color: '#666', fontSize: 12, lineHeight: 17, marginTop: 4 },
  consentButton: { backgroundColor: '#6C63FF', borderRadius: 11, paddingHorizontal: 15, paddingVertical: 10 },
  consentButtonOn: { backgroundColor: '#E8F5E9' },
  consentButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  consentButtonTextOn: { color: '#1D9E75' },
  alertBox: { marginHorizontal: 16, backgroundColor: '#FFEBEE', borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#FF6B6B', marginBottom: 12 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: '#C62828' },
  alertText: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },
  doctorCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 10, elevation: 2 },
  doctorTop: { flexDirection: 'row', alignItems: 'center' },
  doctorAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8E6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  doctorInitial: { color: '#6C63FF', fontSize: 20, fontWeight: '800' },
  doctorInfo: { flex: 1 },
  doctorName: { color: '#1a1a2e', fontSize: 15, fontWeight: '800' },
  doctorSpecialty: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginTop: 2 },
  doctorMeta: { color: '#888', fontSize: 11, marginTop: 4 },
  matchBadge: { backgroundColor: '#E8F5E9', borderRadius: 13, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 7 },
  matchScore: { color: '#1D9E75', fontSize: 14, fontWeight: '800' },
  matchLabel: { color: '#1D9E75', fontSize: 9, fontWeight: '700' },
  matchReason: { color: '#555', fontSize: 12, lineHeight: 17, marginTop: 12 },
  doctorFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 12 },
  availability: { fontSize: 11, fontWeight: '800' },
  bookText: { color: '#6C63FF', fontSize: 11, fontWeight: '800' },
  selfCareCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  selfCareTitle: { color: '#1a1a2e', fontSize: 14, fontWeight: '800' },
  selfCareSub: { color: '#777', fontSize: 12, marginTop: 3, maxWidth: 230 },
  selfCareDuration: { color: '#6C63FF', fontSize: 11, fontWeight: '800' },
  bottomSpace: { height: 30 },
});
