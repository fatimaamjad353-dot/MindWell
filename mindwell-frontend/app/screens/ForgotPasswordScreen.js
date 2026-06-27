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
  ScrollView
} from 'react-native';

const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const sendReset = () => {
    const normalized = email.trim().toLowerCase();
    if (!emailPattern.test(normalized)) {
      Alert.alert('Invalid email', 'Enter the email address used for your account.');
      return;
    }

    Alert.alert(
      'Reset link requested',
      `In a connected production app, a secure reset link would be sent to ${normalized}.`,
      [{ text: 'Back to Login', onPress: () => navigation.goBack() }]
    );
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
            Enter your account email to request a secure password-reset link.
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
            onSubmitEditing={sendReset}
          />
          <TouchableOpacity style={styles.button} onPress={sendReset}>
            <Text style={styles.buttonText}>Request Reset Link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  content: { flexGrow: 1 },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { color: '#fff', fontSize: 24, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  spacer: { width: 30 },
  form: { padding: 24, alignItems: 'stretch' },
  icon: { textAlign: 'center', fontSize: 48, marginTop: 30 },
  heading: { textAlign: 'center', color: '#1a1a2e', fontSize: 22, fontWeight: '800', marginTop: 12 },
  help: { textAlign: 'center', color: '#666', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 24 },
  label: { color: '#333', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: '#333', fontSize: 15 },
  button: { backgroundColor: '#6C63FF', borderRadius: 12, alignItems: 'center', paddingVertical: 15, marginTop: 18 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});
