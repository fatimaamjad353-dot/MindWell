// app/utils/apiService.js
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

    const safeBody = body !== undefined && body !== null ? { ...body } : undefined;
    
    const logBody = safeBody ? { ...safeBody } : undefined;
    if (logBody && logBody.password) {
        logBody.password = '***';
    }

    if (safeBody) {
        options.body = JSON.stringify(safeBody);
    }

    console.log(`[API][${method}] ${path}`, logBody || {});

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const data = await parseJson(response);

        console.log(`[API][${method}] ${path} ->`, response.status, data);

        // ─── ✅ Return the error response data ─────────────────────
        if (!response.ok) {
            // Return the error data so the caller can handle it
            const errorData = data || { message: 'Request failed' };
            console.log('❌ API Error Data:', errorData);
            throw errorData;
        }

        return data;
    } catch (error) {
        console.log(`[API][${method}] ${path} ERROR`, error.message || error);
        // Re-throw so the caller can handle it
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

// ─── OTP Functions ──────────────────────────────────────


export const sendOTP = (payload) => request({
    path: '/auth/send-otp',
    method: 'POST',
    body: payload,
    auth: false
});

export const verifyOTP = (payload) => request({
    path: '/auth/verify-otp',
    method: 'POST',
    body: payload,
    auth: false
});

export const resendOTP = (payload) => request({
    path: '/auth/send-otp',
    method: 'POST',
    body: payload,
    auth: false
});

// ─── Email Validation Functions ───────────────────────────────

export const validateEmailFormat = (email) => {
    const trimmed = email.trim();
    
    if (!trimmed) {
        return { valid: false, message: 'Email is required' };
    }
    
    if (!trimmed.includes('@')) {
        return { valid: false, message: 'Email must contain "@"' };
    }
    
    const parts = trimmed.split('@');
    if (parts.length !== 2) {
        return { valid: false, message: 'Invalid email format' };
    }
    
    const domain = parts[1];
    if (!domain || !domain.includes('.')) {
        return { valid: false, message: 'Email must have a valid domain (e.g., .com)' };
    }
    
    if (domain.length < 3) {
        return { valid: false, message: 'Email domain is too short' };
    }
    
    // Common typos fix
    const typos = {
        'gmail.con': 'gmail.com',
        'gmial.com': 'gmail.com',
        'gmil.com': 'gmail.com',
        'gmal.com': 'gmail.com',
        'gmaill.com': 'gmail.com',
        'yahoo.con': 'yahoo.com',
        'hotmail.con': 'hotmail.com',
        'outlook.con': 'outlook.com',
    };
    
    const corrected = typos[domain] ? `${parts[0]}@${typos[domain]}` : null;
    
    return { 
        valid: true, 
        message: 'Valid email format',
        corrected: corrected
    };
};

export const isDisposableEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    const disposableDomains = [
        'mailinator.com', 'guerrillamail.com', '10minutemail.com',
        'tempmail.com', 'yopmail.com', 'getnada.com',
        'trashmail.com', 'maildrop.cc', 'temp-mail.org'
    ];
    
    return disposableDomains.some(d => domain.includes(d));
};

export const validateEmailFull = (email) => {
    const formatResult = validateEmailFormat(email);
    if (!formatResult.valid) return formatResult;
    
    if (isDisposableEmail(email)) {
        return { 
            valid: false, 
            message: 'Temporary email addresses are not allowed. Please use a real email address.'
        };
    }
    
    return { valid: true, message: 'Valid email' };
};

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