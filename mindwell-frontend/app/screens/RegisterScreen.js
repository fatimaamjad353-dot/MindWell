import React, { useMemo, useState } from 'react';
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
import { useLanguage } from '../context/LanguageContext';
import { registerPatient, registerPsychiatrist } from '../utils/apiService';

const getPasswordStrength = password => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export default function RegisterScreen({ navigation, route }) {
  const { t } = useLanguage();
  const role = route.params?.role || 'patient';
  const isDoctor = role === 'psychologist';
  const accent = isDoctor ? '#1D9E75' : '#6C63FF';
  const soft = isDoctor ? '#E8F5E9' : '#E8E6FF';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [certifications, setCertifications] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthLabel = strength >= 4 ? 'Strong' : strength >= 2 ? 'Good' : 'Weak';
  const strengthColor = strength >= 4 ? '#1D9E75' : strength >= 2 ? '#F4A261' : '#FF6B6B';

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!normalizedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!accepted) {
      Alert.alert('Consent required', 'Please accept the privacy and consent notice.');
      return;
    }
    if (isDoctor && (!specialty.trim() || !verificationId.trim() || !certifications.trim())) {
      Alert.alert('Verification required', 'Please add your specialty, verification ID, and official certifications.');
      return;
    }

    setLoading(true);
    console.log('[RegisterScreen] submit', { role, isDoctor, name, email: normalizedEmail });
    try {
      if (isDoctor) {
        console.log('[RegisterScreen] registering psychiatrist');
        await registerPsychiatrist({
          name,
          email: normalizedEmail,
          password,
          phone_no: phone || undefined,
          specialization: specialty,
          license_number: verificationId
        });
        Alert.alert(
          'Verification submitted',
          'Your psychiatrist account has been sent to admin for approval. You can login after approval.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login', { role }) }]
        );
      } else {
        console.log('[RegisterScreen] registering patient');
        await registerPatient({
          name,
          email: normalizedEmail,
          password,
          phone_no: phone || undefined
        });
        Alert.alert(t.createAccount, 'Account created successfully. Please login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login', { role }) }
        ]);
      }
    } catch (error) {
      console.log('[RegisterScreen] registration failed', error.message || error);
      Alert.alert('Registration failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
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
      <View style={[styles.hero, { backgroundColor: accent }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>{isDoctor ? 'Provider onboarding' : 'Patient onboarding'}</Text>
        <Text style={styles.title}>{t.createAccount}</Text>
        <Text style={styles.subtitle}>
          {isDoctor
            ? 'Set up your secure clinical account for sessions and patient summaries.'
            : 'Start your private wellness space for mood tracking and care recommendations.'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.rolePill, { backgroundColor: soft }]}>
          <Text style={[styles.rolePillText, { color: accent }]}>
            Registering as {isDoctor ? t.psychologist : t.patient}
          </Text>
        </View>

        <Text style={styles.label}>{t.fullName} *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#A4A4B5"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{t.email} *</Text>
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

        <Text style={styles.label}>{t.password} *</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Create a secure password"
            placeholderTextColor="#A4A4B5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
          />
          <TouchableOpacity onPress={() => setShowPwd(current => !current)}>
            <Text style={[styles.toggle, { color: accent }]}>{showPwd ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.strengthRow}>
          {[1, 2, 3, 4, 5].map(item => (
            <View
              key={item}
              style={[
                styles.strengthBar,
                item <= strength && { backgroundColor: strengthColor }
              ]}
            />
          ))}
          <Text style={[styles.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
        </View>

        <Text style={styles.label}>{t.phone}</Text>
        <TextInput
          style={styles.input}
          placeholder="Optional phone number"
          placeholderTextColor="#A4A4B5"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {isDoctor && (
          <>
            <Text style={styles.label}>Specialty *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Anxiety & Depression"
              placeholderTextColor="#A4A4B5"
              value={specialty}
              onChangeText={setSpecialty}
            />

            <Text style={styles.label}>Verification ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. PMC-2026-12345"
              placeholderTextColor="#A4A4B5"
              value={verificationId}
              onChangeText={setVerificationId}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Official certifications *</Text>
            <TextInput
              style={[styles.input, styles.certInput]}
              placeholder="List degrees, licenses, certificates, and issuing institutions"
              placeholderTextColor="#A4A4B5"
              value={certifications}
              onChangeText={setCertifications}
              multiline
            />

            <View style={[styles.infoBox, { backgroundColor: soft }]}>
              <Text style={[styles.infoTitle, { color: accent }]}>Admin approval required</Text>
              <Text style={styles.infoText}>Your verification ID and certifications will be sent to admin. Login is enabled only after approval.</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.consentRow} onPress={() => setAccepted(current => !current)}>
          <View style={[styles.checkbox, accepted && { backgroundColor: accent, borderColor: accent }]}>
            {accepted && <Text style={styles.checkText}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            I agree to MindWell privacy, consent, and secure health-data sharing controls.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: accent }, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.register}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
          <Text style={styles.link}>{t.haveAccount} <Text style={[styles.linkBold, { color: accent }]}>{t.login}</Text></Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  content: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 58, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  backButtonText: { color: '#fff', fontSize: 25, lineHeight: 28 },
  kicker: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 330 },
  card: { backgroundColor: '#fff', marginHorizontal: 18, marginTop: -34, borderRadius: 24, padding: 22, elevation: 4 },
  rolePill: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, marginBottom: 8 },
  rolePillText: { fontSize: 12, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '800', color: '#333', marginBottom: 7, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#222', backgroundColor: '#F8F8FC' },
  certInput: { minHeight: 90, textAlignVertical: 'top' },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 15, paddingHorizontal: 15, backgroundColor: '#F8F8FC' },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
  toggle: { fontSize: 12, fontWeight: '900', paddingLeft: 8 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  strengthBar: { flex: 1, height: 5, borderRadius: 5, backgroundColor: '#E5E5EF' },
  strengthText: { fontSize: 11, fontWeight: '900', marginLeft: 6 },
  infoBox: { borderRadius: 14, padding: 13, marginTop: 16 },
  infoTitle: { fontSize: 12, fontWeight: '900' },
  infoText: { color: '#555', fontSize: 11, lineHeight: 16, marginTop: 3 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#CFCFE0', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  checkText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  consentText: { flex: 1, color: '#666', fontSize: 12, lineHeight: 18 },
  btn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 22, marginBottom: 16 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  link: { textAlign: 'center', color: '#666', fontSize: 14 },
  linkBold: { fontWeight: '900' },
  bottomSpace: { height: 30 },
});
