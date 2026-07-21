// app/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';  // ← Add React import
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      navigation.replace('Role');
    }, 2500);
  }, []);

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