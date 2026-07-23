// app/screens/ChatScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { sendChatMessage } from '../utils/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const AUTH_TOKEN_KEY = 'mindwell_auth_token';

// ─── Diagnosis Card ───────────────────────────────────────────
const DiagnosisCard = ({ data, onBookSession, onDismiss }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const severityColor =
    data.severity === 'Severe' ? '#FF6B6B' :
    data.severity === 'Moderate' ? '#FFC107' : '#1D9E75';

  const severityBg =
    data.severity === 'Severe' ? '#FFEBEE' :
    data.severity === 'Moderate' ? '#FFF9C4' : '#E8F5E9';

  return (
    <Animated.View style={[styles.diagnosisCard, { opacity: fadeAnim }]}>
      <View style={styles.diagnosisHeader}>
        <Text style={styles.diagnosisIcon}>🧠</Text>
        <View style={styles.diagnosisHeaderText}>
          <Text style={styles.diagnosisTitle}>Pattern Detected</Text>
          <Text style={styles.diagnosisSubtitle}>Based on your message</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.diagnosisBody}>
        <Text style={styles.diagnosisLabel}>{data.label}</Text>
        <Text style={styles.diagnosisConfidence}>{data.confidence}% confidence</Text>
      </View>
      <View style={[styles.severityBadge, { backgroundColor: severityBg }]}>
        <Text style={[styles.severityText, { color: severityColor }]}>
          {data.severity} Severity
        </Text>
      </View>
      {data.top3 && data.top3.length > 0 && (
        <View style={styles.top3Row}>
          {data.top3.slice(0, 3).map((item, i) => (
            <View key={i} style={styles.top3Item}>
              <Text style={styles.top3Name}>{item.name}</Text>
              <Text style={styles.top3Conf}>{item.confidence?.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.diagnosisActions}>
        <TouchableOpacity style={styles.learnMoreBtn} onPress={onDismiss}>
          <Text style={styles.learnMoreText}>Got it</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={onBookSession}>
          <Text style={styles.bookText}>Book a Session</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Crisis Banner ────────────────────────────────────────────
const CrisisBanner = ({ onDismiss }) => (
  <View style={styles.crisisBanner}>
    <Text style={styles.crisisIcon}>🆘</Text>
    <View style={styles.crisisText}>
      <Text style={styles.crisisTitle}>You're not alone</Text>
      <Text style={styles.crisisSub}>Call: 0317-4288665</Text>
    </View>
    <TouchableOpacity style={styles.crisisBtn} onPress={onDismiss}>
      <Text style={styles.crisisBtnText}>OK</Text>
    </TouchableOpacity>
  </View>
);

// ─── Voice Button Component ───────────────────────────────────
const VoiceButton = ({ isListening, onPress, disabled }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.voiceBtnWrapper}
    >
      <Animated.View
        style={[
          styles.voiceBtn,
          isListening && styles.voiceBtnActive,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Text style={styles.voiceBtnIcon}>
          {isListening ? '🔴' : '🎤'}
        </Text>
      </Animated.View>
      {isListening && (
        <Text style={styles.listeningText}>Listening...</Text>
      )}
    </TouchableOpacity>
  );
};

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi there 👋 I'm MindWell, your personal wellness companion. I'm here to listen and support you. How are you feeling today?\n\nTap 🎤 to speak or type below.",
      sender: 'ai',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [diagnosisCard, setDiagnosisCard] = useState(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const [shownDiagnoses, setShownDiagnoses] = useState(new Set());

  // ─── Voice recognition state ──────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');
  const [interimText, setInterimText] = useState('');

  const scrollRef = useRef();

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      setIsLoggedIn(!!token);
    };
    checkLogin();
  }, []);

  // ─── Voice Recognition Events ─────────────────────────────
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setInterimText('');
    console.log('🎤 Voice recognition started');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setInterimText('');
    console.log('🎤 Voice recognition ended');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    const isFinal = event.results[0]?.confidence > 0;

    if (event.isFinal || isFinal) {
      // Final result — set as input text
      setInput(transcript);
      setInterimText('');
      console.log('🎤 Final transcript:', transcript);
    } else {
      // Interim result — show as preview
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setInterimText('');
    console.error('🎤 Voice error:', event.error);

    if (event.error === 'no-speech') {
      Alert.alert('No speech detected', 'Please try speaking again.');
    } else if (event.error === 'not-allowed') {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access in your phone settings to use voice input.',
        [{ text: 'OK' }]
      );
    }
  });

  // ─── Start/Stop Voice Recognition ─────────────────────────
  const toggleVoice = async () => {
    if (isListening) {
      await ExpoSpeechRecognitionModule.stop();
      return;
    }

    // Request permission first
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is needed for voice input. Please enable it in settings.'
      );
      return;
    }

    // Start recognition
    ExpoSpeechRecognitionModule.start({
      lang: voiceLanguage,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
    });
  };

  // ─── Toggle language between English and Urdu ─────────────
  const toggleLanguage = () => {
    const newLang = voiceLanguage === 'en-US' ? 'ur-PK' : 'en-US';
    setVoiceLanguage(newLang);
    Alert.alert(
      'Language Changed',
      newLang === 'ur-PK' ? '🇵🇰 Urdu voice input enabled' : '🇬🇧 English voice input enabled'
    );
  };

  const quickReplies = [
    "I'm feeling anxious 😰",
    "I'm stressed about work 😤",
    "I feel lonely 😔",
    "I need motivation 💪",
  ];

  // ─── Send Message ─────────────────────────────────────────
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice: !text && isListening,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setInterimText('');
    setLoading(true);
    setDiagnosisCard(null);

    try {
      const response = await sendChatMessage({
        message: messageText,
        chatId: chatId || undefined,
        language: voiceLanguage === 'ur-PK' ? 'roman_urdu' : 'english'
      });

      const data = response?.data || response;

      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }

      const aiText = data.aiResponse ||
        "I'm here for you. Could you tell me more? 💙";

      const aiMsg = {
        id: Date.now() + 1,
        text: aiText,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        riskLevel: data.riskLevel,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (data.escalatedToHuman || data.riskLevel === 'High') {
        setShowCrisis(true);
      }

      const diagnosis = data.diagnosis;
      if (
        diagnosis?.needsHelp &&
        diagnosis?.label &&
        diagnosis.label !== 'No issue detected' &&
        !shownDiagnoses.has(diagnosis.label) &&
        diagnosis.confidence > 70
      ) {
        setDiagnosisCard({
          label: diagnosis.label,
          confidence: diagnosis.confidence?.toFixed(1),
          severity: diagnosis.severityLabel || diagnosis.severity,
          top3: diagnosis.top3 || []
        });
        setShownDiagnoses(prev => new Set([...prev, diagnosis.label]));
      }

    } catch (error) {
      console.error('❌ Chat error:', error.message);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: "I'm having trouble connecting. Please try again 💙",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🤖 AI Coach</Text>
          <Text style={[styles.headerStatus, isLoggedIn ? styles.online : styles.offline]}>
            {isLoggedIn ? '● Online' : '● Offline'}
          </Text>
        </View>
        {/* Language toggle button */}
        <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
          <Text style={styles.langBtnText}>
            {voiceLanguage === 'en-US' ? '🇬🇧' : '🇵🇰'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Crisis Banner */}
      {showCrisis && (
        <CrisisBanner onDismiss={() => setShowCrisis(false)} />
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {msg.sender === 'ai' && <Text style={styles.aiAvatar}>🤖</Text>}
            <View style={styles.bubbleWrapper}>
              <View style={[
                styles.bubbleContent,
                msg.sender === 'user' ? styles.userContent : styles.aiContent,
              ]}>
                {/* Show mic icon if sent via voice */}
                {msg.isVoice && (
                  <Text style={styles.voiceIndicator}>🎤 </Text>
                )}
                <Text style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.userText : styles.aiText,
                ]}>
                  {msg.text}
                </Text>
              </View>
              <Text style={[
                styles.timeText,
                msg.sender === 'user' ? styles.timeRight : styles.timeLeft
              ]}>
                {msg.time}
              </Text>
            </View>
          </View>
        ))}

        {/* Interim voice text preview */}
        {interimText ? (
          <View style={styles.interimBubble}>
            <Text style={styles.interimIcon}>🎤</Text>
            <Text style={styles.interimText}>{interimText}...</Text>
          </View>
        ) : null}

        {/* Typing indicator */}
        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiAvatar}>🤖</Text>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.typingText}>MindWell is thinking...</Text>
            </View>
          </View>
        )}

        {/* Diagnosis Card */}
        {diagnosisCard && (
          <DiagnosisCard
            data={diagnosisCard}
            onDismiss={() => setDiagnosisCard(null)}
            onBookSession={() => {
              setDiagnosisCard(null);
              navigation.navigate('FindTherapist');
            }}
          />
        )}
      </ScrollView>

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickReplies}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {quickReplies.map((reply, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickReply}
            onPress={() => sendMessage(reply)}
            disabled={loading}
          >
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input Box with Voice Button */}
      <View style={styles.inputBox}>
        {/* Voice Button */}
        <VoiceButton
          isListening={isListening}
          onPress={toggleVoice}
          disabled={loading}
        />

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder={
            isListening
              ? 'Listening...'
              : voiceLanguage === 'ur-PK'
                ? 'لکھیں یا بولیں...'
                : 'Type or speak...'
          }
          placeholderTextColor={isListening ? '#6C63FF' : '#aaa'}
          value={isListening ? interimText : input}
          onChangeText={setInput}
          multiline
          editable={!loading && !isListening}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || loading) && styles.sendBtnDisabled
          ]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },

  // Header
  header: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerInfo: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerStatus: { fontSize: 12, marginTop: 2 },
  online: { color: '#90EE90' },
  offline: { color: '#FF6B6B' },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBtnText: { fontSize: 20 },

  // Crisis Banner
  crisisBanner: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  crisisIcon: { fontSize: 24, marginRight: 10 },
  crisisText: { flex: 1 },
  crisisTitle: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  crisisSub: { fontSize: 11, color: '#E53935', marginTop: 2 },
  crisisBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  crisisBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Messages
  messages: { flex: 1 },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { fontSize: 24, marginRight: 8, marginBottom: 16 },
  bubbleWrapper: { maxWidth: '75%' },
  bubbleContent: { borderRadius: 16, padding: 12 },
  userContent: { backgroundColor: '#6C63FF', borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 2 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#333' },
  voiceIndicator: { fontSize: 12 },
  timeText: { fontSize: 10, color: '#aaa', marginTop: 4 },
  timeRight: { textAlign: 'right' },
  timeLeft: { textAlign: 'left' },

  // Interim voice preview
  interimBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  interimIcon: { fontSize: 16, marginRight: 6 },
  interimText: { color: '#6C63FF', fontSize: 14, fontStyle: 'italic', flex: 1 },

  // Typing
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  typingText: { marginLeft: 8, color: '#888', fontSize: 14 },

  // Diagnosis Card
  diagnosisCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#6C63FF',
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  diagnosisIcon: { fontSize: 24, marginRight: 10 },
  diagnosisHeaderText: { flex: 1 },
  diagnosisTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  diagnosisSubtitle: { fontSize: 11, color: '#888', marginTop: 2 },
  dismissBtn: { padding: 4 },
  dismissText: { color: '#aaa', fontSize: 16 },
  diagnosisBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  diagnosisLabel: { fontSize: 18, fontWeight: '800', color: '#6C63FF' },
  diagnosisConfidence: { fontSize: 13, color: '#888' },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  top3Row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  top3Item: {
    flex: 1,
    backgroundColor: '#F0EFFF',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  top3Name: { fontSize: 10, color: '#444', fontWeight: '600', textAlign: 'center' },
  top3Conf: { fontSize: 12, color: '#6C63FF', fontWeight: '700', marginTop: 2 },
  diagnosisActions: { flexDirection: 'row', gap: 10 },
  learnMoreBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  learnMoreText: { color: '#6C63FF', fontWeight: '600', fontSize: 13 },
  bookBtn: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  bookText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Quick replies
  quickReplies: { maxHeight: 50, marginBottom: 8 },
  quickReply: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickReplyText: { color: '#6C63FF', fontSize: 13, fontWeight: '500' },

  // Input Box
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 3,
  },

  // Voice Button
  voiceBtnWrapper: { alignItems: 'center', marginRight: 4 },
  voiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  voiceBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF6B6B',
  },
  voiceBtnIcon: { fontSize: 18 },
  listeningText: { fontSize: 8, color: '#FF6B6B', fontWeight: '600', marginTop: 2 },

  // Text Input
  input: { flex: 1, fontSize: 15, color: '#333', maxHeight: 80, paddingHorizontal: 8 },
  sendBtn: {
    backgroundColor: '#6C63FF',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 16 },
});