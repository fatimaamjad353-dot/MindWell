import AsyncStorage from '@react-native-async-storage/async-storage';

const RATINGS_KEY = '@mindwell/psychiatrist-ratings';

export async function getRatings() {
  try {
    const stored = await AsyncStorage.getItem(RATINGS_KEY);
    const ratings = stored ? JSON.parse(stored) : [];
    return Array.isArray(ratings) ? ratings : [];
  } catch {
    return [];
  }
}

export async function saveRating(rating) {
  const ratings = await getRatings();
  const savedRating = {
    ...rating,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  };

  const updated = [
    savedRating,
    ...ratings.filter(item => String(item.sessionId) !== String(rating.sessionId))
  ];
  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(updated));
  return savedRating;
}
