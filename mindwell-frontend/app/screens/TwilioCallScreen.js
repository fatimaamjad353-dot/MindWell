import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchTwilioVideoToken } from '../utils/twilioSessionApi';

export default function TwilioCallScreen({ navigation, route }) {
  const { role = 'patient', session = {} } = route.params || {};
  const sessionType = String(session.type || 'Video').toLowerCase();
  const isVideo = sessionType === 'video';
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(isVideo);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  const identity = useMemo(
    () => `${role}-${session.id || 'demo-session'}`,
    [role, session.id]
  );
  const roomName = useMemo(
    () => `mindwell-session-${session.id || 'demo-session'}`,
    [session.id]
  );
  const otherPerson = role === 'psychologist'
    ? session.patient || 'Patient'
    : session.therapist || 'Psychiatrist';

  const connectToTwilio = async () => {
    setConnecting(true);
    try {
      await fetchTwilioVideoToken({ identity, roomName, sessionType });
      setTokenReady(true);
      Alert.alert(
        'Token ready',
        'Frontend is ready to connect. Install and wire your Twilio Video SDK component here.'
      );
    } catch {
      Alert.alert(
        'Backend needed',
        'Create /api/twilio/video-token on your backend to return a Twilio access token for this room.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const endCall = () => {
    Alert.alert('End session', 'Leave this call?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => navigation.goBack() }
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
          <Text style={styles.headerSub}>{otherPerson} - Room: {roomName}</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>{tokenReady ? 'READY' : 'SETUP'}</Text>
        </View>
      </View>

      <View style={styles.stage}>
        {isVideo ? (
          <>
            <View style={styles.remoteVideo}>
              <Text style={styles.remoteInitial}>{otherPerson[0] || 'P'}</Text>
              <Text style={styles.remoteLabel}>Remote video renders here</Text>
            </View>
            <View style={styles.localVideo}>
              <Text style={styles.localText}>{cameraEnabled ? 'Your camera' : 'Camera off'}</Text>
            </View>
          </>
        ) : (
          <View style={styles.audioStage}>
            <View style={styles.audioAvatar}>
              <Text style={styles.audioInitial}>{otherPerson[0] || 'P'}</Text>
            </View>
            <Text style={styles.audioName}>{otherPerson}</Text>
            <Text style={styles.audioStatus}>{muted ? 'You are muted' : 'Audio ready'}</Text>
          </View>
        )}
      </View>

      <View style={styles.integrationCard}>
        <Text style={styles.integrationTitle}>Twilio integration point</Text>
        <Text style={styles.integrationText}>
          Fetch a backend-generated access token, then connect this screen to the Twilio room with the selected SDK.
        </Text>
        <TouchableOpacity style={styles.connectButton} onPress={connectToTwilio} disabled={connecting}>
          <Text style={styles.connectButtonText}>{connecting ? 'Checking token...' : 'Check Twilio token endpoint'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, muted && styles.controlButtonActive]} onPress={() => setMuted(current => !current)}>
          <Text style={styles.controlText}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        {isVideo && (
          <TouchableOpacity style={[styles.controlButton, !cameraEnabled && styles.controlButtonActive]} onPress={() => setCameraEnabled(current => !current)}>
            <Text style={styles.controlText}>{cameraEnabled ? 'Camera Off' : 'Camera On'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.controlButton, speakerEnabled && styles.controlButtonActiveGreen]} onPress={() => setSpeakerEnabled(current => !current)}>
          <Text style={styles.controlText}>{speakerEnabled ? 'Speaker' : 'Earpiece'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={endCall}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101828' },
  header: { backgroundColor: '#1D9E75', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  back: { color: '#fff', fontSize: 28, fontWeight: '500', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#D8F5EB', fontSize: 11, marginTop: 2 },
  liveBadge: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  liveText: { color: '#1D9E75', fontSize: 10, fontWeight: '900' },
  stage: { flex: 1, padding: 16 },
  remoteVideo: { flex: 1, backgroundColor: '#1D2939', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  remoteInitial: { color: '#fff', fontSize: 52, fontWeight: '900' },
  remoteLabel: { color: '#B8C4D8', fontSize: 13, marginTop: 10 },
  localVideo: { position: 'absolute', right: 28, bottom: 28, width: 120, height: 160, borderRadius: 18, backgroundColor: '#344054', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  localText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  audioAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1D9E75', alignItems: 'center', justifyContent: 'center' },
  audioInitial: { color: '#fff', fontSize: 52, fontWeight: '900' },
  audioName: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 18 },
  audioStatus: { color: '#B8C4D8', fontSize: 13, marginTop: 6 },
  integrationCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 14 },
  integrationTitle: { color: '#1a1a2e', fontSize: 14, fontWeight: '900' },
  integrationText: { color: '#666', fontSize: 12, lineHeight: 17, marginTop: 5 },
  connectButton: { backgroundColor: '#6C63FF', borderRadius: 11, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  connectButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 28 },
  controlButton: { flex: 1, backgroundColor: '#344054', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  controlButtonActive: { backgroundColor: '#6C63FF' },
  controlButtonActiveGreen: { backgroundColor: '#1D9E75' },
  controlText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  endButton: { backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center' },
  endButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
