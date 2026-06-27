import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSecuritySettings,
  savePasswordUpdate
} from '../utils/securityStorage';

const passwordRules = password => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password)
});

export default function PrivacySecurityScreen({ navigation, route }) {
  const role = route.params?.role || 'patient';
  const [security, setSecurity] = useState({});
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSecuritySettings().then(setSecurity);
    }, [])
  );

  const rules = passwordRules(newPassword);
  const validNewPassword = Object.values(rules).every(Boolean);

  const changePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Current password required', 'Enter your existing password.');
      return;
    }
    if (!validNewPassword) {
      Alert.alert('Weak password', 'Your new password must meet every rule shown below.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same new password.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Choose a new password', 'Your new password must differ from your current password.');
      return;
    }

    const updated = await savePasswordUpdate();
    setSecurity(updated);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert(
      'Password updated',
      'Your password has been changed. In production, other active sessions should now be signed out.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.securityCard}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>Account protection</Text>
            <Text style={styles.securityText}>
              Psychiatrist accounts always require two-factor authentication.
              Patient accounts use password protection and can add stronger verification later.
            </Text>
          </View>
        </View>

        {role !== 'patient' && (
          <View style={styles.requiredCard}>
            <Text style={styles.requiredTitle}>2FA Required</Text>
            <Text style={styles.requiredText}>
              Two-factor authentication cannot be disabled for psychiatrist accounts.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPasswords}
          />
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Create a strong password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPasswords}
          />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPasswords}
          />

          <TouchableOpacity onPress={() => setShowPasswords(current => !current)}>
            <Text style={styles.showText}>
              {showPasswords ? 'Hide passwords' : 'Show passwords'}
            </Text>
          </TouchableOpacity>

          <View style={styles.rules}>
            <Rule met={rules.length} text="At least 8 characters" />
            <Rule met={rules.upper} text="One uppercase letter" />
            <Rule met={rules.lower} text="One lowercase letter" />
            <Rule met={rules.number} text="One number" />
            <Rule met={rules.symbol} text="One symbol" />
          </View>

          <TouchableOpacity style={styles.changeButton} onPress={changePassword}>
            <Text style={styles.changeButtonText}>Update Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.resetLinkText}>Forgot current password?</Text>
          </TouchableOpacity>

          {security.passwordUpdatedAt && (
            <Text style={styles.updatedText}>
              Last changed: {new Date(security.passwordUpdatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Privacy recommendations</Text>
          <Text style={styles.infoText}>• Never share OTP or password-reset codes.</Text>
          <Text style={styles.infoText}>• Hide notification previews on shared devices.</Text>
          <Text style={styles.infoText}>• Sign out when using a public or borrowed phone.</Text>
          <Text style={styles.infoText}>• A production backend must hash passwords; they must never be stored as plain text.</Text>
        </View>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Rule({ met, text }) {
  return (
    <Text style={[styles.rule, met && styles.ruleMet]}>
      {met ? '✓' : '○'} {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 30 },
  securityCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', elevation: 2 },
  securityIcon: { fontSize: 34, marginRight: 12 },
  securityInfo: { flex: 1 },
  securityTitle: { color: '#1a1a2e', fontSize: 16, fontWeight: '800' },
  securityText: { color: '#666', fontSize: 12, lineHeight: 18, marginTop: 4 },
  requiredCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 14, backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  requiredTitle: { color: '#176C52', fontWeight: '800', fontSize: 14 },
  requiredText: { color: '#3B665A', fontSize: 12, lineHeight: 17, marginTop: 4 },
  form: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 2 },
  sectionTitle: { color: '#1a1a2e', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  label: { color: '#333', fontSize: 13, fontWeight: '600', marginTop: 13, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFAFA', color: '#333', fontSize: 15 },
  showText: { color: '#6C63FF', fontSize: 12, fontWeight: '700', marginTop: 10 },
  rules: { backgroundColor: '#F7F7FC', borderRadius: 12, padding: 12, marginTop: 14 },
  rule: { color: '#888', fontSize: 12, lineHeight: 20 },
  ruleMet: { color: '#1D9E75', fontWeight: '600' },
  changeButton: { backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  changeButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetLink: { alignItems: 'center', paddingVertical: 13 },
  resetLinkText: { color: '#6C63FF', fontSize: 13, fontWeight: '700' },
  updatedText: { textAlign: 'center', color: '#999', fontSize: 10 },
  infoCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2 },
  infoTitle: { color: '#1a1a2e', fontSize: 15, fontWeight: '800', marginBottom: 7 },
  infoText: { color: '#666', fontSize: 12, lineHeight: 19 },
  bottomSpace: { height: 30 }
});
