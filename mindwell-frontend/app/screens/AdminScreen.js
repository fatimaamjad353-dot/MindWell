import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  getPsychiatristApplications,
  updatePsychiatristApplicationStatus
} from '../utils/psychiatristVerificationStorage';

const allUsers = [
  { id: 1, name: 'Sarah M.', role: 'patient', email: 'sarah@email.com', status: 'active' },
  { id: 2, name: 'Ahmed K.', role: 'patient', email: 'ahmed@email.com', status: 'active' },
  { id: 3, name: 'Dr. Ayesha Khan', role: 'psychologist', email: 'ayesha@email.com', status: 'active' },
  { id: 4, name: 'Dr. Omar Farooq', role: 'psychologist', email: 'omar@email.com', status: 'suspended' },
];

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

  const loadApplications = useCallback(async () => {
    setApplications(await getPsychiatristApplications());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const pendingPsychs = useMemo(
    () => applications.filter(item => item.status === 'pending'),
    [applications]
  );
  const approvedCount = applications.filter(item => item.status === 'approved').length;

  const stats = [
    { label: 'Total Users', value: String(247 + applications.length), marker: 'U', color: '#6C63FF' },
    { label: 'Approved Psychiatrists', value: String(approvedCount), marker: 'DR', color: '#1D9E75' },
    { label: 'Pending Verification', value: String(pendingPsychs.length), marker: 'P', color: '#FFC107' },
    { label: 'Active Sessions', value: '12', marker: 'S', color: '#FF6B6B' },
  ];

  const handleApprove = (psych) => {
    Alert.alert('Approve psychiatrist', `Approve ${psych.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          await updatePsychiatristApplicationStatus(psych.id, 'approved');
          await loadApplications();
          Alert.alert('Approved', `${psych.name} can now login as a psychiatrist.`);
        }
      }
    ]);
  };

  const handleReject = (psych) => {
    Alert.alert('Reject application', `Reject ${psych.name}'s verification?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          await updatePsychiatristApplicationStatus(psych.id, 'rejected');
          await loadApplications();
          Alert.alert('Rejected', 'Application has been rejected.');
        }
      }
    ]);
  };

  const handleSuspend = (user) => {
    Alert.alert('Suspend', `Suspend ${user.name}'s account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('Account Suspended') }
    ]);
  };

  const searchedUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
    || user.email.toLowerCase().includes(search.toLowerCase())
  );
  const searchedApplications = applications.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
    || user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdminLogin = () => {
    const email = adminEmail.trim().toLowerCase();
    if (email !== ADMIN_EMAIL || adminPassword !== ADMIN_PASSWORD) {
      Alert.alert('Access denied', 'Invalid admin email or password.');
      return;
    }
    setAuthorized(true);
    setAdminPassword('');
  };

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
          {stats.map(item => (
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
                {item === 'verification' ? 'Verify' : item === 'users' ? 'Users' : 'Security'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'verification' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Psychiatrist Verification ({pendingPsychs.length})</Text>
            {pendingPsychs.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending applications</Text>
                <Text style={styles.emptyText}>New psychiatrist registrations will appear here with verification ID and certifications.</Text>
              </View>
            )}

            {pendingPsychs.map(psych => (
              <View key={psych.id} style={styles.verifyCard}>
                <View style={styles.verifyTop}>
                  <View>
                    <Text style={styles.verifyName}>{psych.name}</Text>
                    <Text style={styles.verifyMeta}>{psych.specialty}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>PENDING</Text>
                  </View>
                </View>

                <Text style={styles.verifyLine}>Email: {psych.email}</Text>
                <Text style={styles.verifyLine}>Phone: {psych.phone || 'Not provided'}</Text>
                <Text style={styles.verifyLine}>Verification ID: {psych.verificationId}</Text>

                <View style={styles.certBox}>
                  <Text style={styles.certTitle}>Official certifications</Text>
                  <Text style={styles.certText}>{psych.certifications}</Text>
                </View>

                <Text style={styles.submittedText}>
                  Submitted: {psych.submittedAt ? new Date(psych.submittedAt).toLocaleDateString() : 'Today'}
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
            ))}
          </View>
        )}

        {tab === 'users' && (
          <View style={styles.section}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>Search</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <Text style={styles.sectionTitle}>Psychiatrist Applications</Text>
            {searchedApplications.map(user => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userLeft}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userMeta}>psychiatrist - {user.email}</Text>
                </View>
                <View style={[styles.userBadge, { backgroundColor: statusBg(user.status) }]}>
                  <Text style={[styles.userBadgeText, { color: statusColor(user.status) }]}>{user.status}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>All Users</Text>
            {searchedUsers.map(user => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userLeft}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userMeta}>{user.role} - {user.email}</Text>
                </View>
                <View style={styles.userRight}>
                  <View style={[styles.userBadge, { backgroundColor: user.status === 'active' ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.userBadgeText, { color: user.status === 'active' ? '#1D9E75' : '#FF6B6B' }]}>
                      {user.status}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleSuspend(user)}>
                    <Text style={styles.suspendText}>{t.suspend}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'security' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform Security</Text>
            {[
              { title: 'Verification Gate', value: 'Psychiatrist login locked until admin approval', color: '#1D9E75' },
              { title: 'Two-Factor Auth', value: 'Mandatory for psychiatrist accounts', color: '#1D9E75' },
              { title: 'Pending Reviews', value: `${pendingPsychs.length} applications`, color: '#FFC107' },
              { title: 'Rejected Applications', value: `${applications.filter(item => item.status === 'rejected').length} rejected`, color: '#FF6B6B' },
            ].map(item => (
              <View key={item.title} style={styles.securityRow}>
                <View style={styles.securityInfo}>
                  <Text style={styles.securityTitle}>{item.title}</Text>
                  <Text style={[styles.securityValue, { color: item.color }]}>{item.value}</Text>
                </View>
                <View style={[styles.securityDot, { backgroundColor: item.color }]} />
              </View>
            ))}
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const statusColor = status => status === 'approved' ? '#1D9E75' : status === 'pending' ? '#F57F17' : '#FF6B6B';
const statusBg = status => status === 'approved' ? '#E8F5E9' : status === 'pending' ? '#FFF9C4' : '#FFEBEE';

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
  certBox: { backgroundColor: '#F8F8FC', borderRadius: 10, padding: 12, marginTop: 10 },
  certTitle: { color: '#1a1a2e', fontSize: 12, fontWeight: '800' },
  certText: { color: '#555', fontSize: 12, lineHeight: 17, marginTop: 4 },
  submittedText: { color: '#999', fontSize: 11, marginTop: 9 },
  verifyActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#E8F5E9', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#1D9E75' },
  approveBtnText: { color: '#1D9E75', fontWeight: '800' },
  rejectBtn: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#FF6B6B' },
  rejectBtnText: { color: '#FF6B6B', fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, elevation: 2 },
  searchIcon: { color: '#6C63FF', fontSize: 12, fontWeight: '800', marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  userCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  userLeft: { flex: 1, paddingRight: 10 },
  userName: { fontSize: 15, fontWeight: '800', color: '#1a1a2e' },
  userMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  userRight: { alignItems: 'flex-end', gap: 4 },
  userBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  userBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  suspendText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },
  securityRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, elevation: 2 },
  securityInfo: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  securityValue: { fontSize: 13, marginTop: 2 },
  securityDot: { width: 10, height: 10, borderRadius: 5 },
  bottomSpace: { height: 30 },
});
