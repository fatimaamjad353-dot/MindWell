import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSessionRoom,
  saveSessionRoom
} from '../utils/sessionRoomStorage';

export default function SessionRoomScreen({ navigation, route }) {
  const { role = 'patient', session = {} } = route.params || {};
  const sessionId = String(session.id || 'demo-session');
  const [room, setRoom] = useState({ messages: [], prescriptions: [] });
  const [message, setMessage] = useState('');
  const [medicine, setMedicine] = useState('');
  const [instructions, setInstructions] = useState('');

  useFocusEffect(
    useCallback(() => {
      getSessionRoom(sessionId).then(setRoom);
    }, [sessionId])
  );

  const persist = async nextRoom => {
    setRoom(nextRoom);
    await saveSessionRoom(sessionId, nextRoom);
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text) return;

    await persist({
      ...room,
      messages: [
        ...room.messages,
        {
          id: `${Date.now()}`,
          text,
          sender: role,
          createdAt: new Date().toISOString()
        }
      ]
    });
    setMessage('');
  };

  const addPrescription = async () => {
    if (medicine.trim().length < 2 || instructions.trim().length < 5) {
      Alert.alert(
        'Prescription incomplete',
        'Enter the medicine and clear usage instructions.'
      );
      return;
    }

    await persist({
      ...room,
      prescriptions: [
        {
          id: `${Date.now()}`,
          medicine: medicine.trim(),
          instructions: instructions.trim(),
          createdAt: new Date().toISOString()
        },
        ...room.prescriptions
      ]
    });
    setMedicine('');
    setInstructions('');
    Alert.alert('Prescription shared', 'The patient can now view it in this session.');
  };

  const otherPerson = role === 'psychologist'
    ? session.patient || 'Patient'
    : session.therapist || 'Psychiatrist';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Active Session</Text>
          <Text style={styles.headerSub}>{otherPerson} · {session.type || 'Video'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.sessionNotice}>
          <Text style={styles.noticeTitle}>Private session space</Text>
          <Text style={styles.noticeText}>
            Messages and clinical tools are available only inside this session.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Session Messages</Text>
        <View style={styles.chatCard}>
          {room.messages.length ? (
            room.messages.map(item => {
              const mine = item.sender === role;
              return (
                <View
                  key={item.id}
                  style={[styles.messageRow, mine && styles.messageRowMine]}
                >
                  <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
                    <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                      {new Date(item.createdAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No messages yet. Start the session conversation.</Text>
          )}
        </View>

        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Write a private session message..."
            placeholderTextColor="#aaa"
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Prescriptions</Text>
        {role === 'psychologist' && (
          <View style={styles.prescriptionForm}>
            <Text style={styles.formLabel}>Medicine</Text>
            <TextInput
              style={styles.formInput}
              value={medicine}
              onChangeText={setMedicine}
              placeholder="Medicine and strength"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.formLabel}>Instructions</Text>
            <TextInput
              style={[styles.formInput, styles.instructionsInput]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Dose, timing, duration, and safety notes"
              placeholderTextColor="#aaa"
              multiline
            />
            <TouchableOpacity style={styles.prescriptionButton} onPress={addPrescription}>
              <Text style={styles.prescriptionButtonText}>Share Prescription</Text>
            </TouchableOpacity>
          </View>
        )}

        {room.prescriptions.length ? (
          room.prescriptions.map(item => (
            <View key={item.id} style={styles.prescriptionCard}>
              <Text style={styles.medicine}>{item.medicine}</Text>
              <Text style={styles.instructions}>{item.instructions}</Text>
              <Text style={styles.prescriptionDate}>
                Shared {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noPrescription}>
            <Text style={styles.noPrescriptionText}>
              {role === 'psychologist'
                ? 'No prescription has been shared in this session.'
                : 'Your psychiatrist has not shared a prescription in this session.'}
            </Text>
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14, flexDirection: 'row', alignItems: 'center' },
  back: { color: '#fff', fontSize: 24, fontWeight: '700', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#D8F5EB', fontSize: 11, marginTop: 2 },
  liveBadge: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  liveText: { color: '#1D9E75', fontSize: 10, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 16 },
  sessionNotice: { backgroundColor: '#E8F5E9', borderRadius: 13, padding: 13, marginTop: 16 },
  noticeTitle: { color: '#176C52', fontSize: 13, fontWeight: '800' },
  noticeText: { color: '#49766A', fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionTitle: { color: '#1a1a2e', fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  chatCard: { minHeight: 150, backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 2 },
  emptyText: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 48 },
  messageRow: { alignItems: 'flex-start', marginBottom: 8 },
  messageRowMine: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '82%', backgroundColor: '#F0EFFF', borderRadius: 13, padding: 10 },
  messageBubbleMine: { backgroundColor: '#6C63FF' },
  messageText: { color: '#333', fontSize: 13, lineHeight: 18 },
  messageTextMine: { color: '#fff' },
  messageTime: { color: '#999', fontSize: 8, marginTop: 4 },
  messageTimeMine: { color: '#DCD9FF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 9, gap: 8 },
  messageInput: { flex: 1, maxHeight: 100, minHeight: 46, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 10, color: '#333' },
  sendButton: { height: 46, paddingHorizontal: 17, borderRadius: 12, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: '700' },
  prescriptionForm: { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, marginBottom: 10 },
  formLabel: { color: '#333', fontSize: 12, fontWeight: '700', marginBottom: 5, marginTop: 8 },
  formInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#333', backgroundColor: '#FAFAFA' },
  instructionsInput: { minHeight: 80, textAlignVertical: 'top' },
  prescriptionButton: { backgroundColor: '#845EC2', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  prescriptionButtonText: { color: '#fff', fontWeight: '700' },
  prescriptionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 9, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#845EC2' },
  medicine: { color: '#1a1a2e', fontSize: 15, fontWeight: '800' },
  instructions: { color: '#555', fontSize: 12, lineHeight: 18, marginTop: 5 },
  prescriptionDate: { color: '#999', fontSize: 9, marginTop: 8 },
  noPrescription: { backgroundColor: '#fff', borderRadius: 14, padding: 18, elevation: 2 },
  noPrescriptionText: { color: '#777', fontSize: 12, textAlign: 'center' },
  bottomSpace: { height: 40 }
});
