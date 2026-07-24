// app/screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { request } from '../utils/apiService';

export default function ForgotPasswordScreen({ navigation, route }) {
  const role = route.params?.role || 'patient';

  const [step, setStep] = useState(1); // 1=email, 2=otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Step 1: Send OTP ──────────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await request({
        path: '/password-reset/request',
        method: 'POST',
        body: { email: email.trim().toLowerCase(), role }
      });

      Alert.alert(
        '✅ OTP Sent',
        `A 6-digit reset code has been sent to ${email}. Please check your inbox.`
      );
      setStep(2);

    } catch (error) {
      Alert.alert('Error', error.message || 'Could not send reset OTP');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP then go to ResetPasswordScreen ────
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the OTP from your email');
      return;
    }
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'OTP must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      await request({
        path: '/password-reset/verify-otp',
        method: 'POST',
        body: { email: email.trim().toLowerCase(), otp: otp.trim(), role }
      });

      // ✅ Navigate to ResetPasswordScreen with email + otp + role
      navigation.navigate('ResetPassword', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        role
      });

    } catch (error) {
      Alert.alert('Invalid OTP', error.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step > 1) setStep(step - 1);
              else navigation.goBack();
            }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{step === 1 ? '🔑' : '📧'}</Text>
          </View>
          <Text style={styles.title}>
            {step === 1 ? 'Forgot Password' : 'Enter OTP'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your email to receive a 6-digit reset code'
              : `Enter the 6-digit OTP sent to ${email}`}
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[1, 2].map(s => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>

          {/* Step 1 — Email */}
          {step === 1 && (
            <>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your registered email"
                  placeholderTextColor="#aaa"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send Reset OTP →</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <>
              <Text style={styles.inputLabel}>6-Digit OTP</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIcon}>🔢</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="Enter OTP from email"
                  placeholderTextColor="#aaa"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Verify OTP →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOTP}
                disabled={loading}
              >
                <Text style={styles.resendText}>Didn't receive it? Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login', { role })}
          >
            <Text style={styles.loginLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', elevation: 2,
  },
  backBtnText: { fontSize: 20, color: '#6C63FF', fontWeight: '700' },
  iconSection: { alignItems: 'center', paddingVertical: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C63FF', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16, elevation: 4,
  },
  iconEmoji: { fontSize: 38 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: '#888',
    textAlign: 'center', paddingHorizontal: 30, lineHeight: 20,
  },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  stepDotActive: { backgroundColor: '#6C63FF', width: 24 },
  form: { paddingHorizontal: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    elevation: 2, gap: 10, marginBottom: 20,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  otpInput: { fontSize: 24, fontWeight: '700', letterSpacing: 10 },
  btn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    elevation: 3, marginBottom: 12,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 10 },
  resendText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { color: '#888', fontSize: 14 },
});