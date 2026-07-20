// app/utils/patientSummaryStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mindwell_patient_summary';

export const getPatientClinicalSummary = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Return default summary if none exists
    return {
      consentGranted: false,
      riskScore: 0,
      riskLevel: 'Low',
      themes: [],
      summaryPoints: [
        'No mood logs have been recorded yet.',
        'Recent mood scores do not show repeated low mood.',
        'No strong clinical theme has been detected yet.',
        'No patient chat entries have been shared yet.'
      ],
      recommendedSpecialties: ['General mental wellness']
    };
  } catch (error) {
    console.error('Error loading patient summary:', error);
    return null;
  }
};

export const setSummaryConsent = async (granted) => {
  try {
    const current = await getPatientClinicalSummary();
    const updated = { ...current, consentGranted: granted };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error setting consent:', error);
    throw error;
  }
};