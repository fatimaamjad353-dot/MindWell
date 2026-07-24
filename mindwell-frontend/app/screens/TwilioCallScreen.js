// app/screens/TwilioCallScreen.js
// ✅ Using Agora SDK for video/audio sessions
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTwilioToken } from '../utils/apiService';

// ✅ Safe import — won't crash if native module not built yet
let AgoraAvailable = false;
let RtcEngine, ChannelProfileType, ClientRoleType, RtcSurfaceView;
try {
  const Agora = require('react-native-agora');
  RtcEngine = Agora.createAgoraRtcEngine;
  ChannelProfileType = Agora.ChannelProfileType;
  ClientRoleType = Agora.ClientRoleType;
  RtcSurfaceView = Agora.RtcSurfaceView;
  AgoraAvailable = true;
  console.log('✅ Agora SDK loaded');
} catch (e) {
  console.log('⚠️ Agora SDK not available — needs dev build');
}

export default function TwilioCallScreen({ navigation, route }) {
  const { role = 'patient', session = {} } = route.params || {};
  const sessionId = session.id || session._id;
  const sessionType = String(session.type || 'Video').toLowerCase();
  const isVideo = sessionType === 'video';
  const otherPerson = role === 'psychologist'
    ? session.patient || 'Patient'
    : session.therapist || 'Psychiatrist';

  const [status, setStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteUids, setRemoteUids] = useState([]);
  const [localUid, setLocalUid] = useState(0);
  const engineRef = useRef(null);

  useEffect(() => {
    if (!AgoraAvailable) {
      setStatus('unavailable');
      return;
    }
    initAgora();
    return () => { cleanupAgora(); };
  }, []);

  const initAgora = async () => {
    try {
      setStatus('connecting');

      // ✅ Get Agora token from backend
      const tokenResult = await getTwilioToken({
        sessionId,
        identity: role,
        role
      });

      const { token, channelName, appId, uid } = tokenResult.data;
      setLocalUid(uid);

      // ✅ Create Agora engine
      const engine = RtcEngine();
      engineRef.current = engine;

      // ✅ Initialize
      await engine.initialize({
        appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // ✅ Enable video if video session
      if (isVideo) {
        await engine.enableVideo();
        await engine.startPreview();
      } else {
        await engine.enableAudio();
        await engine.disableVideo();
      }

      // ✅ Set up event listeners
      engine.addListener('onUserJoined', (connection, remoteUid) => {
        console.log('✅ Remote user joined:', remoteUid);
        setRemoteUids(prev => [...new Set([...prev, remoteUid])]);
        setStatus('connected');
      });

      engine.addListener('onUserOffline', (connection, remoteUid) => {
        console.log('User left:', remoteUid);
        setRemoteUids(prev => prev.filter(id => id !== remoteUid));
      });

      engine.addListener('onJoinChannelSuccess', (connection, elapsed) => {
        console.log('✅ Joined channel:', channelName);
        setStatus('waiting');
      });

      engine.addListener('onError', (err, msg) => {
        console.error('Agora error:', err, msg);
      });

      // ✅ Join channel
      await engine.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: isVideo,
        autoSubscribeAudio: true,
        autoSubscribeVideo: isVideo,
      });

    } catch (error) {
      console.error('Agora init error:', error);
      setStatus('error');
      Alert.alert(
        'Connection Failed',
        error.message || 'Could not connect to session.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  };

  const cleanupAgora = async () => {
    try {
      if (engineRef.current) {
        await engineRef.current.leaveChannel();
        engineRef.current.removeAllListeners();
        engineRef.current = null;
      }
    } catch (e) {
      console.log('Cleanup error:', e.message);
    }
  };

  const toggleMute = async () => {
    if (engineRef.current) {
      await engineRef.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = async () => {
    if (engineRef.current && isVideo) {
      await engineRef.current.muteLocalVideoStream(!isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  };

  const endCall = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to leave this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await cleanupAgora();
            navigation.goBack();
          }
        }
      ]
    );
  };

  // ─── SDK unavailable screen ───────────────────────────────
  if (status === 'unavailable') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isVideo ? '📹 Video Session' : '🎙️ Audio Session'}
          </Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.bigEmoji}>{isVideo ? '📹' : '🎙️'}</Text>
          <Text style={styles.bigTitle}>Session with {otherPerson}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>⚙️ Rebuild Required</Text>
            <Text style={styles.infoText}>
              Video/Audio calling needs a new development build.
              Run: eas build --profile development --platform android
            </Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Connecting screen ────────────────────────────────────
  if (status === 'connecting') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { cleanupAgora(); navigation.goBack(); }}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isVideo ? '📹 Video Session' : '🎙️ Audio Session'}
          </Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text style={styles.connectingText}>Connecting...</Text>
          <Text style={styles.connectingSubText}>Joining session with {otherPerson}</Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { cleanupAgora(); navigation.goBack(); }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main call screen ─────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isVideo ? '📹 Video Session' : '🎙️ Audio Session'}
          </Text>
          <Text style={styles.headerSub}>
            {status === 'connected' ? `With ${otherPerson}` : `Waiting for ${otherPerson}...`}
          </Text>
        </View>
        <View style={[
          styles.liveBadge,
          { backgroundColor: status === 'connected' ? '#1D9E75' : '#F59E0B' }
        ]}>
          <Text style={styles.liveText}>
            {status === 'connected' ? '● LIVE' : '⏳ WAITING'}
          </Text>
        </View>
      </View>

      {/* Video/Audio Area */}
      <View style={styles.videoArea}>
        {/* Remote users */}
        {remoteUids.length > 0 && AgoraAvailable ? (
          remoteUids.map(uid => (
            isVideo ? (
              <RtcSurfaceView
                key={uid}
                style={styles.remoteVideo}
                canvas={{ uid }}
              />
            ) : (
              <View key={uid} style={styles.audioView}>
                <Text style={styles.audioEmoji}>👤</Text>
                <Text style={styles.audioName}>{otherPerson}</Text>
                <Text style={styles.audioStatus}>● Connected</Text>
              </View>
            )
          ))
        ) : (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingEmoji}>{isVideo ? '📹' : '🎙️'}</Text>
            <Text style={styles.waitingText}>Waiting for {otherPerson} to join...</Text>
            <Text style={styles.waitingSubText}>
              Share your session link or ask them to tap "Join Session"
            </Text>
          </View>
        )}

        {/* Local video preview */}
        {isVideo && AgoraAvailable && !isCameraOff && (
          <View style={styles.localVideo}>
            <RtcSurfaceView
              style={{ flex: 1 }}
              canvas={{ uid: 0 }}
            />
            <Text style={styles.localLabel}>You</Text>
          </View>
        )}

        {/* Audio muted indicator */}
        {isMuted && (
          <View style={styles.mutedOverlay}>
            <Text style={styles.mutedText}>🔇 Microphone muted</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnRed]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOff && styles.controlBtnRed]}
            onPress={toggleCamera}
          >
            <Text style={styles.controlIcon}>{isCameraOff ? '📷' : '📹'}</Text>
            <Text style={styles.controlText}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.endBtn} onPress={endCall}>
          <Text style={styles.endIcon}>📵</Text>
          <Text style={styles.endText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101828' },
  header: {
    backgroundColor: '#1a2535',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14,
  },
  back: { color: '#fff', fontSize: 24, fontWeight: '700', marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSub: { color: '#888', fontSize: 11, marginTop: 2 },
  liveBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  bigTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 24 },
  infoCard: {
    backgroundColor: '#1a2535', borderRadius: 14,
    padding: 16, width: '100%', marginBottom: 24
  },
  infoTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#888', fontSize: 13, lineHeight: 20 },
  backBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  connectingText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 },
  connectingSubText: { color: '#888', fontSize: 14, marginTop: 8 },
  cancelBtn: {
    marginTop: 30, backgroundColor: '#FF6B6B',
    paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10
  },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
  videoArea: { flex: 1, backgroundColor: '#101828', position: 'relative' },
  remoteVideo: { flex: 1 },
  audioView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  audioEmoji: { fontSize: 80, marginBottom: 16 },
  audioName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  audioStatus: { color: '#1D9E75', fontSize: 14, marginTop: 8 },
  waitingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  waitingEmoji: { fontSize: 64, marginBottom: 16 },
  waitingText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  waitingSubText: { color: '#888', fontSize: 13, marginTop: 8, textAlign: 'center' },
  localVideo: {
    position: 'absolute', top: 16, right: 16,
    width: 90, height: 130, borderRadius: 10,
    overflow: 'hidden', borderWidth: 2, borderColor: '#1D9E75'
  },
  localLabel: {
    position: 'absolute', bottom: 4, left: 0, right: 0,
    textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  mutedOverlay: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    alignItems: 'center'
  },
  mutedText: {
    backgroundColor: 'rgba(255,107,107,0.8)',
    color: '#fff', paddingHorizontal: 16,
    paddingVertical: 6, borderRadius: 20, fontSize: 13
  },
  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16,
    padding: 20, paddingBottom: 36, backgroundColor: '#1a2535'
  },
  controlBtn: {
    alignItems: 'center', backgroundColor: '#344054',
    borderRadius: 14, padding: 14, minWidth: 76
  },
  controlBtnRed: { backgroundColor: '#FF6B6B' },
  controlIcon: { fontSize: 24 },
  controlText: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
  endBtn: {
    alignItems: 'center', backgroundColor: '#FF6B6B',
    borderRadius: 14, padding: 14, minWidth: 76
  },
  endIcon: { fontSize: 24 },
  endText: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
});