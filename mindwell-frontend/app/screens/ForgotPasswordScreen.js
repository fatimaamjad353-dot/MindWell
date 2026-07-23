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

  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=newpassword
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Step 1: Send OTP ──────────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await request({
        path: '/auth/send-otp',
        method: 'POST',
        body: { email: email.trim(), role }
      });

      Alert.alert(
        '✅ OTP Sent',
        `A verification code has been sent to ${email}`
      );
      setStep(2);

    } catch (error) {
      Alert.alert('Error', error.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      await request({
        path: '/auth/verify-otp',
        method: 'POST',
        body: { email: email.trim(), otp: otp.trim(), role }
      });

      setStep(3);

    } catch (error) {
      Alert.alert('Invalid OTP', error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Reset Password ────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Required', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await request({
        path: '/auth/reset-password',
        method: 'POST',
        body: {
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
          role
        }
      });

      Alert.alert(
        '✅ Password Reset',
        'Your password has been reset successfully. Please login with your new password.',
        [{ text: 'Login', onPress: () => navigation.replace('Login', { role }) }]
      );

    } catch (error) {
      Alert.alert('Error', error.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    if (step === 1) return 'Forgot Password';
    if (step === 2) return 'Enter OTP';
    return 'New Password';
  };

  const getStepSubtitle = () => {
    if (step === 1) return 'Enter your email to receive a verification code';
    if (step === 2) return `Enter the OTP sent to ${email}`;
    return 'Create a new secure password';
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
              if (step > 1) {
                setStep(step - 1);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>
              {step === 1 ? '🔑' : step === 2 ? '📧' : '🔒'}
            </Text>
          </View>
          <Text style={styles.title}>{getStepTitle()}</Text>
          <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[styles.stepDot, step >= s && styles.stepDotActive]}
            />
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
                  placeholder="Enter your email"
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIcon}>🔢</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="Enter 6-digit OTP"
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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify OTP →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOTP}
                disabled={loading}
              >
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 — New Password */}
          {step === 3 && (
            <>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#aaa"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Confirm Password
              </Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#aaa"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Reset Password →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back to login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login', { role })}
          >
            <Text style={styles.loginLinkText}>
              Back to Login
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  backBtnText: { fontSize: 20, color: '#6C63FF', fontWeight: '700' },
  iconSection: { alignItems: 'center', paddingVertical: 24 },
  iconCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  iconEmoji: { fontSize: 38 },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: '#888',
    textAlign: 'center',
    paddingHorizontal: 30
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  stepDotActive: { backgroundColor: '#6C63FF', width: 24 },
  form: { paddingHorizontal: 24 },
  inputLabel: {
    fontSize: 14, fontWeight: '600',
    color: '#1a1a2e', marginBottom: 8
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 2,
    gap: 10,
    marginBottom: 20,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  otpInput: { fontSize: 22, fontWeight: '700', letterSpacing: 8 },
  btn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: { color: '#888', fontSize: 14 },
});