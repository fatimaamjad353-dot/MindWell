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

/**
 * Search for therapists with filters
 * @param {Object} params - Search parameters
 * @param {string} params.specialization - Specialization to search for (optional)
 * @param {string} params.language - Language filter (optional)
 * @param {string} params.available - 'true' to show only available (optional)
 * @returns {Promise} - Returns therapists data
 */
export const searchTherapists = (params = {}) => {
  // Clean params - remove empty/undefined values
  const cleanParams = {};
  if (params.specialization && params.specialization.trim()) {
    cleanParams.specialization = params.specialization.trim();
  }
  if (params.language) {
    cleanParams.language = params.language;
  }
  if (params.available) {
    cleanParams.available = params.available;
  }
  
  const query = new URLSearchParams(cleanParams).toString();
  const url = `/sessions/search${query ? `?${query}` : ''}`;
  
  console.log(`[API][GET] ${url}`);
  return request({ path: url });
};

/**
 * Get all active psychiatrists
 * @returns {Promise} - Returns all active psychiatrists
 */
export const getAllPsychiatrists = () => {
  console.log('[API][GET] /sessions/search (all)');
  return request({ path: '/sessions/search' });
};
// ─── Session Functions ──────────────────────────────────

export const bookSessionApi = (payload) => {
  // Ensure proper field names and enum values
  const formattedPayload = {
    patientId: payload.patientId,
    psychiatristId: payload.psychiatristId,
    dateTime: payload.dateTime,
    sessionType: payload.sessionType.charAt(0).toUpperCase() + payload.sessionType.slice(1), // 'video' -> 'Video'
    agreedRate: payload.agreedRate,
    notes: payload.notes || '',
    bookingSource: payload.bookingSource === 'AI_Recommended' ? 'AI_Recommended' : 'Manual',
    status: 'Pending' // Default status
  };
  
  return request({ 
    path: '/sessions/book', 
    method: 'POST', 
    body: formattedPayload 
  });
};

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

export const getChatHistory = () => request({ 
  path: '/ai/history' 
});

export const getSingleChat = (chatId) => request({ 
  path: `/ai/history/${chatId}` 
});

export const getRiskScore = () => request({ 
  path: '/ai/risk' 
});

export const endUserSession = (userId) => request({ 
  path: `/ai/end/${userId}`, 
  method: 'DELETE' 
});

// ─── Psychiatrist Functions ──────────────────────────────

export const getPsychiatristDashboard = () => request({
  path: '/psychiatrist/dashboard'
});

export const getPsychiatristSessions = (status) => request({
  path: `/psychiatrist/sessions${status ? `?status=${status}` : ''}`
});

export const getPendingRequests = () => request({
  path: '/psychiatrist/sessions/pending'
});

export const confirmSessionApi = (sessionId, meetingLink) => request({
  path: `/psychiatrist/sessions/${sessionId}/confirm`,
  method: 'PATCH',
  body: { meetingLink }
});

export const rejectSessionApi = (sessionId) => request({
  path: `/psychiatrist/sessions/${sessionId}/reject`,
  method: 'PATCH'
});

export const completeSessionApi = (sessionId) => request({
  path: `/psychiatrist/sessions/${sessionId}/complete`,
  method: 'PATCH'
});

export const getPsychiatristPatients = () => request({
  path: '/psychiatrist/patients'
});

export const getPsychiatristEarnings = () => request({
  path: '/psychiatrist/earnings'
});

export const getPsychiatristFeedback = () => request({
  path: '/psychiatrist/feedback'
});

// ─── Admin Functions ──────────────────────────────────────

export const adminLogin = (payload) => request({
  path: '/admin/login',
  method: 'POST',
  body: payload,
  auth: false
});

export const getPendingPsychiatrists = () => request({
  path: '/admin/psychiatrists/pending'
});

export const verifyPsychiatrist = (id, payload) => request({
  path: `/admin/psychiatrists/verify/${id}`,
  method: 'PUT',
  body: payload
});

export const suspendPsychiatrist = (id) => request({
  path: `/admin/psychiatrists/suspend/${id}`,
  method: 'PUT'
});

export const getAllPatients = () => request({
  path: '/admin/patients'
});

export const suspendPatient = (id) => request({
  path: `/admin/patients/suspend/${id}`,
  method: 'PUT'
});

export const getAdminDashboardStats = () => request({
  path: '/admin/dashboard'
});

export const getAllSessions = () => request({
  path: '/admin/sessions'
});

export const getAllPayments = () => request({
  path: '/admin/payments'
});

// ─── Payment Functions ──────────────────────────────────

export const createPaymentIntent = (payload) => request({
  path: '/payment/create-intent',
  method: 'POST',
  body: payload
});

export const confirmPayment = (payload) => request({
  path: '/payment/confirm',
  method: 'POST',
  body: payload
});

export const getMyPayments = () => request({
  path: '/payment/my-payments'
});

export const getPaymentDetails = (id) => request({
  path: `/payment/${id}`
});

export const refundPayment = (id) => request({
  path: `/payment/refund/${id}`,
  method: 'POST'
});

// ─── Recommender Functions ─────────────────────────────

export const getTherapistRecommendations = () => request({
  path: '/recommender/recommend',
  method: 'POST'
});

// In apiService.js

export const getResourceRecommendations = (diagnosis) => {
  return request({
    path: `/recommender/resources/${diagnosis || 'General'}`,
    method: 'GET',
    auth: true
  });
};

export const getPatientTriageSummary = () => request({
  path: '/recommender/triage'
});

export const getPsychologistPatientSummary = (patientId) => request({
  path: `/recommender/psychologist-summary/${patientId}`
});

// ─── Profile Functions ──────────────────────────────────

export const updateProfile = (payload) => request({
  path: '/profile',
  method: 'PUT',
  body: payload
});

export const getProfile = () => request({
  path: '/profile'
});

export const uploadProfileImage = (formData) => {
  // For multipart/form-data uploads
  return fetch(`${API_BASE_URL}/profile/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AsyncStorage.getItem(AUTH_TOKEN_KEY)}`,
    },
    body: formData,
  }).then(response => response.json());
};

// ─── Booking Functions ──────────────────────────────────

export const getAvailability = (psychiatristId, days = 7) => request({
  path: `/sessions/psychiatrist/availability/${psychiatristId}?days=${days}`
});

export const getPsychiatristProfile = (id) => request({
  path: `/sessions/psychiatrist/${id}`
});
// ─── Twilio Functions ───────────────────────────────────

export const fetchTwilioVideoToken = (payload) => request({
  path: '/twilio/video-token',
  method: 'POST',
  body: payload
});

export const fetchTwilioConversationToken = (payload) => request({
  path: '/twilio/conversations-token',
  method: 'POST',
  body: payload
});
// app/utils/apiService.js - Add these functions

// ─── Password Reset Functions ──────────────────────────────────

export const requestPasswordReset = (payload) => request({
  path: '/password-reset/request',
  method: 'POST',
  body: payload,
  auth: false
});

export const verifyResetToken = (token, role) => request({
  path: `/password-reset/verify?token=${token}&role=${role}`,
  method: 'GET',
  auth: false
});

export const resetPassword = (payload) => request({
  path: '/password-reset/reset',
  method: 'POST',
  body: payload,
  auth: false
});