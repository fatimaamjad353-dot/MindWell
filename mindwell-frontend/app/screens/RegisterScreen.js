// app/screens/RegisterScreen.js
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { registerPatient, registerPsychiatrist, sendOTP } from '../utils/apiService';

const getPasswordStrength = password => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
};

export default function RegisterScreen({ navigation, route }) {
    const { t } = useLanguage();
    const role = route.params?.role || 'patient';
    const isDoctor = role === 'psychologist';
    const accent = isDoctor ? '#1D9E75' : '#6C63FF';
    const soft = isDoctor ? '#E8F5E9' : '#E8E6FF';

    // ─── Check if OTP was verified ──────────────────────────────
    const emailVerified = route.params?.emailVerified === true;
    const otpVerified = route.params?.otpVerified === true;
    const userDataFromOTP = route.params || {};

    // ─── State Variables ──────────────────────────────────────────
    const [name, setName] = useState(userDataFromOTP.name || '');
    const [email, setEmail] = useState(userDataFromOTP.email || '');
    const [password, setPassword] = useState(userDataFromOTP.password || '');
    const [phone, setPhone] = useState(userDataFromOTP.phone || '');
    const [specialty, setSpecialty] = useState(userDataFromOTP.specialty || '');
    const [verificationId, setVerificationId] = useState(userDataFromOTP.verificationId || '');
    const [certifications, setCertifications] = useState(userDataFromOTP.certifications || '');
    const [experienceYears, setExperienceYears] = useState(userDataFromOTP.experienceYears || '');
    const [hospital, setHospital] = useState(userDataFromOTP.hospital || '');
    const [sessionRate, setSessionRate] = useState(userDataFromOTP.sessionRate || '');
    const [languages, setLanguages] = useState(userDataFromOTP.languages || ['English']);
    const [sessionTypes, setSessionTypes] = useState(userDataFromOTP.sessionTypes || ['video']);
    const [showPwd, setShowPwd] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const strength = useMemo(() => getPasswordStrength(password), [password]);
    const strengthLabel = strength >= 4 ? 'Strong' : strength >= 2 ? 'Good' : 'Weak';
    const strengthColor = strength >= 4 ? '#1D9E75' : strength >= 2 ? '#F4A261' : '#FF6B6B';

    // ─── Toggle Functions ──────────────────────────────────────
    const toggleLanguage = (lang) => {
        if (languages.includes(lang)) {
            setLanguages(languages.filter(l => l !== lang));
        } else {
            setLanguages([...languages, lang]);
        }
    };

    const toggleSessionType = (type) => {
        if (sessionTypes.includes(type)) {
            setSessionTypes(sessionTypes.filter(t => t !== type));
        } else {
            setSessionTypes([...sessionTypes, type]);
        }
    };
// ─── PROCEED WITH OTP ──────────────────────────────────────────
const proceedWithOTP = async (emailToSend) => {
    setLoading(true);
    console.log('📧 Sending OTP to:', emailToSend);

    try {
        const otpResponse = await sendOTP({ email: emailToSend });

        console.log('📧 Full OTP Response:', JSON.stringify(otpResponse, null, 2));

        if (!otpResponse || !otpResponse.success) {
            const errorMessage = otpResponse?.message || 'Could not send verification code';
            Alert.alert('Error', errorMessage);
            setLoading(false);
            return;
        }

        console.log('✅ OTP sent successfully');

        // ─── ✅ Prepare user data with email ──────────────────────
        const userData = {
            name: name.trim(),
            email: emailToSend,  // ← EMAIL IS HERE
            password: password,
            phone: phone || '',
        };

        if (isDoctor) {
            userData.specialty = specialty;
            userData.verificationId = verificationId;
            userData.certifications = certifications;
            userData.experienceYears = experienceYears;
            userData.hospital = hospital;
            userData.sessionRate = sessionRate;
            userData.languages = languages;
            userData.sessionTypes = sessionTypes;
        }

        // ─── ✅ DEBUG LOGS ──────────────────────────────────────────
        console.log('📧 ========================================');
        console.log('📧 RegisterScreen - emailToSend:', emailToSend);
        console.log('📧 RegisterScreen - userData:', userData);
        console.log('📧 RegisterScreen - Navigating to OTP with:', {
            userData: userData,
            role: role,
            isDoctor: isDoctor
        });
        console.log('📧 ========================================');

        // ─── ✅ Navigate with userData ────────────────────────────
        navigation.navigate('OTP', {
            userData: userData,
            role: role,
            isDoctor: isDoctor
        });

        setLoading(false);

    } catch (error) {
        console.log('❌ OTP send failed:', error);
        Alert.alert('Error', error.message || 'Could not send verification code');
        setLoading(false);
    }
};    // ─── SEND OTP ──────────────────────────────────────────────────
const sendOTPCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    // ─── Basic Validation ──────────────────────────────────
    if (!name.trim() || !normalizedEmail || !password) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
    }

    // ─── ✅ FRONTEND EMAIL VALIDATION ──────────────────────
    // Check 1: Must contain @
    if (!normalizedEmail.includes('@')) {
        Alert.alert('Invalid Email', 'Email must contain "@" symbol.');
        return;
    }

    const parts = normalizedEmail.split('@');
    if (parts.length !== 2) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    const localPart = parts[0];
    const domain = parts[1];

    // Check 2: Local part not empty
    if (!localPart || localPart.length < 1) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    // Check 3: Domain must have a dot
    if (!domain || !domain.includes('.')) {
        Alert.alert('Invalid Email', 'Please enter a valid email domain (e.g., .com)');
        return;
    }

    // Check 4: Domain must have at least 2 chars after dot
    const domainParts = domain.split('.');
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
        Alert.alert('Invalid Email', 'Please enter a valid email domain (e.g., .com, .org)');
        return;
    }

    // Check 5: Common typos
    const typos = {
        'gmail.con': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gmil.com': 'gmail.com',
        'gmal.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmail.cm': 'gmail.com',
        'yahoo.con': 'yahoo.com',
        'yaho.com': 'yahoo.com',
        'yhoo.com': 'yahoo.com',
        'hotmail.con': 'hotmail.com',
        'hotmil.com': 'hotmail.com',
        'hotmail.co': 'hotmail.com',
        'outlook.con': 'outlook.com',
        'outlok.com': 'outlook.com',
        'outlook.co': 'outlook.com',
    };

    if (typos[domain]) {
        const suggested = `${localPart}@${typos[domain]}`;
        Alert.alert(
            'Did you mean?',
            `Did you mean "${suggested}"?`,
            [
                { text: 'Use this', onPress: () => { setEmail(suggested); proceedWithOTP(suggested); } },
                { text: 'Edit', style: 'cancel' }
            ]
        );
        return;
    }

    // ─── Password Validation ──────────────────────────────────
    if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
    }

    if (!accepted) {
        Alert.alert('Consent required', 'Please accept the privacy and consent notice.');
        return;
    }

    if (isDoctor && (!specialty.trim() || !verificationId.trim() || !certifications.trim())) {
        Alert.alert('Verification required', 'Please add your specialty, verification ID, and official certifications.');
        return;
    }

    // ─── Proceed with OTP ──────────────────────────────────
    proceedWithOTP(normalizedEmail);
};
    // ─── COMPLETE REGISTRATION ────────────────────────────────────
    const completeRegistration = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!otpVerified && !emailVerified) {
            Alert.alert('Error', 'Please verify your email first.');
            return;
        }

        setLoading(true);
        console.log('📧 Completing registration for:', normalizedEmail);

        try {
            if (isDoctor) {
                const specialtyArray = specialty.split(',').map(s => s.trim()).filter(s => s.length > 0);

                await registerPsychiatrist({
                    name: name.trim(),
                    email: normalizedEmail,
                    password: password,
                    phone_no: phone || undefined,
                    specializations: specialtyArray.length > 0 ? specialtyArray : [],
                    license_number: verificationId,
                    certifications: certifications || '',
                    experience_years: experienceYears ? parseInt(experienceYears) : 0,
                    hospital: hospital || '',
                    session_rate: sessionRate ? parseInt(sessionRate) : 0,
                    languages: languages.length > 0 ? languages : ['English'],
                    session_types: sessionTypes.length > 0 ? sessionTypes : ['video'],
                });

                Alert.alert(
                    'Verification submitted',
                    'Your psychiatrist account has been sent to admin for approval.',
                    [{ text: 'OK', onPress: () => navigation.replace('Login', { role }) }]
                );
            } else {
                await registerPatient({
                    name: name.trim(),
                    email: normalizedEmail,
                    password: password,
                    phone_no: phone || undefined
                });

                Alert.alert(
                    'Account created',
                    'Account created successfully. Please login.',
                    [{ text: 'OK', onPress: () => navigation.replace('Login', { role }) }]
                );
            }
        } catch (error) {
            console.log('❌ Registration failed', error.message || error);
            Alert.alert('Registration failed', error.message || 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Handle Register Button ──────────────────────────────
    const handleRegisterPress = () => {
        if (otpVerified || emailVerified) {
            completeRegistration();
        } else {
            sendOTPCode();
        }
    };

    const getButtonText = () => {
        if (loading) return 'Please wait...';
        if (otpVerified || emailVerified) return 'Register';
        return 'Send Verification';
    };

    // ─── RENDER ──────────────────────────────────────────────────
    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.hero, { backgroundColor: accent }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.kicker}>{isDoctor ? 'Provider onboarding' : 'Patient onboarding'}</Text>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                    {isDoctor
                        ? 'Set up your secure clinical account for sessions and patient summaries.'
                        : 'Start your private wellness space for mood tracking and care recommendations.'}
                </Text>
                {(otpVerified || emailVerified) && (
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✅ Email Verified</Text>
                    </View>
                )}
            </View>

            <View style={styles.card}>
                <View style={[styles.rolePill, { backgroundColor: soft }]}>
                    <Text style={[styles.rolePillText, { color: accent }]}>
                        Registering as {isDoctor ? 'Psychiatrist' : 'Patient'}
                    </Text>
                </View>

                <Text style={styles.label}>Full Name *</Text>
                <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor="#A4A4B5" value={name} onChangeText={setName} editable={!loading} />

                <Text style={styles.label}>Email *</Text>
                <TextInput style={[styles.input, (otpVerified || emailVerified) && styles.emailVerified]} placeholder="name@example.com" placeholderTextColor="#A4A4B5" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!(otpVerified || emailVerified) && !loading} />
                {(otpVerified || emailVerified) && <Text style={styles.verifiedHint}>✓ Email verified</Text>}

                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordWrap}>
                    <TextInput style={styles.passwordInput} placeholder="Create a secure password" placeholderTextColor="#A4A4B5" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} editable={!loading} />
                    <TouchableOpacity onPress={() => setShowPwd(current => !current)}>
                        <Text style={[styles.toggle, { color: accent }]}>{showPwd ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.strengthRow}>
                    {[1, 2, 3, 4, 5].map(item => (
                        <View key={item} style={[styles.strengthBar, item <= strength && { backgroundColor: strengthColor }]} />
                    ))}
                    <Text style={[styles.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>

                <Text style={styles.label}>Phone</Text>
                <TextInput style={styles.input} placeholder="Optional phone number" placeholderTextColor="#A4A4B5" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />

                {isDoctor && (
                    <>
                        <Text style={styles.label}>Specialty *</Text>
                        <Text style={styles.specialtyHelper}>Separate multiple specialties with commas</Text>
                        <TextInput style={styles.input} placeholder="e.g. Anxiety, Depression" placeholderTextColor="#A4A4B5" value={specialty} onChangeText={setSpecialty} editable={!loading} />

                        <Text style={styles.label}>Verification ID *</Text>
                        <TextInput style={styles.input} placeholder="e.g. PMC-2026-12345" placeholderTextColor="#A4A4B5" value={verificationId} onChangeText={setVerificationId} autoCapitalize="characters" editable={!loading} />

                        <Text style={styles.label}>Official certifications *</Text>
                        <TextInput style={[styles.input, styles.certInput]} placeholder="List degrees, licenses, certificates" placeholderTextColor="#A4A4B5" value={certifications} onChangeText={setCertifications} multiline editable={!loading} />

                        <Text style={styles.label}>Years of Experience</Text>
                        <TextInput style={styles.input} placeholder="e.g. 5" placeholderTextColor="#A4A4B5" value={experienceYears} onChangeText={setExperienceYears} keyboardType="number-pad" editable={!loading} />

                        <Text style={styles.label}>Hospital / Clinic</Text>
                        <TextInput style={styles.input} placeholder="e.g. Islamabad Mental Health Clinic" placeholderTextColor="#A4A4B5" value={hospital} onChangeText={setHospital} editable={!loading} />

                        <Text style={styles.label}>Session Fee (PKR)</Text>
                        <TextInput style={styles.input} placeholder="e.g. 2500" placeholderTextColor="#A4A4B5" value={sessionRate} onChangeText={setSessionRate} keyboardType="number-pad" editable={!loading} />

                        <Text style={styles.label}>Languages</Text>
                        <Text style={styles.helperText}>Select all that apply</Text>
                        <View style={styles.languageRow}>
                            {['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Arabic'].map(lang => (
                                <TouchableOpacity key={lang} style={[styles.langBtn, languages.includes(lang) && styles.langBtnActive]} onPress={() => toggleLanguage(lang)} disabled={loading}>
                                    <Text style={[styles.langText, languages.includes(lang) && styles.langTextActive]}>{lang}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Session Types</Text>
                        <Text style={styles.helperText}>Select all that apply</Text>
                        <View style={styles.sessionTypeRow}>
                            {['video', 'audio', 'text'].map(type => (
                                <TouchableOpacity key={type} style={[styles.sessionTypeBtn, sessionTypes.includes(type) && styles.sessionTypeBtnActive]} onPress={() => toggleSessionType(type)} disabled={loading}>
                                    <Text style={[styles.sessionTypeText, sessionTypes.includes(type) && styles.sessionTypeTextActive]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.infoBox, { backgroundColor: soft }]}>
                            <Text style={[styles.infoTitle, { color: accent }]}>Admin approval required</Text>
                            <Text style={styles.infoText}>Your verification ID and certifications will be sent to admin for approval.</Text>
                        </View>
                    </>
                )}

                <TouchableOpacity style={styles.consentRow} onPress={() => setAccepted(current => !current)} disabled={loading}>
                    <View style={[styles.checkbox, accepted && { backgroundColor: accent, borderColor: accent }]}>
                        {accepted && <Text style={styles.checkText}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>I agree to MindWell privacy, consent, and secure health-data sharing controls.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, { backgroundColor: accent }, loading && styles.btnDisabled]} onPress={handleRegisterPress} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{getButtonText()}</Text>}
                </TouchableOpacity>

                {(otpVerified || emailVerified) && <Text style={styles.infoText}>✅ Email verified. Click Register to create your account.</Text>}

                <TouchableOpacity onPress={() => navigation.navigate('Login', { role })} disabled={loading}>
                    <Text style={styles.link}>Already have an account? <Text style={[styles.linkBold, { color: accent }]}>Login</Text></Text>
                </TouchableOpacity>
            </View>
            <View style={styles.bottomSpace} />
        </ScrollView>
    );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0EFFF' },
    content: { flexGrow: 1 },
    hero: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 58, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    backButtonText: { color: '#fff', fontSize: 25, lineHeight: 28 },
    kicker: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
    title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
    subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 330 },
    verifiedBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12, alignSelf: 'flex-start' },
    verifiedText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    card: { backgroundColor: '#fff', marginHorizontal: 18, marginTop: -34, borderRadius: 24, padding: 22, elevation: 4 },
    rolePill: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, marginBottom: 8 },
    rolePillText: { fontSize: 12, fontWeight: '900' },
    label: { fontSize: 13, fontWeight: '800', color: '#333', marginBottom: 7, marginTop: 14 },
    helperText: { fontSize: 11, color: '#888', marginBottom: 6, marginTop: 2 },
    specialtyHelper: { fontSize: 11, color: '#888', marginTop: 2, marginBottom: 4, fontStyle: 'italic' },
    input: { borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: '#222', backgroundColor: '#F8F8FC' },
    emailVerified: { borderColor: '#1D9E75', backgroundColor: '#E8F5E9' },
    verifiedHint: { color: '#1D9E75', fontSize: 12, marginTop: 4 },
    certInput: { minHeight: 90, textAlignVertical: 'top' },
    passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1E1EC', borderRadius: 15, paddingHorizontal: 15, backgroundColor: '#F8F8FC' },
    passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
    toggle: { fontSize: 12, fontWeight: '900', paddingLeft: 8 },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
    strengthBar: { flex: 1, height: 5, borderRadius: 5, backgroundColor: '#E5E5EF' },
    strengthText: { fontSize: 11, fontWeight: '900', marginLeft: 6 },
    languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    langBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
    langBtnActive: { backgroundColor: '#6C63FF15', borderColor: '#6C63FF' },
    langText: { color: '#555', fontSize: 13, fontWeight: '500' },
    langTextActive: { color: '#6C63FF' },
    sessionTypeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    sessionTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
    sessionTypeBtnActive: { backgroundColor: '#6C63FF15', borderColor: '#6C63FF' },
    sessionTypeText: { color: '#555', fontSize: 13, fontWeight: '600' },
    sessionTypeTextActive: { color: '#6C63FF' },
    infoBox: { borderRadius: 14, padding: 13, marginTop: 16 },
    infoTitle: { fontSize: 12, fontWeight: '900' },
    infoText: { color: '#555', fontSize: 12, lineHeight: 16, marginTop: 3 },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#CFCFE0', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
    checkText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    consentText: { flex: 1, color: '#666', fontSize: 12, lineHeight: 18 },
    btn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 22, marginBottom: 16 },
    btnDisabled: { opacity: 0.7 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    link: { textAlign: 'center', color: '#666', fontSize: 14 },
    linkBold: { fontWeight: '900' },
    bottomSpace: { height: 30 },
});