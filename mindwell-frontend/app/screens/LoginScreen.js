import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { loginPatient, loginPsychiatrist, setAuthToken } from '../utils/apiService';

const roleCopy = {
  patient: {
    title: 'Welcome back',
    subtitle: 'Continue tracking your mood, sessions, and wellness plan.',
    badge: 'Patient account',
    accent: '#6C63FF',
    soft: '#E8E6FF',
    icon: 'P'
  },
  psychologist: {
    title: 'Welcome, Doctor',
    subtitle: 'Access patient summaries, appointments, and clinical tools.',
    badge: 'Psychiatrist account',
    accent: '#1D9E75',
    soft: '#E8F5E9',
    icon: 'Dr'
  }
};

const demoPsychiatrist = {
  name: 'Dr. Demo Psychiatrist',
  email: 'demo.psych@mindwell.test',
  role: 'psychologist',
  specialty: 'Anxiety & Depression',
  verificationId: 'DEMO-PSY-APPROVED',
  certifications: 'Demo Board Certification, MindWell Clinical Training',
  accountStatus: 'approved',
};

export default function LoginScreen({ navigation, route }) {
  const role = route.params?.role || 'patient';
  const copy = roleCopy[role] || roleCopy.patient;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    console.log('[LoginScreen] submit', { role, email: normalizedEmail });
    try {
      const user = {
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role
      };

      if (role === 'patient') {
        console.log('[LoginScreen] patient login request');
        const response = await loginPatient({ email: normalizedEmail, password });
        await setAuthToken(response.token);
        navigation.replace('PatientDashboard', { user: response.user || user });
      } else {
        console.log('[LoginScreen] psychiatrist login request');
        const response = await loginPsychiatrist({ email: normalizedEmail, password });
        await setAuthToken(response.token);
        navigation.replace('PsychologistDashboard', { user: response.user || user });
      }
    } catch (error) {
      console.log('[LoginScreen] login failed', error.message || error);
      Alert.alert('Login failed', error.message || 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPsychLogin = () => {
    navigation.replace('PsychologistDashboard', { user: demoPsychiatrist });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: copy.accent }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.heroTop}>
          <View style={styles.logoCircle}>
            <Text style={[styles.logoText, { color: copy.accent }]}>{copy.icon}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{copy.badge}</Text>
          </View>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in</Text>
        <Text style={styles.cardSub}>Use the email and password linked to your MindWell account.</Text>

        <Text style={styles.label}>Email address</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#A4A4B5"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.labelRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={[styles.inlineLink, { color: copy.accent }]}>Forgot?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>*</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#A4A4B5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity onPress={() => setShowPwd(current => !current)}>
            <Text style={[styles.toggle, { color: copy.accent }]}>{showPwd ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {role === 'psychologist' && (
          <>
            <View style={[styles.securityNote, { backgroundColor: copy.soft }]}>
              <Text style={[styles.securityTitle, { color: copy.accent }]}>Two-factor required</Text>
              <Text style={styles.securityText}>Approved psychiatrist accounts verify identity after password login.</Text>
            </View>
            <TouchableOpacity style={styles.demoButton} onPress={handleDemoPsychLogin}>
              <Text style={[styles.demoButtonText, { color: copy.accent }]}>Use demo psychiatrist account</Text>
              <Text style={styles.demoHint}>Skips approval for frontend testing</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: copy.accent }, loading && styles.primaryButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Log in</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register', { role })}>
          <Text style={styles.switchText}>
            New to MindWell? <Text style={[styles.switchBold, { color: copy.accent }]}>Create account</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Your wellness data stays private and consent-controlled.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  content: { flexGrow: 1, paddingBottom: 28 },
  hero: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 58, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  backButtonText: { color: '#fff', fontSize: 25, lineHeight: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  logoCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: '900' },
  badge: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  title: { color: '#fff', fontSize: 30, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 310 },
  card: { backgroundColor: '#fff', marginHorizontal: 18, marginTop: -34, borderRadius: 24, padding: 22, elevation: 4 },
  cardTitle: { color: '#1a1a2e', fontSize: 22, fontWeight: '900' },
  cardSub: { color: '#777', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 12 },
  label: { color: '#333', fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  inlineLink: { fontSize: 12, fontWeight: '800', marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8FC', borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 15, paddingHorizontal: 14 },
  inputIcon: { color: '#9A9AAD', fontSize: 15, fontWeight: '800', marginRight: 10 },
  input: { flex: 1, color: '#222', fontSize: 15, paddingVertical: 14 },
  toggle: { fontSize: 12, fontWeight: '900', paddingLeft: 8 },
  securityNote: { borderRadius: 14, padding: 13, marginTop: 16 },
  securityTitle: { fontSize: 12, fontWeight: '900' },
  securityText: { color: '#555', fontSize: 11, lineHeight: 16, marginTop: 3 },
  demoButton: { borderWidth: 1.5, borderColor: '#D7D4FF', backgroundColor: '#fff', borderRadius: 14, padding: 13, alignItems: 'center', marginTop: 12 },
  demoButtonText: { fontSize: 13, fontWeight: '900' },
  demoHint: { color: '#777', fontSize: 11, marginTop: 3 },
  primaryButton: { borderRadius: 15, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  switchText: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 18 },
  switchBold: { fontWeight: '900' },
  footerText: { color: '#7B7894', textAlign: 'center', fontSize: 12, marginTop: 18, paddingHorizontal: 24 },
});
