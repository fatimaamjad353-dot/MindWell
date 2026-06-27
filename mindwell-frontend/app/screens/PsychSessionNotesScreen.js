import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function PsychSessionNotesScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { patient } = route.params || {};
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [riskAssessment, setRiskAssessment] = useState('medium');

  const handleSave = () => {
    if (!notes) { Alert.alert('Error', 'Please add session notes'); return; }
    Alert.alert('Notes Saved! ✅', 'Session notes have been saved and shared with the patient summary.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.sessionNotes}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{patient?.name}</Text>
        <Text style={styles.sessionDate}>Session: {new Date().toDateString()}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Session Notes *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Write your session notes here..."
          placeholderTextColor="#aaa"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Clinical Observations</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Diagnosis, observations, patterns noticed..."
          placeholderTextColor="#aaa"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Next Steps & Recommendations</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Homework, exercises, follow-up actions..."
          placeholderTextColor="#aaa"
          value={nextSteps}
          onChangeText={setNextSteps}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Update Risk Assessment</Text>
        <View style={styles.riskRow}>
          {['low', 'medium', 'high'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.riskBtn, riskAssessment === r && styles.riskBtnActive(r)]}
              onPress={() => setRiskAssessment(r)}
            >
              <Text style={styles.riskBtnText}>
                {r === 'low' ? '🟢 Low' : r === 'medium' ? '🟡 Medium' : '🔴 High'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Session Notes 💾</Text>
        </TouchableOpacity>
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
  patientInfo: { backgroundColor: '#1D9E75', padding: 16, alignItems: 'center', paddingBottom: 20 },
  patientName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sessionDate: { fontSize: 13, color: '#E0F5EF', marginTop: 4 },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  textArea: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#333', borderWidth: 1.5, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top' },
  riskRow: { flexDirection: 'row', gap: 8 },
  riskBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  riskBtnActive: (r) => ({ borderColor: r === 'low' ? '#1D9E75' : r === 'medium' ? '#FFC107' : '#FF6B6B', backgroundColor: r === 'low' ? '#E8F5E9' : r === 'medium' ? '#FFF9C4' : '#FFEBEE' }),
  riskBtnText: { fontSize: 13, fontWeight: '600', color: '#333' },
  saveBtn: { backgroundColor: '#1D9E75', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 24, elevation: 3 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
