import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const recentPrescriptions = [
  { id: 1, patient: 'Sarah M.', medicine: 'Sertraline 25 mg', instructions: 'Once daily after breakfast', date: 'June 8' },
  { id: 2, patient: 'Ahmed K.', medicine: 'Melatonin 3 mg', instructions: 'Once nightly for 14 days', date: 'June 5' },
];

export default function PsychPrescriptionsScreen({ navigation, route }) {
  const patient = route.params?.patient;
  const [patientName, setPatientName] = useState(patient?.name || '');
  const [medicine, setMedicine] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prescriptions, setPrescriptions] = useState(recentPrescriptions);

  const createPrescription = () => {
    if (!patientName.trim() || !medicine.trim() || !instructions.trim()) {
      Alert.alert('Missing details', 'Add the patient, medication, and instructions.');
      return;
    }
    setPrescriptions(current => [{
      id: Date.now(), patient: patientName.trim(), medicine: medicine.trim(), instructions: instructions.trim(), date: 'Today',
    }, ...current]);
    setMedicine('');
    setInstructions('');
    Alert.alert('Prescription created', 'The prescription has been added to the patient record.');
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Prescriptions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>New prescription</Text>
        <Text style={styles.label}>Patient</Text>
        <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Patient name" placeholderTextColor="#aaa" />
        <Text style={styles.label}>Medication and dose</Text>
        <TextInput style={styles.input} value={medicine} onChangeText={setMedicine} placeholder="e.g. Sertraline 25 mg" placeholderTextColor="#aaa" />
        <Text style={styles.label}>Directions</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Frequency, duration, and important guidance"
          placeholderTextColor="#aaa"
          multiline
        />
        <TouchableOpacity style={styles.createButton} onPress={createPrescription}>
          <Text style={styles.createButtonText}>Create prescription</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Review dosage, contraindications, and patient history before issuing.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent prescriptions</Text>
        {prescriptions.map(item => (
          <View key={item.id} style={styles.prescriptionCard}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.patientName}>{item.patient}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={styles.activeBadge}><Text style={styles.activeText}>ACTIVE</Text></View>
            </View>
            <Text style={styles.medicine}>{item.medicine}</Text>
            <Text style={styles.instructions}>{item.instructions}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Prescription details', `${item.medicine}\n${item.instructions}`)}>
              <Text style={styles.viewText}>View details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { color: '#fff', fontSize: 28, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24 },
  formCard: { backgroundColor: '#fff', borderRadius: 18, margin: 16, padding: 18, elevation: 3 },
  formTitle: { color: '#1a1a2e', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { color: '#444', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F8F8FC', borderWidth: 1, borderColor: '#E2E2EC', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: '#222', fontSize: 14 },
  notesInput: { minHeight: 82, textAlignVertical: 'top' },
  createButton: { backgroundColor: '#6C63FF', borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disclaimer: { color: '#888', fontSize: 10, lineHeight: 15, marginTop: 10 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { color: '#1a1a2e', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  prescriptionCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  patientName: { color: '#1a1a2e', fontSize: 15, fontWeight: '700' },
  date: { color: '#999', fontSize: 11, marginTop: 2 },
  activeBadge: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  activeText: { color: '#1D9E75', fontSize: 9, fontWeight: '700' },
  medicine: { color: '#6C63FF', fontSize: 15, fontWeight: '700', marginTop: 13 },
  instructions: { color: '#555', fontSize: 13, marginTop: 4 },
  viewText: { color: '#1D9E75', fontSize: 12, fontWeight: '700', marginTop: 12 },
});
