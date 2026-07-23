// app/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.5);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      checkAppState();
    }, 2500);
  }, []);

  const checkAppState = async () => {
    try {
      // Check if language was selected before
      const savedLanguage = await AsyncStorage.getItem('mindwell_language');
      // Check if user is already logged in
      const token = await AsyncStorage.getItem('mindwell_auth_token');
      // Check user role
      const userRole = await AsyncStorage.getItem('mindwell_user_role');

      if (token && userRole) {
        // Already logged in — go straight to dashboard
        if (userRole === 'psychiatrist') {
          navigation.replace('PsychologistDashboard');
        } else if (userRole === 'admin') {
          navigation.replace('Admin');
        } else {
          navigation.replace('PatientDashboard');
        }
      } else if (savedLanguage) {
        // Language selected before but not logged in
        navigation.replace('Role');
      } else {
        // First time — show language screen
        navigation.replace('Language', { onboarding: true });
      }

    } catch (error) {
      console.error('Splash error:', error);
      navigation.replace('Language', { onboarding: true });
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.title}>MindWell</Text>
        <Text style={styles.subtitle}>Mental Wellness Platform</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 16 },
  title: { fontSize: 42, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, color: '#E0DEFF', marginTop: 8 },
});