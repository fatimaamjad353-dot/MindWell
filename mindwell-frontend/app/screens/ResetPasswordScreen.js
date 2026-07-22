// app/screens/ResetPasswordScreen.js
import React, { useState, useEffect } from 'react';
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
import { verifyResetToken, resetPassword } from '../utils/apiService';

export default function ResetPasswordScreen({ navigation, route }) {
  // Get token and role from route params
  const { token: routeToken, role: routeRole } = route.params || {};
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(routeToken || '');
  const [role, setRole] = useState(routeRole || 'patient');

  useEffect(() => {
    if (routeToken && routeRole) {
      console.log('📧 Token from params:', routeToken);
      console.log('👤 Role from params:', routeRole);
      setToken(routeToken);
      setRole(routeRole);
      verifyToken(routeToken, routeRole);
    } else {
      Alert.alert('Invalid Link', 'The password reset link is invalid.', [
        { text: 'Go Back', onPress: () => navigation.navigate('Login') }
      ]);
      setVerifying(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify, roleToVerify) => {
    if (!tokenToVerify || !roleToVerify) {
      Alert.alert('Invalid Link', 'The password reset link is invalid.', [
        { text: 'Go Back', onPress: () => navigation.navigate('Login') }
      ]);
      setVerifying(false);
      return;
    }

    setVerifying(true);
    try {
      const response = await verifyResetToken(tokenToVerify, roleToVerify);
      if (response.success) {
        setValidToken(true);
        setEmail(response.data.email);
        setToken(tokenToVerify);
        setRole(roleToVerify);
      } else {
        Alert.alert('Invalid or Expired Link', 'Please request a new password reset link.', [
          { text: 'OK', onPress: () => navigation.navigate('ForgotPassword') }
        ]);
      }
    } catch (error) {
      console.error('Verify token error:', error);
      Alert.alert('Error', error.message || 'Could not verify reset link.');
      navigation.navigate('ForgotPassword');
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        token: token,
        role: role,
        newPassword: newPassword
      });

      if (response.success) {
        Alert.alert(
          'Password Reset Successful! 🎉',
          'You can now login with your new password.',
          [
            { 
              text: 'Login Now',
              onPress: () => navigation.navigate('Login', { role })
            }
          ]
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', error.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  if (!validToken) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Set New Password</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.form}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.heading}>Create New Password</Text>
          <Text style={styles.help}>
            Enter your new password below. It should be at least 6 characters long.
          </Text>

          <Text style={styles.emailLabel}>Resetting password for:</Text>
          <Text style={styles.emailText}>{email}</Text>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showButton}
            >
              <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F0EFFF' 
  },
  loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
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
  icon: { textAlign: 'center', fontSize: 48, marginTop: 20 },
  heading: { textAlign: 'center', color: '#1a1a2e', fontSize: 22, fontWeight: '800', marginTop: 12 },
  help: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 24,
  },
  emailLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  emailText: { color: '#333', fontSize: 16, fontWeight: '600', marginBottom: 16 },
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#333',
    fontSize: 15,
  },
  showButton: { paddingHorizontal: 12 },
  showText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backToLogin: {
    textAlign: 'center',
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
  },
});