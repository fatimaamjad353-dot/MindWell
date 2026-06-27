import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURITY_KEY = '@mindwell/security-settings';

const DEFAULT_SECURITY = {
  passwordUpdatedAt: null,
  psychiatristTwoFactorRequired: true
};

export async function getSecuritySettings() {
  try {
    const stored = await AsyncStorage.getItem(SECURITY_KEY);
    return stored
      ? { ...DEFAULT_SECURITY, ...JSON.parse(stored) }
      : DEFAULT_SECURITY;
  } catch {
    return DEFAULT_SECURITY;
  }
}

export async function savePasswordUpdate() {
  const current = await getSecuritySettings();
  const updated = {
    ...current,
    passwordUpdatedAt: new Date().toISOString(),
    psychiatristTwoFactorRequired: true
  };
  await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(updated));
  return updated;
}
