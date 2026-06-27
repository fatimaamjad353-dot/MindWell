 
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function TwoFactorScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { user, role, mandatory } = route.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Please enter the complete 6-digit code'); return; }
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Invalid code', 'The verification code must contain six digits.');
      return;
    }
    if (mandatory && code !== '123456') {
      Alert.alert('Incorrect code', 'Use the six-digit code sent to your email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('PsychologistDashboard', { user });
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.sub}>Enter the 6-digit code sent to your email</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.emailText}>Code sent to: {user?.email || 'your email'}</Text>
        {mandatory && (
          <View style={styles.requiredBox}>
            <Text style={styles.requiredText}>
              2FA is mandatory for psychiatrist accounts.
            </Text>
            <Text style={styles.demoText}>Frontend demo code: 123456</Text>
          </View>
        )}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => inputs.current[i] = r}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={text => handleChange(text, i)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Code ✓</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert('Code Resent', 'A new code has been sent to your email')}>
          <Text style={styles.resend}>Didn't receive code? <Text style={styles.resendBold}>Resend</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.replace('Login', { role })}>
          <Text style={styles.back}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', padding: 40, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 14, color: '#E0DEFF', marginTop: 8, textAlign: 'center' },
  content: { padding: 32, alignItems: 'center' },
  emailText: { fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center' },
  requiredBox: { width: '100%', backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginTop: -18, marginBottom: 22 },
  requiredText: { color: '#176C52', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  demoText: { color: '#3B665A', fontSize: 11, marginTop: 4, textAlign: 'center' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
  otpInput: { width: 48, height: 56, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, fontSize: 24, fontWeight: '700', color: '#333', backgroundColor: '#fff', marginHorizontal: 4, textAlign: 'center' },
  otpInputFilled: { borderColor: '#6C63FF', backgroundColor: '#F0EFFF' },
  btn: { backgroundColor: '#6C63FF', paddingVertical: 15, paddingHorizontal: 48, borderRadius: 12, alignItems: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { marginTop: 20, color: '#666', fontSize: 14 },
  resendBold: { color: '#6C63FF', fontWeight: '700' },
  back: { marginTop: 12, color: '#6C63FF', fontSize: 14 },
});
