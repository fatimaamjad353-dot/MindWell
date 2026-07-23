// app/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request, clearAuthToken } from '../utils/apiService';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();

  const [user, setUser] = useState(null);
  const [consent, setConsent] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPatient, setIsPatient] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('mindwell_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // ✅ Only load consent for patients
        if (parsedUser?.role === 'patient') {
          setIsPatient(true);
          loadConsent();
        }
      }
    } catch (error) {
      console.error('Load user error:', error.message);
    }
  };

  const loadConsent = async () => {
    try {
      const result = await request({ path: '/auth/patient/consent' });
      setConsent(result.data.dataShareConsent || false);
    } catch (error) {
      console.log('Consent load error:', error.message);
    }
  };

  const handleConsentToggle = async (value) => {
    setConsentLoading(true);
    try {
      await request({
        path: '/auth/patient/consent',
        method: 'PATCH',
        body: { consent: value }
      });
      setConsent(value);
      Alert.alert(
        value ? '✅ Data Sharing Enabled' : '🔒 Data Sharing Disabled',
        value
          ? 'Your psychiatrist can now view your mood data, AI chat insights and risk assessment to better help you.'
          : 'Your data is now private. Psychiatrists cannot view your summary.'
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not update consent');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuthToken();
            navigation.replace('Role');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        {user && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.name?.[0]?.toUpperCase() || '👤'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user.role === 'patient' ? '🧠 Patient'
                    : user.role === 'psychiatrist' ? '👨‍⚕️ Psychiatrist'
                    : '🛡️ Admin'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ✅ Privacy & Data Sharing — patients only */}
        {isPatient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Privacy & Data Sharing</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>
                  Share Data with Psychiatrist
                </Text>
                <Text style={styles.settingSubtitle}>
                  Allow your psychiatrist to view your mood logs,
                  AI insights and risk assessment
                </Text>
                {consent ? (
                  <Text style={styles.consentOn}>● Currently sharing</Text>
                ) : (
                  <Text style={styles.consentOff}>● Data is private</Text>
                )}
              </View>
              {consentLoading ? (
                <ActivityIndicator color="#6C63FF" size="small" />
              ) : (
                <Switch
                  value={consent}
                  onValueChange={handleConsentToggle}
                  trackColor={{ false: '#ddd', true: '#6C63FF' }}
                  thumbColor={consent ? '#fff' : '#f4f3f4'}
                />
              )}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                {consent
                  ? 'Your psychiatrist can see your mood history, AI chat risk level and diagnosis insights. You can turn this off anytime.'
                  : 'Turn on sharing so your psychiatrist can provide better personalized care based on your mental health data.'}
              </Text>
            </View>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notifications</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>
                Session reminders and wellness tips
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ddd', true: '#6C63FF' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 Language</Text>
          <View style={styles.languageRow}>
            {[
              { code: 'en', label: '🇬🇧 English' },
              { code: 'ur', label: '🇵🇰 اردو' },
              { code: 'ar', label: '🇸🇦 العربية' }
            ].map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  language === lang.code && styles.langBtnActive
                ]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={[
                  styles.langBtnText,
                  language === lang.code && styles.langBtnTextActive
                ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.menuItemIcon}>✏️</Text>
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacySecurity')}
          >
            <Text style={styles.menuItemIcon}>🔐</Text>
            <Text style={styles.menuItemText}>Privacy & Security</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemText}>Notification Settings</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ForgotPassword', {
              role: user?.role || 'patient'
            })}
          >
            <Text style={styles.menuItemIcon}>🔑</Text>
            <Text style={styles.menuItemText}>Change Password</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutAppName}>🧠 MindWell</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              AI-powered mental health platform connecting
              patients with psychiatrists
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    gap: 14,
  },
  profileAvatar: {
    width: 60, height: 60,
    borderRadius: 30,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 26, color: '#fff', fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  profileEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  roleText: { fontSize: 11, color: '#6C63FF', fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700',
    color: '#888', marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    gap: 12,
  },
  settingLeft: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  settingSubtitle: {
    fontSize: 12, color: '#888',
    marginTop: 3, lineHeight: 17
  },
  consentOn: {
    fontSize: 11, color: '#1D9E75',
    fontWeight: '600', marginTop: 4
  },
  consentOff: { fontSize: 11, color: '#888', marginTop: 4 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0EFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 14 },
  infoText: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  languageRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    elevation: 1,
  },
  langBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  langBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },
  langBtnTextActive: { color: '#fff' },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    gap: 12,
  },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  menuItemArrow: { fontSize: 16, color: '#aaa' },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  aboutAppName: { fontSize: 20, fontWeight: '800', color: '#6C63FF', marginBottom: 4 },
  aboutVersion: { fontSize: 12, color: '#888', marginBottom: 8 },
  aboutDesc: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 18 },
  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    marginBottom: 8,
  },
  logoutBtnText: { color: '#FF6B6B', fontSize: 16, fontWeight: '700' },
});