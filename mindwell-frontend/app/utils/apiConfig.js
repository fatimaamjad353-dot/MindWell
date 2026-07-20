// Real Expo devices must call your computer's LAN IP, not the Android emulator
// alias 10.0.2.2. If your Wi-Fi IP changes, update this value.
export const API_BASE_URL = 'http://192.168.10.6:3000/api';
export const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
