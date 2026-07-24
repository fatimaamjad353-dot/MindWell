// app/screens/ResetPasswordScreen.js
// ✅ This screen now works with OTP-based reset (not link-based)
// It receives email, otp, and role from ForgotPasswordScreen
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { resetPassword } from '../utils/apiService';

export default function ResetPasswordScreen({ navigation, route }) {
  // ✅ Receive email, otp and role from ForgotPasswordScreen step 2
  const { email, otp, role } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ If no params received redirect to ForgotPassword
  if (!email || !otp || !role) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Invalid Request</Text>
        <Text style={styles.errorText}>
          Please go through the forgot password flow to reset your password.
        </Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => navigation.navigate('ForgotPassword', { role: role || 'patient' })}
        >
          <Text style={styles.errorBtnText}>Go to Forgot Password</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      // ✅ Send email + otp + newPassword to backend
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
        role
      });

      Alert.alert(
        '✅ Password Reset Successful!',
        'Your password has been updated. Please login with your new password.',
        [{ text: 'Login Now', onPress: () => navigation.replace('Login', { role }) }]
      );

    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert(
        'Error',
        error.message || 'Could not reset password. Please try again.',
        [
          { text: 'Try Again', style: 'cancel' },
          {
            text: 'Start Over',
            onPress: () => navigation.navigate('ForgotPassword', { role })
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Set New Password</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.form}>
          {/* Icon */}
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.heading}>Create New Password</Text>
          <Text style={styles.help}>
            Enter your new password below. It should be at least 6 characters long.
          </Text>

          {/* Email info */}
          <View style={styles.emailCard}>
            <Text style={styles.emailLabel}>Resetting password for:</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* New Password */}
          <Text style={styles.label}>New Password</Text>
          <View style={[
            styles.passwordContainer,
            passwordsDontMatch && styles.inputError
          ]}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 chars)"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showButton}
            >
              <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
          <View style={[
            styles.passwordContainer,
            passwordsDontMatch && styles.inputError,
            passwordsMatch && styles.inputSuccess
          ]}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
              editable={!loading}
            />
          </View>

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <Text style={[
              styles.matchText,
              { color: passwordsMatch ? '#1D9E75' : '#FF6B6B' }
            ]}>
              {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
            </Text>
          )}

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
            <Text style={styles.backToLogin}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  content: { flexGrow: 1 },
  errorContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 24,
    backgroundColor: '#F0EFFF'
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
  errorText: {
    fontSize: 14, color: '#666',
    textAlign: 'center', marginBottom: 24,
    lineHeight: 20
  },
  errorBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  back: { color: '#fff', fontSize: 24, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  spacer: { width: 30 },
  form: { padding: 24 },
  icon: { textAlign: 'center', fontSize: 48, marginTop: 20 },
  heading: {
    textAlign: 'center', color: '#1a1a2e',
    fontSize: 22, fontWeight: '800', marginTop: 12
  },
  help: {
    textAlign: 'center', color: '#666',
    fontSize: 13, lineHeight: 19,
    marginTop: 7, marginBottom: 20,
  },
  emailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6C63FF',
    elevation: 2,
  },
  emailLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  emailText: { color: '#333', fontSize: 15, fontWeight: '700' },
  label: { color: '#333', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    elevation: 1,
  },
  inputError: { borderColor: '#FF6B6B' },
  inputSuccess: { borderColor: '#1D9E75' },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#333',
    fontSize: 15,
  },
  showButton: { paddingHorizontal: 14 },
  showText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
  matchText: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 24,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backToLogin: {
    textAlign: 'center', color: '#6C63FF',
    fontSize: 14, fontWeight: '600', marginTop: 20,
  },
});