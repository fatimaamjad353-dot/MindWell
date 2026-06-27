// app/screens/AdminScreen.js
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { getStoredToken, request } from '../utils/apiService';

const ADMIN_EMAIL = 'admin@mindwell.test';
const ADMIN_PASSWORD = 'admin123';

export default function AdminScreen({ navigation }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState('verification');
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPsychiatrists: 0,
    pendingPsychiatrists: 0,
    totalSessions: 0,
    totalRevenue: 0
  });

  // ─── Load pending psychiatrists from backend ──────────────
  const loadPendingPsychiatrists = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching pending psychiatrists from backend...');
      
      const response = await request({
        path: '/admin/psychiatrists/pending',
        method: 'GET',
        auth: true
      });

      console.log('📥 Response:', response);

      if (response && response.success) {
        setApplications(response.data || []);
        console.log(`✅ Loaded ${response.data?.length || 0} pending applications`);
      } else {
        console.log('⚠️ No pending applications found');
        setApplications([]);
      }
    } catch (error) {
      console.error('❌ Error loading pending psychiatrists:', error.message);
      // If API fails, try the hardcoded data as fallback
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load dashboard stats ────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const response = await request({
        path: '/admin/dashboard',
        method: 'GET',
        auth: true
      });

      if (response && response.success) {
        setStats(response.data || {});
      }
    } catch (error) {
      console.error('❌ Error loading stats:', error.message);
    }
  }, []);

  // ─── Load data when screen is focused ────────────────────
  useFocusEffect(
    useCallback(() => {
      if (authorized) {
        loadPendingPsychiatrists();
        loadStats();
      }
    }, [authorized, loadPendingPsychiatrists, loadStats])
  );

  // ─── Approve psychiatrist ──────────────────────────────────
  const handleApprove = async (psych) => {
    Alert.alert('Approve Psychiatrist', `Approve ${psych.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            const response = await request({
              path: `/admin/psychiatrists/verify/${psych._id}`,
              method: 'PUT',
              body: { status: 'active' },
              auth: true
            });

            if (response && response.success) {
              Alert.alert('✅ Approved', `${psych.name} can now login as a psychiatrist.`);
              loadPendingPsychiatrists();
              loadStats();
            } else {
              Alert.alert('❌ Error', response?.message || 'Could not approve');
            }
          } catch (error) {
            console.error('Approve error:', error);
            Alert.alert('❌ Error', error.message || 'Could not approve');
          }
        }
      }
    ]);
  };

  // ─── Reject psychiatrist ──────────────────────────────────
  const handleReject = async (psych) => {
    Alert.alert('Reject Application', `Reject ${psych.name}'s verification?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await request({
              path: `/admin/psychiatrists/verify/${psych._id}`,
              method: 'PUT',
              body: { status: 'rejected' },
              auth: true
            });

            if (response && response.success) {
              Alert.alert('✅ Rejected', 'Application has been rejected.');
              loadPendingPsychiatrists();
              loadStats();
            } else {
              Alert.alert('❌ Error', response?.message || 'Could not reject');
            }
          } catch (error) {
            console.error('Reject error:', error);
            Alert.alert('❌ Error', error.message || 'Could not reject');
          }
        }
      }
    ]);
  };

  const handleAdminLogin = async () => {
    const email = adminEmail.trim().toLowerCase();
    
    try {
      const response = await request({
        path: '/admin/login',
        method: 'POST',
        body: { email, password: adminPassword },
        auth: false
      });

      if (response && response.success) {
        setAuthorized(true);
        setAdminPassword('');
        // Store token
        const token = response.token;
        if (token) {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('mindwell_auth_token', token);
        }
        loadPendingPsychiatrists();
        loadStats();
        Alert.alert('✅ Login successful', 'Welcome to Admin Panel');
      } else {
        Alert.alert('❌ Login failed', response?.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      Alert.alert('❌ Login failed', error.message || 'Could not login');
    }
  };

  // ─── If not authorized, show login ────────────────────────
  if (!authorized) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Login</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loginWrap}>
          <View style={styles.loginCard}>
            <View style={styles.lockCircle}>
              <Text style={styles.lockText}>A</Text>
            </View>
            <Text style={styles.loginTitle}>Authorized access only</Text>
            <Text style={styles.loginSub}>
              Enter admin credentials to review psychiatrist verification requests.
            </Text>

            <Text style={styles.loginLabel}>Admin email</Text>
            <TextInput
              style={styles.loginInput}
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="admin@mindwell.test"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.loginLabel}>Password</Text>
            <View style={styles.passwordBox}>
              <TextInput
                style={styles.passwordInput}
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Enter password"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                onSubmitEditing={handleAdminLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(current => !current)}>
                <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleAdminLogin}>
              <Text style={styles.loginButtonText}>Unlock Admin Portal</Text>
            </TouchableOpacity>

            <View style={styles.demoCredentials}>
              <Text style={styles.demoTitle}>Demo credentials</Text>
              <Text style={styles.demoText}>Email: {ADMIN_EMAIL}</Text>
              <Text style={styles.demoText}>Password: {ADMIN_PASSWORD}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─── Stats cards ──────────────────────────────────────────
  const statsData = [
    { label: 'Total Users', value: String(stats.totalPatients || 0), marker: 'U', color: '#6C63FF' },
    { label: 'Total Psychiatrists', value: String(stats.totalPsychiatrists || 0), marker: 'DR', color: '#1D9E75' },
    { label: 'Pending Verification', value: String(stats.pendingPsychiatrists || 0), marker: 'P', color: '#FFC107' },
    { label: 'Total Sessions', value: String(stats.totalSessions || 0), marker: 'S', color: '#FF6B6B' },
  ];

  const pendingCount = applications.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setAuthorized(false)}>
          <Text style={styles.logoutText}>Lock</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {statsData.map(item => (
            <View key={item.label} style={[styles.statCard, { borderLeftColor: item.color }]}>
              <Text style={[styles.statMarker, { color: item.color }]}>{item.marker}</Text>
              <Text style={[styles.statVal, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabs}>
          {['verification', 'users', 'security'].map(item => (
            <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {item === 'verification' ? `Verify (${pendingCount})` : item === 'users' ? 'Users' : 'Security'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'verification' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Psychiatrist Verification ({pendingCount})</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={styles.loadingText}>Loading pending applications...</Text>
              </View>
            ) : pendingCount === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending applications</Text>
                <Text style={styles.emptyText}>
                  New psychiatrist registrations will appear here with verification ID and certifications.
                </Text>
              </View>
            ) : (
              applications.map(psych => (
                <View key={psych._id} style={styles.verifyCard}>
                  <View style={styles.verifyTop}>
                    <View>
                      <Text style={styles.verifyName}>{psych.name}</Text>
                      <Text style={styles.verifyMeta}>{psych.specialization || 'No specialization'}</Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>PENDING</Text>
                    </View>
                  </View>

                  <Text style={styles.verifyLine}>Email: {psych.email}</Text>
                  <Text style={styles.verifyLine}>Phone: {psych.phone_no || 'Not provided'}</Text>
                  <Text style={styles.verifyLine}>License: {psych.license_number || 'Not provided'}</Text>
                  <Text style={styles.verifyLine}>Certifications: {psych.certifications || 'Not provided'}</Text>

                  <Text style={styles.submittedText}>
                    Submitted: {psych.createdAt ? new Date(psych.createdAt).toLocaleDateString() : 'Recently'}
                  </Text>

                  <View style={styles.verifyActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(psych)}>
                      <Text style={styles.approveBtnText}>{t.approve}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(psych)}>
                      <Text style={styles.rejectBtnText}>{t.reject}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'users' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>User management coming soon</Text>
              <Text style={styles.emptyText}>View and manage all users from the database.</Text>
            </View>
          </View>
        )}

        {tab === 'security' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Security</Text>
            <View style={styles.securityRow}>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Verification Gate</Text>
                <Text style={[styles.securityValue, { color: '#1D9E75' }]}>
                  Psychiatrist login locked until admin approval
                </Text>
              </View>
              <View style={[styles.securityDot, { backgroundColor: '#1D9E75' }]} />
            </View>
            <View style={styles.securityRow}>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Pending Reviews</Text>
                <Text style={[styles.securityValue, { color: '#FFC107' }]}>
                  {pendingCount} applications pending
                </Text>
              </View>
              <View style={[styles.securityDot, { backgroundColor: '#FFC107' }]} />
            </View>
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1a1a2e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 28, color: '#fff', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSpacer: { width: 30 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  loginWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, elevation: 4 },
  lockCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1a1a2e', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  lockText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  loginTitle: { color: '#1a1a2e', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  loginSub: { color: '#777', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  loginLabel: { color: '#333', fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  loginInput: { borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#222', backgroundColor: '#F8F8FC' },
  passwordBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#F8F8FC' },
  passwordInput: { flex: 1, paddingVertical: 13, color: '#222' },
  showText: { color: '#6C63FF', fontSize: 12, fontWeight: '900', paddingLeft: 8 },
  loginButton: { backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  demoCredentials: { backgroundColor: '#F0EFFF', borderRadius: 12, padding: 12, marginTop: 14 },
  demoTitle: { color: '#44327A', fontSize: 12, fontWeight: '900' },
  demoText: { color: '#6C6092', fontSize: 11, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, borderLeftWidth: 4 },
  statMarker: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#1a1a2e' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 12, marginTop: 4 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#777', fontSize: 13, marginTop: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, elevation: 2, alignItems: 'center' },
  emptyTitle: { color: '#1a1a2e', fontSize: 15, fontWeight: '800' },
  emptyText: { color: '#777', fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  verifyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  verifyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  verifyName: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  verifyMeta: { fontSize: 13, color: '#6C63FF', marginTop: 2, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FFF9C4', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  pendingText: { color: '#F57F17', fontSize: 10, fontWeight: '900' },
  verifyLine: { fontSize: 12, color: '#777', marginTop: 5 },
  submittedText: { color: '#999', fontSize: 11, marginTop: 9 },
  verifyActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#E8F5E9', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#1D9E75' },
  approveBtnText: { color: '#1D9E75', fontWeight: '800' },
  rejectBtn: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#FF6B6B' },
  rejectBtnText: { color: '#FF6B6B', fontWeight: '800' },
  securityRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, elevation: 2 },
  securityInfo: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  securityValue: { fontSize: 13, marginTop: 2 },
  securityDot: { width: 10, height: 10, borderRadius: 5 },
  bottomSpace: { height: 30 },
});