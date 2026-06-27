import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_LOGS_KEY = '@mindwell/chat-logs';

export async function getChatLogs() {
  try {
    const stored = await AsyncStorage.getItem(CHAT_LOGS_KEY);
    const logs = stored ? JSON.parse(stored) : [];
    return Array.isArray(logs)
      ? logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];
  } catch {
    return [];
  }
}

export async function saveChatLog(entry) {
  const logs = await getChatLogs();
  const createdAt = entry.createdAt || new Date().toISOString();
  const savedEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: entry.text?.trim() || '',
    sender: entry.sender,
    intent: entry.intent || null,
    isCrisis: Boolean(entry.isCrisis),
    createdAt,
  };

  await AsyncStorage.setItem(CHAT_LOGS_KEY, JSON.stringify([savedEntry, ...logs]));
  return savedEntry;
}
