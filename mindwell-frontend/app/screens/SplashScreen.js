import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function SplashScreen({ navigation }) {
  const { languageSelected } = useLanguage();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.5);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      if (languageSelected) {
        navigation.replace('Role');
      } else {
        navigation.replace('Language', { onboarding: true });
      }
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.title}>MindWell</Text>
        <Text style={styles.subtitle}>Mental Wellness Platform</Text>
      </Animated.View>
      <Text style={styles.tagline}>مائنڈ ویل • MindWell • Geist Wohl • مايند ويل</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 16 },
  title: { fontSize: 42, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, color: '#E0DEFF', marginTop: 8 },
  tagline: { position: 'absolute', bottom: 40, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 20 },
});