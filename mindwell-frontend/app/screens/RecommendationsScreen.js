// app/screens/RecommendationsScreen.js
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatientClinicalSummary,
  setSummaryConsent,
} from '../utils/patientSummaryStorage';
import { getTherapistRecommendations, getResourceRecommendations, searchTherapists } from '../utils/apiService';

export default function RecommendationsScreen({ navigation }) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [savingConsent, setSavingConsent] = useState(false);
  const [matchedPsychiatrists, setMatchedPsychiatrists] = useState([]);
  const [matchedSelfCare, setMatchedSelfCare] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      // Get patient summary from local storage
      const patientSummary = await getPatientClinicalSummary();
      setSummary(patientSummary);

      // Get therapist recommendations from backend
      if (patientSummary?.themes?.length > 0) {
        try {
          const response = await getTherapistRecommendations();
          if (response.success && response.data) {
            const therapists = response.data.recommendedTherapists || [];
            // Format therapists for display
            const formatted = therapists.map(doc => ({
              id: doc._id,
              name: doc.name,
              specialty: doc.specializations?.[0] || 'General Psychiatry',
              specializations: doc.specializations || [],
              tags: doc.specializations || [],
              experience: doc.experience_years ? `${doc.experience_years} years` : 'Experienced',
              rating: doc.avg_rating || 4.5,
              fee: doc.session_rate || 2500,
              available: doc.isAvailable !== false,
              reason: getMatchReason(doc, patientSummary),
              matchPercent: calculateMatchPercent(doc, patientSummary),
            }));
            setMatchedPsychiatrists(formatted);
          }
        } catch (error) {
          console.error('Error fetching therapist recommendations:', error);
          // Fallback to search
          await loadTherapistsFromSearch(patientSummary);
        }
      } else {
        // No themes, load all therapists
        await loadAllTherapists();
      }

      // Get self-care recommendations
      await loadSelfCareRecommendations(patientSummary);

    } catch (error) {
      console.error('Error loading recommendations:', error);
      Alert.alert('Error', 'Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fallback: Search for therapists
  const loadTherapistsFromSearch = async (patientSummary) => {
    try {
      const specialties = patientSummary?.recommendedSpecialties || ['General'];
      const response = await searchTherapists({ 
        specialization: specialties[0] 
      });
      
      if (response.success && response.data) {
        const formatted = response.data.map(doc => ({
          id: doc._id,
          name: doc.name,
          specialty: doc.specializations?.[0] || 'General Psychiatry',
          specializations: doc.specializations || [],
          tags: doc.specializations || [],
          experience: doc.experience_years ? `${doc.experience_years} years` : 'Experienced',
          rating: doc.avg_rating || 4.5,
          fee: doc.session_rate || 2500,
          available: doc.isAvailable !== false,
          reason: getMatchReason(doc, patientSummary),
          matchPercent: calculateMatchPercent(doc, patientSummary),
        }));
        setMatchedPsychiatrists(formatted);
      }
    } catch (error) {
      console.error('Error searching therapists:', error);
    }
  };

  // Load all therapists
  const loadAllTherapists = async () => {
    try {
      const response = await searchTherapists({});
      if (response.success && response.data) {
        const formatted = response.data.map(doc => ({
          id: doc._id,
          name: doc.name,
          specialty: doc.specializations?.[0] || 'General Psychiatry',
          specializations: doc.specializations || [],
          tags: doc.specializations || [],
          experience: doc.experience_years ? `${doc.experience_years} years` : 'Experienced',
          rating: doc.avg_rating || 4.5,
          fee: doc.session_rate || 2500,
          available: doc.isAvailable !== false,
          reason: 'Experienced therapist ready for sessions.',
          matchPercent: 50,
        }));
        setMatchedPsychiatrists(formatted);
      }
    } catch (error) {
      console.error('Error loading all therapists:', error);
    }
  };

  // Load self-care recommendations
  // In RecommendationsScreen.js - update this function

const loadSelfCareRecommendations = async (patientSummary) => {
  try {
    // Try to get resources from backend
    const response = await getResourceRecommendations('General');
    
    if (response.success && response.data) {
      const resources = response.data.resources || [];
      const formatted = resources.map((r, index) => ({
        id: r.id || index + 1,
        title: r.title || 'Self-care activity',
        subtitle: r.description || r.type || 'Practice this technique',
        duration: r.duration || '10 min',
        category: response.data.category || 'General',
      }));
      setMatchedSelfCare(formatted);
    } else {
      // If API fails, use default self-care
      setMatchedSelfCare(getDefaultSelfCare());
    }
  } catch (error) {
    console.error('Error loading self-care:', error);
    // Use default self-care on error
    setMatchedSelfCare(getDefaultSelfCare());
  }
};

// Add this helper function
const getDefaultSelfCare = () => {
  return [
    { id: 1, title: '4-7-8 Breathing', subtitle: 'Use when anxiety spikes.', duration: '5 min', category: 'Anxiety' },
    { id: 2, title: 'Thought Reframing', subtitle: 'Challenge repeated negative thoughts.', duration: '10 min', category: 'Low mood' },
    { id: 3, title: 'Sleep Wind-down', subtitle: 'Build a calmer bedtime routine.', duration: '8 min', category: 'Sleep' },
    { id: 4, title: 'Stress Journal', subtitle: 'Separate triggers from controllable next steps.', duration: '12 min', category: 'Stress' },
  ];
};
  // Helper functions
  const getMatchReason = (doc, summary) => {
    if (!summary) return 'Recommended based on your profile.';
    const matching = doc.specializations?.filter(s => 
      summary.themes?.includes(s) || summary.recommendedSpecialties?.includes(s)
    );
    if (matching?.length > 0) {
      return `Strong match for ${matching.slice(0, 2).join(', ')}.`;
    }
    return 'Recommended based on your needs.';
  };

  const calculateMatchPercent = (doc, summary) => {
    if (!summary) return 50;
    let score = 50;
    const matches = doc.specializations?.filter(s => 
      summary.themes?.includes(s) || summary.recommendedSpecialties?.includes(s)
    );
    if (matches?.length > 0) score += matches.length * 10;
    if (doc.avg_rating >= 4.5) score += 10;
    if (doc.isAvailable) score += 5;
    return Math.min(score, 98);
  };

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const riskColor = summary?.riskScore >= 7 ? '#FF6B6B' : summary?.riskScore >= 4 ? '#FFC107' : '#1D9E75';
  const riskLabel = summary?.riskLevel ? summary.riskLevel.charAt(0).toUpperCase() + summary.riskLevel.slice(1) : 'Loading';

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

  const bookRecommended = (doctor) => {
    navigation.navigate('FindTherapist', {
      recommendedDoctorId: doctor.id,
      recommendedSpecialties: summary?.recommendedSpecialties || [],
      patientSummary: summary,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{t.recommendations}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      </View>
    );
  }

  // Default self-care if none loaded
  const defaultSelfCare = [
    { id: 1, title: '4-7-8 Breathing', subtitle: 'Use when anxiety spikes.', duration: '5 min', category: 'Anxiety' },
    { id: 2, title: 'Thought Reframing', subtitle: 'Challenge repeated negative thoughts.', duration: '10 min', category: 'Low mood' },
    { id: 3, title: 'Sleep Wind-down', subtitle: 'Build a calmer bedtime routine.', duration: '8 min', category: 'Sleep' },
    { id: 4, title: 'Stress Journal', subtitle: 'Separate triggers from controllable next steps.', duration: '12 min', category: 'Stress' },
  ];

  const displaySelfCare = matchedSelfCare.length > 0 ? matchedSelfCare : defaultSelfCare;

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
            <Text style={[styles.riskScore, { color: riskColor }]}>{summary?.riskScore || 0}/10</Text>
            <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel} risk</Text>
          </View>
        </View>

        <View style={styles.summaryPoints}>
          {summary?.summaryPoints?.length > 0 ? (
            summary.summaryPoints.map((point, index) => (
              <Text key={index} style={styles.summaryPoint}>- {point}</Text>
            ))
          ) : (
            <>
              <Text style={styles.summaryPoint}>- No mood logs have been recorded yet.</Text>
              <Text style={styles.summaryPoint}>- Recent mood scores do not show repeated low mood.</Text>
              <Text style={styles.summaryPoint}>- No strong clinical theme has been detected yet.</Text>
              <Text style={styles.summaryPoint}>- No patient chat entries have been shared yet.</Text>
            </>
          )}
        </View>

        <View style={styles.tagsRow}>
          {summary?.recommendedSpecialties?.length > 0 ? (
            summary.recommendedSpecialties.map(item => (
              <View key={item} style={styles.tag}>
                <Text style={styles.tagText}>{item}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tag}>
              <Text style={styles.tagText}>General mental wellness</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.consentCard, summary?.consentGranted && styles.consentCardOn]}>
        <View style={styles.consentTextBlock}>
          <Text style={styles.consentTitle}>
            {summary?.consentGranted ? 'Sharing with psychiatrist' : 'Share summary with consent'}
          </Text>
          <Text style={styles.consentSub}>
            {summary?.consentGranted
              ? 'Your psychiatrist can view this summary, risk score, recent mood trend, and key chat themes.'
              : 'Enable sharing so your psychiatrist can prepare with your mood trend and chat-based concerns.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.consentButton, summary?.consentGranted && styles.consentButtonOn]}
          onPress={toggleConsent}
          disabled={savingConsent}
        >
          <Text style={[styles.consentButtonText, summary?.consentGranted && styles.consentButtonTextOn]}>
            {summary?.consentGranted ? 'Revoke' : 'Allow'}
          </Text>
        </TouchableOpacity>
      </View>

      {summary?.riskScore >= 7 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>Professional support is recommended</Text>
          <Text style={styles.alertText}>
            Your current summary shows elevated risk. Book a session with one of the matched psychiatrists below.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Matched psychiatrists</Text>
        {matchedPsychiatrists.map((doctor) => (
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
        {displaySelfCare.map(item => (
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { color: '#777', marginTop: 12, fontSize: 14 },
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