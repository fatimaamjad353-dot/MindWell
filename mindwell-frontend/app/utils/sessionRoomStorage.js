import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = sessionId => `@mindwell/session-room/${sessionId}`;

export async function getSessionRoom(sessionId) {
  try {
    const stored = await AsyncStorage.getItem(keyFor(sessionId));
    return stored
      ? JSON.parse(stored)
      : { messages: [], prescriptions: [] };
  } catch {
    return { messages: [], prescriptions: [] };
  }
}

export async function saveSessionRoom(sessionId, room) {
  await AsyncStorage.setItem(keyFor(sessionId), JSON.stringify(room));
}
