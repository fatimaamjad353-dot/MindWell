import { API_BASE_URL } from './apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'mindwell_auth_token';

const buildHeaders = async (contentType = 'application/json') => {
  const headers = {};
  if (contentType) headers['Content-Type'] = contentType;

  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const setAuthToken = async (token) => {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getStoredToken = async () => AsyncStorage.getItem(AUTH_TOKEN_KEY);

export const request = async ({ path, method = 'GET', body, auth = true }) => {
  const headers = await buildHeaders();
  const options = {
    method,
    headers,
  };

  // ✅ Create a copy of the body for the request (keep original data)
  const safeBody = body !== undefined && body !== null ? { ...body } : undefined;
  
  // ✅ Create a separate copy for logging (don't modify the actual body)
  const logBody = safeBody ? { ...safeBody } : undefined;
  if (logBody && logBody.password) {
    logBody.password = '***';  // Only for logging, not for the request
  }

  // ✅ Use the original safeBody for the request (with the actual password)
  if (safeBody) {
    options.body = JSON.stringify(safeBody);
  }

  console.log(`[API][${method}] ${path}`, logBody || {});

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await parseJson(response);

    console.log(`[API][${method}] ${path} ->`, response.status, data);

    if (!response.ok) {
      const message = data?.message || 'Request failed';
      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.log(`[API][${method}] ${path} ERROR`, error.message || error);
    throw error;
  }
};

// ─── Auth Functions ──────────────────────────────────────

export const registerPatient = (payload) => request({ 
  path: '/auth/patient/register', 
  method: 'POST', 
  body: payload 
});

export const loginPatient = (payload) => request({ 
  path: '/auth/patient/login', 
  method: 'POST', 
  body: payload 
});

export const registerPsychiatrist = (payload) => request({ 
  path: '/auth/psychiatrist/register', 
  method: 'POST', 
  body: payload 
});

export const loginPsychiatrist = (payload) => request({ 
  path: '/auth/psychiatrist/login', 
  method: 'POST', 
  body: payload 
});

// ─── Mood Functions ──────────────────────────────────────

export const logMoodEntry = (payload) => request({ 
  path: '/mood/log', 
  method: 'POST', 
  body: payload 
});

export const getMoodEntries = () => request({ 
  path: '/mood/all' 
});

export const getTodayMoodEntries = () => request({ 
  path: '/mood/today' 
});

export const getWeeklyMoodSummary = () => request({ 
  path: '/mood/weekly' 
});

export const getMonthlyMoodSummary = () => request({ 
  path: '/mood/monthly' 
});

// ─── Session Functions ──────────────────────────────────

export const searchTherapists = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request({ 
    path: `/sessions/search${query ? `?${query}` : ''}` 
  });
};

export const bookSessionApi = (payload) => request({ 
  path: '/sessions/book', 
  method: 'POST', 
  body: payload 
});

export const getMySessionsApi = () => request({ 
  path: '/sessions/my' 
});

export const cancelSessionApi = (sessionId) => request({ 
  path: `/sessions/${sessionId}`, 
  method: 'DELETE' 
});

export const rateSessionApi = (sessionId, payload) => request({ 
  path: `/sessions/${sessionId}/rate`, 
  method: 'POST', 
  body: payload 
});

// ─── AI Functions ──────────────────────────────────────

export const sendChatMessage = (payload) => request({ 
  path: '/ai/chat', 
  method: 'POST', 
  body: payload 
});