 
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function RiskAlertScreen({ navigation }) {
  const { t } = useLanguage();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.alertIcon}>
        <Text style={styles.alertEmoji}>⚠️</Text>
      </View>
      <Text style={styles.title}>High Risk Detected</Text>
      <Text style={styles.sub}>Our AI has detected signs of distress in your recent activity. You are not alone — help is available.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Risk Score</Text>
        <Text style={styles.riskScore}>8.4 / 10</Text>
        <Text style={styles.riskLevel}>⚠️ High Risk</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why this alert?</Text>
        <Text style={styles.reason}>• Mood score below 3 for 3 days</Text>
        <Text style={styles.reason}>• Crisis keywords detected in chat</Text>
        <Text style={styles.reason}>• Significant decrease in activity</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('FindTherapist')}>
        <Text style={styles.primaryBtnText}>🗓 Book Emergency Session</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Chat')}>
        <Text style={styles.secondaryBtnText}>💬 Talk to AI Coach Now</Text>
      </TouchableOpacity>

      <View style={styles.hotlineCard}>
        <Text style={styles.hotlineTitle}>📞 Crisis Hotlines (Pakistan)</Text>
        <Text style={styles.hotlineSub}>Umang: 0317-4288665</Text>
        <Text style={styles.hotlineSub}>Rozan: 051-2890505</Text>
        <Text style={styles.hotlineSub}>Available 24/7</Text>
      </View>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.dismiss}>Dismiss Alert</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  content: { padding: 24, alignItems: 'center' },
  alertIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginTop: 60, marginBottom: 16 },
  alertEmoji: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#C62828', textAlign: 'center' },
  sub: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 12, lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  riskScore: { fontSize: 36, fontWeight: '700', color: '#FF6B6B', textAlign: 'center' },
  riskLevel: { fontSize: 16, color: '#FF6B6B', textAlign: 'center', fontWeight: '600', marginTop: 4 },
  reason: { fontSize: 14, color: '#555', marginBottom: 6 },
  primaryBtn: { backgroundColor: '#FF6B6B', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 10, elevation: 3 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#6C63FF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 16, elevation: 3 },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hotlineCard: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, width: '100%', marginBottom: 16 },
  hotlineTitle: { fontSize: 15, fontWeight: '700', color: '#1D9E75', marginBottom: 8 },
  hotlineSub: { fontSize: 14, color: '#333', marginBottom: 4 },
  dismiss: { color: '#aaa', fontSize: 14, marginBottom: 30 },
});