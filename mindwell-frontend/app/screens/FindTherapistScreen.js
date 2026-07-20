// app/screens/FindTherapistScreen.js
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput
} from 'react-native';
import { searchTherapists, getAllPsychiatrists } from '../utils/apiService';

export default function FindTherapistScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [sessionType, setSessionType] = useState('video');
  const [therapists, setTherapists] = useState([]);
  const [allTherapists, setAllTherapists] = useState([]);
  const [loading, setLoading] = useState(false);
  const recommendedDoctorId = route.params?.recommendedDoctorId;
  const recommendedSpecialties = route.params?.recommendedSpecialties || [];
  const patientSummary = route.params?.patientSummary;

  // Load all therapists on mount
  useEffect(() => {
    loadAllTherapists();
  }, []);

  // Filter therapists when search changes
  useEffect(() => {
    if (search.trim()) {
      const filtered = allTherapists.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.specializations?.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
        t.specialty?.toLowerCase().includes(search.toLowerCase())
      );
      setTherapists(filtered);
    } else {
      setTherapists(allTherapists);
    }
  }, [search, allTherapists]);

  const loadAllTherapists = async () => {
    setLoading(true);
    try {
      const response = await searchTherapists({});
      
      const formattedTherapists = (response?.data || []).map(therapist => ({
        id: therapist._id,
        name: therapist.name,
        specializations: therapist.specializations || [],
        specialty: therapist.specializations?.[0] || therapist.specialty || 'General Psychiatry',
        experience: therapist.experience_years ? `${therapist.experience_years} years` : 'Experienced',
        rating: therapist.avg_rating || 4.5,
        fee: therapist.session_rate || 2500,
        available: therapist.isAvailable !== false,
        sessions: therapist.total_patients || 0,
        hospital: therapist.hospital || '',
        about: therapist.hospital 
          ? `${therapist.name} is available at ${therapist.hospital}.` 
          : 'Experienced therapist ready for sessions.',
        languages: therapist.languages || ['English'],
        sessionTypes: therapist.session_types || ['video'],
        contact: therapist.contact || '',
        emoji: '👨‍⚕️'
      }));
      
      setAllTherapists(formattedTherapists);
      setTherapists(formattedTherapists);
      
      console.log(`Loaded ${formattedTherapists.length} therapists`);
    } catch (error) {
      console.error('Error loading therapists:', error);
      Alert.alert('Unable to load therapists', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMatchScore = therapist => {
    const matchingSpecialties = therapist.specializations?.filter(s => 
      recommendedSpecialties.includes(s)
    ) || [];
    
    const specialtyMatch = matchingSpecialties.length > 0 ? 3 : 0;
    const directMatch = therapist.id === recommendedDoctorId ? 4 : 0;
    const themeMatch = patientSummary?.themes?.some(theme =>
      therapist.specialty?.toLowerCase().includes(theme.toLowerCase().split(' ')[0])
    ) ? 2 : 0;
    return directMatch + specialtyMatch + themeMatch + (therapist.available ? 1 : 0);
  };

  const sortedTherapists = [...therapists].sort((a, b) => 
    getMatchScore(b) - getMatchScore(a) || b.rating - a.rating
  );

  const handleBook = (therapist) => {
    navigation.navigate('Booking', {
      therapist: {
        id: therapist.id,
        name: therapist.name,
        specialty: therapist.specialty,
        specializations: therapist.specializations,
        fee: therapist.fee,
        available: therapist.available,
        rating: therapist.rating,
        experience: therapist.experience,
        hospital: therapist.hospital,
        about: therapist.about,
        emoji: therapist.emoji
      },
      initialSessionType: sessionType
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Therapist</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {patientSummary && (
          <View style={styles.matchSummary}>
            <Text style={styles.matchSummaryTitle}>Recommended from your summary</Text>
            <Text style={styles.matchSummaryText}>
              Risk score {patientSummary.riskScore}/10 - matched for {recommendedSpecialties.join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Type</Text>
          <View style={styles.typeRow}>
            {['video', 'audio', 'text'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, sessionType === type && styles.typeBtnActive]}
                onPress={() => setSessionType(type)}
              >
                <Text style={styles.typeEmoji}>
                  {type === 'video' ? '📹' : type === 'audio' ? '🎙️' : '💬'}
                </Text>
                <Text style={[styles.typeText, sessionType === type && styles.typeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Therapists ({sortedTherapists.length})</Text>
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading therapists…</Text>
            </View>
          ) : sortedTherapists.map((therapist) => (
            <TouchableOpacity
              key={therapist.id}
              style={styles.card}
              onPress={() => setSelected(selected === therapist.id ? null : therapist.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarEmoji}>{therapist.emoji}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{therapist.name}</Text>
                  <Text style={styles.cardSpecialty}>
                    {therapist.specializations?.join(', ') || therapist.specialty || 'General Psychiatry'}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>⭐ {therapist.rating}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{therapist.experience}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{therapist.sessions} sessions</Text>
                  </View>
                </View>
                {getMatchScore(therapist) > 0 && (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>Match</Text>
                  </View>
                )}
                <View style={[
                  styles.availBadge,
                  { backgroundColor: therapist.available ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                  <Text style={[
                    styles.availText,
                    { color: therapist.available ? '#1D9E75' : '#FF6B6B' }
                  ]}>
                    {therapist.available ? 'Available' : 'Busy'}
                  </Text>
                </View>
              </View>

              {selected === therapist.id && (
                <View style={styles.expanded}>
                  <Text style={styles.aboutText}>{therapist.about}</Text>
                  
                  {therapist.specializations?.length > 0 && (
                    <View style={styles.specialtiesContainer}>
                      <Text style={styles.specialtiesTitle}>Specializations:</Text>
                      <View style={styles.specialtiesRow}>
                        {therapist.specializations.map((spec, index) => (
                          <View key={index} style={styles.specialtyTag}>
                            <Text style={styles.specialtyTagText}>{spec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {getMatchScore(therapist) > 0 && (
                    <View style={styles.recommendReason}>
                      <Text style={styles.recommendReasonTitle}>Why this matches</Text>
                      <Text style={styles.recommendReasonText}>
                        This psychiatrist aligns with your shared themes and current score.
                      </Text>
                    </View>
                  )}
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Session Fee:</Text>
                    <Text style={styles.feeValue}>PKR {therapist.fee}</Text>
                  </View>

                  <View style={styles.scheduleNote}>
                    <Text style={styles.scheduleNoteTitle}>Choose your appointment</Text>
                    <Text style={styles.scheduleNoteText}>
                      Select a date and available time on the next screen.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.bookBtn,
                      !therapist.available && styles.bookBtnDisabled
                    ]}
                    onPress={() => therapist.available && handleBook(therapist)}
                    disabled={!therapist.available}
                  >
                    <Text style={styles.bookBtnText}>
                      {therapist.available ? 'Choose Date & Time' : 'Not Available'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
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
  matchSummary: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  matchSummaryTitle: { color: '#1a1a2e', fontSize: 14, fontWeight: '800' },
  matchSummaryText: { color: '#666', fontSize: 12, lineHeight: 17, marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 14, paddingHorizontal: 14, elevation: 3 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#333' },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#fff', marginHorizontal: 4, elevation: 2 },
  typeBtnActive: { backgroundColor: '#6C63FF' },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typeTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0EFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarEmoji: { fontSize: 30 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  cardSpecialty: { fontSize: 13, color: '#6C63FF', marginTop: 2, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: 12, color: '#888' },
  metaDot: { color: '#ccc', marginHorizontal: 4 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  availText: { fontSize: 12, fontWeight: '600' },
  matchBadge: { backgroundColor: '#E8F5E9', borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5, marginRight: 6 },
  matchBadgeText: { color: '#1D9E75', fontSize: 10, fontWeight: '800' },
  expanded: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  aboutText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  specialtiesContainer: { marginBottom: 12 },
  specialtiesTitle: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  specialtyTag: { backgroundColor: '#F0EFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  specialtyTagText: { color: '#6C63FF', fontSize: 11, fontWeight: '600' },
  recommendReason: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12 },
  recommendReasonTitle: { color: '#1D6F54', fontSize: 12, fontWeight: '800' },
  recommendReasonText: { color: '#427D68', fontSize: 11, lineHeight: 16, marginTop: 3 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  feeLabel: { fontSize: 14, color: '#555' },
  feeValue: { fontSize: 16, fontWeight: '700', color: '#6C63FF' },
  scheduleNote: { backgroundColor: '#F0EFFF', borderRadius: 10, padding: 12, marginBottom: 16 },
  scheduleNoteTitle: { color: '#333', fontSize: 13, fontWeight: '700' },
  scheduleNoteText: { color: '#777', fontSize: 12, marginTop: 3 },
  bookBtn: { backgroundColor: '#6C63FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#ccc' },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadingState: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { color: '#777', marginTop: 8, fontSize: 13 },
});