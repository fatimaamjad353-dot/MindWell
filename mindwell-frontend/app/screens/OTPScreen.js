// app/screens/OTPScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { verifyOTP, resendOTP } from '../utils/apiService';

export default function OTPScreen({ navigation, route }) {
    const params = route.params || {};
    const userData = params.userData || {};
    const role = params.role || 'patient';
    const isDoctor = params.isDoctor || false;

    // ✅ Get email from userData
    const email = userData?.email || '';

    console.log('📧 OTPScreen - email:', email);
    console.log('📧 OTPScreen - userData:', JSON.stringify(userData));

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef([]);

    // ─── Timer countdown ───────────────────────────────────────
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCanResend(true);
        }
    }, [timer]);

    // ─── Auto-focus first input ────────────────────────────────
    useEffect(() => {
        setTimeout(() => {
            inputs.current[0]?.focus();
        }, 500);
    }, []);

    // ─── Handle OTP digit input ────────────────────────────────
    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    // ─── Handle backspace ──────────────────────────────────────
    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    // ─── Verify OTP ────────────────────────────────────────────
    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            Alert.alert('Incomplete', 'Please enter the complete 6-digit code');
            return;
        }

        if (!email) {
            Alert.alert('Error', 'Email not found. Please go back and try again.');
            return;
        }

        setLoading(true);
        try {
            const response = await verifyOTP({
                email: email,
                otp: code
            });

            if (response.success) {
                Alert.alert('✅ Verified!', 'Email verified successfully!', [
                    {
                        text: 'Continue',
                        onPress: () => {
                            // ✅ Navigate back to Register with verified status
                            navigation.replace('Register', {
                                ...userData,
                                role,
                                isDoctor,
                                emailVerified: true,
                                otpVerified: true,
                            });
                        }
                    }
                ]);
            } else {
                Alert.alert('❌ Invalid Code', response.message || 'Invalid OTP. Please try again.');
                setOtp(['', '', '', '', '', '']);
                inputs.current[0]?.focus();
            }

        } catch (error) {
            Alert.alert('❌ Error', error.message || 'Could not verify OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            inputs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ─── Resend OTP ────────────────────────────────────────────
    const handleResend = async () => {
        if (!canResend || resendLoading) return;

        setResendLoading(true);
        try {
            const response = await resendOTP({ email });
            if (response.success) {
                Alert.alert('✅ Sent!', 'A new verification code has been sent to your email.');
                setOtp(['', '', '', '', '', '']);
                setTimer(60);
                setCanResend(false);
                inputs.current[0]?.focus();
            } else {
                Alert.alert('❌ Error', response.message || 'Could not resend OTP');
            }
        } catch (error) {
            Alert.alert('❌ Error', error.message || 'Could not resend OTP. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verify Email</Text>
                <View style={{ width: 30 }} />
            </View>

            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📧</Text>
                </View>

                <Text style={styles.heading}>Check your email</Text>
                <Text style={styles.sub}>
                    We've sent a 6-digit verification code to{'\n'}
                    <Text style={styles.emailText}>{email || 'your email'}</Text>
                </Text>

                {/* OTP Input */}
                <View style={styles.otpRow}>
                    {otp.map((digit, i) => (
                        <TextInput
                            key={i}
                            ref={ref => inputs.current[i] = ref}
                            style={[styles.otpInput, digit && styles.otpInputFilled]}
                            value={digit}
                            onChangeText={text => handleChange(text, i)}
                            onKeyPress={e => handleKeyPress(e, i)}
                            keyboardType="numeric"
                            maxLength={1}
                            textAlign="center"
                        />
                    ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.verifyBtn, loading && styles.disabled]}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.verifyBtnText}>Verify Code ✓</Text>
                    }
                </TouchableOpacity>

                {/* Resend */}
                <View style={styles.resendContainer}>
                    <TouchableOpacity
                        onPress={handleResend}
                        disabled={!canResend || resendLoading}
                    >
                        <Text style={styles.resend}>
                            Didn't receive it?{' '}
                            <Text style={[
                                styles.resendBold,
                                (!canResend || resendLoading) && styles.resendDisabled
                            ]}>
                                {resendLoading
                                    ? 'Sending...'
                                    : canResend
                                        ? 'Resend OTP'
                                        : `Resend in ${timer}s`
                                }
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Wrong email */}
                <TouchableOpacity
                    style={styles.editEmail}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.editEmailText}>✏️ Wrong email? Go back</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconContainer: {
        width: 80, height: 80,
        borderRadius: 40,
        backgroundColor: '#F0EFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#6C63FF',
    },
    icon: { fontSize: 40 },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8
    },
    sub: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    emailText: {
        color: '#6C63FF',
        fontWeight: '700',
        fontSize: 15,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 10,
    },
    otpInput: {
        width: 48, height: 56,
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        backgroundColor: '#fff',
    },
    otpInputFilled: {
        borderColor: '#6C63FF',
        backgroundColor: '#F0EFFF',
    },
    verifyBtn: {
        backgroundColor: '#6C63FF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        elevation: 3,
    },
    verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    resendContainer: { marginTop: 20, alignItems: 'center' },
    resend: { color: '#666', fontSize: 14 },
    resendBold: { color: '#6C63FF', fontWeight: '700' },
    resendDisabled: { color: '#aaa' },
    editEmail: { marginTop: 16, padding: 8 },
    editEmailText: { color: '#999', fontSize: 13 },
});