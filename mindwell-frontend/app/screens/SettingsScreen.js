import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getProfile } from '../utils/profileStorage';

export default function SettingsScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const user = route.params?.user;
  const [profile, setProfile] = useState(user || {});

  useFocusEffect(
    useCallback(() => {
      getProfile(user || {}).then(setProfile);
    }, [user])
  );

  const langFlag = { en: '🇬🇧', ur: '🇵🇰', ar: '🇸🇦' };

  const settingsItems = [
    { emoji: '👤', title: t.profile, subtitle: profile?.email || 'Update your info', action: () => navigation.navigate('Profile', { user: profile }) },
    { emoji: '🌐', title: t.language, subtitle: `${langFlag[language] || '🌐'} ${language?.toUpperCase() || 'EN'}`, action: () => navigation.navigate('Language') },
    { emoji: '🔔', title: t.notifications, subtitle: 'Mood, streak, sound & vibration', action: () => navigation.navigate('NotificationSettings') },
    { emoji: '🔒', title: t.privacy, subtitle: 'Password, 2FA & data protection', action: () => navigation.navigate('PrivacySecurity', { role: user?.role || 'patient' }) },
    { emoji: '📞', title: t.support, subtitle: 'Get help', action: () => Alert.alert(t.support, 'Email: support@mindwell.com\nPhone: 0317-4288665\nAvailable 24/7') },
    { emoji: '⭐', title: t.rateApp, subtitle: 'Share feedback', action: () => Alert.alert(t.rateApp, 'Thank you for using MindWell! ❤️') },
    { emoji: '📄', title: t.terms, subtitle: 'Read our policies', action: () => Alert.alert(t.terms, 'MindWell complies with HIPAA standards.\nAll data is encrypted and secure.\nWe never share your data without consent.') },
    { emoji: '🚨', title: 'Crisis Support', subtitle: 'Emergency resources', action: () => Alert.alert('Crisis Helplines 🆘', 'Pakistan:\n• Umang: 0317-4288665\n• Rozan: 051-2890505\n\nAvailable 24/7') },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView>
        <View style={styles.profileBanner}>
          <TouchableOpacity style={styles.avatarLarge} onPress={() => navigation.navigate('Profile', { user: profile })}>
            {profile?.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profile?.name ? profile.name[0].toUpperCase() : 'U'}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name || 'User Name'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || 'user@mindwell.com'}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Profile', { user: profile })}>
            <Text style={styles.editBtnText}>{t.editProfile}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {settingsItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.settingRow, i === settingsItems.length - 1 && { borderBottomWidth: 0 }]} onPress={item.action}>
              <Text style={styles.settingEmoji}>{item.emoji}</Text>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.subtitle}</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert(t.logout, 'Are you sure?', [
            { text: t.cancel, style: 'cancel' },
            { text: t.logout, style: 'destructive', onPress: () => navigation.replace('Role') }
          ])}
        >
          <Text style={styles.logoutText}>🚪 {t.logout}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MindWell v1.0.0 • Made with 💙 for mental wellness</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileBanner: { backgroundColor: '#6C63FF', alignItems: 'center', paddingBottom: 30, paddingTop: 10 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 14, color: '#E0DEFF', marginTop: 4 },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 16, elevation: 2, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  settingEmoji: { fontSize: 24, marginRight: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  settingSub: { fontSize: 12, color: '#888', marginTop: 2 },
  settingArrow: { fontSize: 22, color: '#ccc' },
  logoutBtn: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16, alignItems: 'center', elevation: 2, borderWidth: 1.5, borderColor: '#FF6B6B' },
  logoutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: '#aaa', fontSize: 12, marginBottom: 8 },
});
