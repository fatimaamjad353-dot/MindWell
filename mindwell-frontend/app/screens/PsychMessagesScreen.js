import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const initialThreads = [
  { id: 1, name: 'Sarah M.', preview: 'The breathing exercise helped last night.', time: '9:42 AM', unread: 2, online: true },
  { id: 2, name: 'Ahmed K.', preview: 'Can we move tomorrow to the afternoon?', time: 'Yesterday', unread: 1, online: false },
  { id: 3, name: 'Fatima R.', preview: 'Thank you for sharing the worksheet.', time: 'Monday', unread: 0, online: true },
  { id: 4, name: 'Omar B.', preview: 'I completed this week clinical check-in.', time: 'Sunday', unread: 0, online: false },
];

export default function PsychMessagesScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState(initialThreads);

  const openThread = (thread) => {
    setThreads(current => current.map(item => item.id === thread.id ? { ...item, unread: 0 } : item));
    Alert.alert(thread.name, thread.preview, [
      { text: 'Close', style: 'cancel' },
      { text: 'Reply', onPress: () => Alert.alert('Reply', 'Conversation composer opened.') },
    ]);
  };

  const visibleThreads = threads.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  const unreadTotal = threads.reduce((total, item) => total + item.unread, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Patient messages</Text>
          <Text style={styles.headerSubtitle}>{unreadTotal} unread</Text>
        </View>
        <TouchableOpacity style={styles.composeButton} onPress={() => Alert.alert('New message', 'Choose a patient to start a conversation.')}>
          <Text style={styles.composeText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search conversations" placeholderTextColor="#aaa" />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {visibleThreads.map(thread => (
          <TouchableOpacity key={thread.id} style={styles.thread} onPress={() => openThread(thread)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{thread.name[0]}</Text>
              <View style={[styles.presence, thread.online ? styles.online : styles.offline]} />
            </View>
            <View style={styles.threadBody}>
              <View style={styles.threadTop}>
                <Text style={[styles.name, thread.unread > 0 && styles.unreadName]}>{thread.name}</Text>
                <Text style={styles.time}>{thread.time}</Text>
              </View>
              <View style={styles.threadBottom}>
                <Text style={[styles.preview, thread.unread > 0 && styles.unreadPreview]} numberOfLines={1}>{thread.preview}</Text>
                {thread.unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{thread.unread}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {visibleThreads.length === 0 && <Text style={styles.emptyText}>No conversations found.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#1D9E75', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { color: '#fff', fontSize: 28, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSubtitle: { color: '#D9F3EB', fontSize: 11, textAlign: 'center', marginTop: 2 },
  composeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  composeText: { color: '#fff', fontSize: 22, lineHeight: 24 },
  searchBox: { backgroundColor: '#fff', borderRadius: 13, margin: 16, marginBottom: 8, paddingHorizontal: 14, elevation: 2 },
  searchInput: { color: '#222', fontSize: 14, paddingVertical: 12 },
  list: { padding: 16, paddingTop: 8 },
  thread: { backgroundColor: '#fff', borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8E6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#6C63FF', fontSize: 20, fontWeight: '700' },
  presence: { position: 'absolute', width: 12, height: 12, borderRadius: 6, right: 1, bottom: 2, borderWidth: 2, borderColor: '#fff' },
  online: { backgroundColor: '#1D9E75' },
  offline: { backgroundColor: '#bbb' },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: '#333', fontSize: 15, fontWeight: '600' },
  unreadName: { color: '#1a1a2e', fontWeight: '700' },
  time: { color: '#999', fontSize: 10 },
  threadBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  preview: { color: '#888', fontSize: 12, flex: 1, marginRight: 8 },
  unreadPreview: { color: '#555', fontWeight: '600' },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
});
