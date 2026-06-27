import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@mindwell/patient-profile';

export async function getProfile(fallback = {}) {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    return stored
      ? { ...fallback, ...JSON.parse(stored) }
      : fallback;
  } catch {
    return fallback;
  }
}

export async function saveProfile(profile) {
  const savedProfile = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(savedProfile));
  return savedProfile;
}
