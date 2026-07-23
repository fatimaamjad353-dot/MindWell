// app/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import {
  loginPatient,
  loginPsychiatrist,
  loginAdmin,
  setAuthToken,
  setCurrentUser
} from '../utils/apiService';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ navigation, route }) {
  const role = route.params?.role || 'patient';
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    console.log('[LoginScreen] submit', { email, role });

    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      let result;

      if (role === 'patient') {
        console.log('[LoginScreen] patient login request');
        result = await loginPatient({ email: email.trim(), password });

      } else if (role === 'psychologist' || role === 'psychiatrist') {
        console.log('[LoginScreen] psychiatrist login request');
        result = await loginPsychiatrist({ email: email.trim(), password });

      } else if (role === 'admin') {
        console.log('[LoginScreen] admin login request');
        result = await loginAdmin({ email: email.trim(), password });
      }

      if (result?.success && result?.token) {
        // ✅ Save token and user data
        await setAuthToken(result.token);
        await setCurrentUser(result.user);

        console.log('[LoginScreen] login success', result.user);

        // ✅ Navigate based on role
        const userRole = result.user?.role || role;

        if (userRole === 'patient') {
          navigation.replace('PatientDashboard');
        } else if (userRole === 'psychiatrist') {
          navigation.replace('PsychologistDashboard');
        } else if (userRole === 'admin') {
          navigation.replace('Admin');
        } else {
          navigation.replace('PatientDashboard');
        }

      } else {
        Alert.alert('Login Failed', result?.message || 'Invalid credentials');
      }

    } catch (error) {
      console.log('[LoginScreen] login failed', error.message);
      Alert.alert(
        'Login Failed',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    if (role === 'psychologist' || role === 'psychiatrist') return 'Psychiatrist';
    if (role === 'admin') return 'Admin';
    return 'Patient';
  };

  const getRoleEmoji = () => {
    if (role === 'psychologist' || role === 'psychiatrist') return '👨‍⚕️';
    if (role === 'admin') return '🛡️';
    return '🧠';
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
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>{getRoleEmoji()}</Text>
          </View>
          <Text style={styles.appName}>MindWell</Text>
          <Text style={styles.roleLabel}>{getRoleTitle()} Login</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
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
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword', { role })}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Login →</Text>
            )}
          </TouchableOpacity>

          {/* Register Link — only for patients */}
          {(role === 'patient') && (
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register', { role })}
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Psychiatrist register link */}
          {(role === 'psychologist' || role === 'psychiatrist') && (
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>New psychiatrist? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register', { role: 'psychiatrist' })}
              >
                <Text style={styles.registerLink}>Apply Here</Text>
              </TouchableOpacity>
            </View>
          )}
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
  logoSection: { alignItems: 'center', paddingVertical: 32 },
  logoCircle: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  logoEmoji: { fontSize: 44 },
  appName: {
    fontSize: 32, fontWeight: '800',
    color: '#1a1a2e', marginBottom: 6
  },
  roleLabel: {
    fontSize: 16, color: '#6C63FF',
    fontWeight: '600'
  },
  form: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 16 },
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
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  loginBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { fontSize: 14, color: '#666' },
  registerLink: { fontSize: 14, color: '#6C63FF', fontWeight: '700' },
});