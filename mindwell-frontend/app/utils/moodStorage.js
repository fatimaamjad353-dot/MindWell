import AsyncStorage from '@react-native-async-storage/async-storage';

const MOOD_LOGS_KEY = '@mindwell/mood-logs';

export async function getMoodLogs() {
  try {
    const storedLogs = await AsyncStorage.getItem(MOOD_LOGS_KEY);
    const logs = storedLogs ? JSON.parse(storedLogs) : [];

    return Array.isArray(logs)
      ? logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : [];
  } catch {
    return [];
  }
}

export async function saveMoodLog(entry) {
  const logs = await getMoodLogs();
  const createdAt = entry.createdAt || new Date().toISOString();
  const newEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mood: entry.mood,
    score: entry.score,
    emoji: entry.emoji,
    color: entry.color,
    note: entry.note?.trim() || '',
    activities: entry.activities || [],
    createdAt,
    dateKey: createdAt.slice(0, 10)
  };

  await AsyncStorage.setItem(
    MOOD_LOGS_KEY,
    JSON.stringify([newEntry, ...logs])
  );

  return newEntry;
}
