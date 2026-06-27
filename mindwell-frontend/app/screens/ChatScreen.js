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
} from 'react-native';
import { sendChatMessage } from '../utils/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'mindwell_auth_token';

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI wellness coach 🧠 I'm here to support you. How are you feeling today?",
      sender: 'ai',
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ─── Check if user is logged in ──────────────────────────
  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      setIsLoggedIn(!!token);
      console.log('🔐 [ChatScreen] User logged in:', !!token);
    };
    checkLogin();
  }, []);

  const quickReplies = [
    "I'm feeling anxious 😰",
    "I'm stressed about work 😤",
    "I feel lonely 😔",
    "I need motivation 💪",
  ];

  // ─── SEND MESSAGE FUNCTION ──────────────────────────────────
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText) {
      console.log('⚠️ [ChatScreen] Empty message, ignoring');
      return;
    }

    console.log('🔵 [ChatScreen] sendMessage called with:', messageText);
    console.log('🔵 [ChatScreen] User logged in:', isLoggedIn);

    // ─── Add user message ──────────────────────────────────
    const userMsg = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      console.log('📤 [ChatScreen] Sending to API:', messageText);

      // ─── Call backend API ──────────────────────────────────
      const response = await sendChatMessage({ message: messageText });

      console.log('📥 [ChatScreen] Full response from backend:', JSON.stringify(response, null, 2));

      // ─── ✅ FIX: Extract AI response from the "data" object ──
      let aiText = "I'm here to listen. Could you tell me more about what's on your mind? 💙";

      if (response) {
        // The response is inside "data" object
        const responseData = response.data || response;

        // Check if aiResponse exists in the data
        if (responseData.aiResponse) {
          aiText = responseData.aiResponse;
          console.log('✅ [ChatScreen] Using aiResponse from data');
        }
        // If backend has diagnosis but no aiResponse
        else if (responseData.diagnosis && responseData.diagnosis.label) {
          aiText = `I notice patterns consistent with ${responseData.diagnosis.label} (${responseData.confidence?.toFixed(1) || '95'}% confidence). Would you like to learn more or speak with a professional?`;
        }
        // Check for crisis
        else if (responseData.escalatedToHuman || responseData.riskLevel === 'HIGH') {
          aiText = "🚨 I've detected you might be in a crisis. Please stay with me. I'm alerting our support team.\n\n📞 Crisis Helpline: 0317-4288665";
        }
        // Check if there's a message in the response
        else if (responseData.message) {
          aiText = responseData.message;
        }
      }

      console.log('🤖 [ChatScreen] Final AI Response:', aiText.substring(0, 200) + '...');

      // ─── Add AI message ───────────────────────────────────
      const aiMsg = {
        id: Date.now() + 1,
        text: aiText,
        sender: 'ai',
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

    } catch (error) {
      console.error('❌ [ChatScreen] Chat error:', error.message);
      console.error('❌ [ChatScreen] Full error:', error);

      let errorMessage = "I'm having trouble connecting. Please try again. 🔌";

      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorMessage = "I can't reach my brain right now. Please check your internet connection. 🔌";
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = "Your session has expired. Please log in again. 🔐";
      }

      const errorMsg = {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'ai',
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);

    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
        <View style={{ width: 30 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
            <View
              style={[
                styles.bubbleContent,
                msg.sender === 'user' ? styles.userContent : styles.aiContent,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.userText : styles.aiText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiAvatar}>🤖</Text>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Replies */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickReplies}
        contentContainerStyle={{ paddingHorizontal: 12 }}
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

      {/* Input Box */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Type how you feel..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={loading}
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
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerStatus: { fontSize: 12, marginTop: 2 },
  online: { color: '#90EE90' },
  offline: { color: '#FF6B6B' },

  // Messages
  messages: { flex: 1 },
  messageBubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { fontSize: 24, marginRight: 8 },
  bubbleContent: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  userContent: { backgroundColor: '#6C63FF', borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 2 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#333' },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  typingText: { marginLeft: 8, color: '#888', fontSize: 14 },

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

  // Input
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 3,
  },
  input: { flex: 1, fontSize: 15, color: '#333', maxHeight: 80 },
  sendBtn: {
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 16 },
});