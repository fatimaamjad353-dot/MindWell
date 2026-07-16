// app/screens/RoleScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function RoleScreen({ navigation }) {
    const { t } = useLanguage();

    return (
        <View style={styles.container}>
            {/* ─── ✅ BACK BUTTON ────────────────────────────────── */}
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.navigate('Language')}  // ← FIXED
            >
                <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{t.iAmA}</Text>
            <Text style={styles.sub}>{t.chooseRole}</Text>

            <TouchableOpacity 
                style={styles.cardPurple} 
                onPress={() => navigation.navigate('Login', { role: 'patient' })}
            >
                <Text style={styles.cardEmoji}>🙋</Text>
                <Text style={styles.cardTitle}>{t.patient}</Text>
                <Text style={styles.cardSub}>{t.patientSub}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.cardGreen} 
                onPress={() => navigation.navigate('Login', { role: 'psychologist' })}
            >
                <Text style={styles.cardEmoji}>👨‍⚕️</Text>
                <Text style={styles.cardTitle}>{t.psychologist}</Text>
                <Text style={styles.cardSub}>{t.psychSub}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.adminBtn} 
                onPress={() => navigation.navigate('Admin')}
            >
                <Text style={styles.adminText}>🔐 Admin Portal</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F0EFFF', 
        padding: 24, 
        justifyContent: 'center' 
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    backButtonText: {
        fontSize: 24,
        color: '#6C63FF',
        fontWeight: '700',
    },
    title: { 
        fontSize: 32, 
        fontWeight: '700', 
        color: '#1a1a2e', 
        textAlign: 'center' 
    },
    sub: { 
        fontSize: 15, 
        color: '#666', 
        textAlign: 'center', 
        marginTop: 8, 
        marginBottom: 40 
    },
    cardPurple: { 
        backgroundColor: '#6C63FF', 
        borderRadius: 20, 
        padding: 28, 
        alignItems: 'center', 
        marginBottom: 16, 
        elevation: 4 
    },
    cardGreen: { 
        backgroundColor: '#1D9E75', 
        borderRadius: 20, 
        padding: 28, 
        alignItems: 'center', 
        elevation: 4 
    },
    cardEmoji: { fontSize: 44, marginBottom: 10 },
    cardTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
    cardSub: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.85)', 
        marginTop: 6 
    },
    adminBtn: { 
        marginTop: 20, 
        alignItems: 'center', 
        padding: 12 
    },
    adminText: { 
        color: '#6C63FF', 
        fontSize: 14, 
        fontWeight: '600' 
    },
});