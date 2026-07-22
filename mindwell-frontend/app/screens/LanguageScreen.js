// app/screens/LanguageScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', rtl: true },
  // { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', rtl: false }, // ← Remove this line
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', rtl: true },
];

export default function LanguageScreen({ navigation, route }) {
  const { language, setLanguage } = useLanguage();
  const isOnboarding = route.params?.onboarding;
  const [selected, setSelected] = useState(language || 'en');

  const handleConfirm = () => {
    setLanguage(selected);
    if (isOnboarding) {
      navigation.replace('Role');
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!isOnboarding && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>🌐 Select Language</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Choose your preferred language</Text>
        <Text style={styles.subtitleSmall}>اپنی زبان منتخب کریں • اختر لغتك</Text>

        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langCard, selected === lang.code && styles.langCardActive]}
            onPress={() => setSelected(lang.code)}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <View style={styles.langInfo}>
              <Text style={styles.langName}>{lang.name}</Text>
              <Text style={styles.langNative}>{lang.native}</Text>
            </View>
            <View style={[styles.radio, selected === lang.code && styles.radioActive]}>
              {selected === lang.code && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>
            {selected === 'ur' ? 'جاری رکھیں ←' :
             selected === 'ar' ? 'متابعة ←' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  content: { padding: 24 },
  subtitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 8 },
  subtitleSmall: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24 },
  langCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  langCardActive: { borderColor: '#6C63FF', backgroundColor: '#F0EFFF' },
  flag: { fontSize: 40, marginRight: 16 },
  langInfo: { flex: 1 },
  langName: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  langNative: { fontSize: 15, color: '#888', marginTop: 4 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#6C63FF' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6C63FF' },
  confirmBtn: { backgroundColor: '#6C63FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, elevation: 3 },
  confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});