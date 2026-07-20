// app/screens/TwilioCallScreen.js - Simplified version
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

export default function TwilioCallScreen({ navigation, route }) {
  const { role = 'patient', session = {} } = route.params || {};
  const sessionType = String(session.type || 'Video').toLowerCase();
  const isVideo = sessionType === 'video';
  const otherPerson = role === 'psychologist'
    ? session.patient || 'Patient'
    : session.therapist || 'Psychiatrist';

  const endCall = () => {
    Alert.alert('End session', 'Leave this call?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{isVideo ? 'Video Session' : 'Audio Session'}</Text>
          <Text style={styles.headerSub}>Call with {otherPerson}</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: '#1D9E75' }]}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.stage}>
        <Text style={styles.emoji}>{isVideo ? '📹' : '🎙️'}</Text>
        <Text style={styles.callText}>{isVideo ? 'Video Call' : 'Audio Call'}</Text>
        <Text style={styles.callSubtext}>Connected to {otherPerson}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlText}>Mute</Text>
        </TouchableOpacity>
        {isVideo && (
          <TouchableOpacity style={styles.controlButton}>
            <Text style={styles.controlText}>Camera</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.endButton} onPress={endCall}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101828' },
  header: {
    backgroundColor: '#1D9E75',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: { color: '#fff', fontSize: 28, fontWeight: '500', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#D8F5EB', fontSize: 11, marginTop: 2 },
  liveBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  stage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 72, marginBottom: 16 },
  callText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  callSubtext: { color: '#888', fontSize: 16, marginTop: 8 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#101828',
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#344054',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  controlText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  endButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  endButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});