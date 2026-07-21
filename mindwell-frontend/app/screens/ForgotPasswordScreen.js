// app/screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { requestPasswordReset } from '../utils/apiService';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRequestReset = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset({
        email: trimmedEmail,
        role: role
      });

      console.log('Password reset request response:', response);

      setEmailSent(true);
      Alert.alert(
        'Check Your Email',
        'If an account exists with this email, you will receive a password reset link.\n\nPlease check your spam folder if you don\'t see it.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setEmailSent(true);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Error',
        error.message || 'Could not process your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.form}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.heading}>Forgot your password?</Text>
          <Text style={styles.help}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Account Type</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'patient' && styles.roleButtonActive,
                loading && styles.roleButtonDisabled
              ]}
              onPress={() => !loading && setRole('patient')}
              disabled={loading}
            >
              <Text style={[
                styles.roleButtonText,
                role === 'patient' && styles.roleButtonTextActive
              ]}>
                Patient
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'psychologist' && styles.roleButtonActive,
                loading && styles.roleButtonDisabled
              ]}
              onPress={() => !loading && setRole('psychologist')}
              disabled={loading}
            >
              <Text style={[
                styles.roleButtonText,
                role === 'psychologist' && styles.roleButtonTextActive
              ]}>
                Psychiatrist
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {emailSent && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✅ A password reset link has been sent to your email.
              </Text>
              <Text style={styles.successSubtext}>
                Please check your inbox and spam folder.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backToLogin}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  content: { flexGrow: 1 },
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
  form: { padding: 24, alignItems: 'stretch' },
  icon: { textAlign: 'center', fontSize: 48, marginTop: 30 },
  heading: { textAlign: 'center', color: '#1a1a2e', fontSize: 22, fontWeight: '800', marginTop: 12 },
  help: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 24,
  },
  label: { color: '#333', fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#333',
    fontSize: 15,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EFFF',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#6C63FF',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1D9E75',
  },
  successText: {
    color: '#1D6F54',
    fontSize: 13,
    fontWeight: '600',
  },
  successSubtext: {
    color: '#3B665A',
    fontSize: 12,
    marginTop: 4,
  },
  backToLogin: {
    textAlign: 'center',
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
  },
});