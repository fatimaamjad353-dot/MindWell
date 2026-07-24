// app/utils/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Update this URL when ngrok restarts
export const API_BASE_URL = 'https://sliver-landslide-coping.ngrok-free.dev/api';
export const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const AUTH_TOKEN_KEY = 'mindwell_auth_token';
const USER_KEY = 'mindwell_user';
const ROLE_KEY = 'mindwell_user_role';

// ─── Auth Token Helpers ───────────────────────────────────────
export const setAuthToken = async (token) => {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getAuthToken = async () => {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

// ✅ Alias used by AdminScreen
export const getStoredToken = async () => {
  return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(ROLE_KEY);
};

export const setCurrentUser = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user?.role) {
    await AsyncStorage.setItem(ROLE_KEY, user.role);
  }
};

export const getCurrentUser = async () => {
  const user = await AsyncStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

// ─── Core Request Function ────────────────────────────────────
export const request = async ({ path, method = 'GET', body = null, isFormData = false }) => {
  const url = buildApiUrl(path);
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'ngrok-skip-browser-warning': 'true',
  };

  const options = {
    method,
    headers,
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  };

  console.log(`[API][${method}] ${path}`, body ? (isFormData ? '[FormData]' : body) : {});

  try {
    const response = await fetch(url, options);
    const text = await response.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Server returned non-JSON: ${text.slice(0, 100)}`);
    }

    console.log(
      `[API][${method}] ${path} -> ${response.status}`,
      JSON.stringify(json).slice(0, 300)
    );

    if (!response.ok) {
      throw new Error(json?.message || `HTTP ${response.status}`);
    }

    return json;

  } catch (error) {
    console.log(`[API][${method}] ${path} ERROR`, error.message);
    throw error;
  }
};

// ─── Auth ─────────────────────────────────────────────────────
export const loginPatient = (data) =>
  request({ path: '/auth/patient/login', method: 'POST', body: data });
export const registerPatient = (data) =>
  request({ path: '/auth/patient/register', method: 'POST', body: data });
export const loginPsychiatrist = (data) =>
  request({ path: '/auth/psychiatrist/login', method: 'POST', body: data });
export const registerPsychiatrist = (data) =>
  request({ path: '/auth/psychiatrist/register', method: 'POST', body: data });
export const loginAdmin = (data) =>
  request({ path: '/auth/admin/login', method: 'POST', body: data });
export const registerAdmin = (data) =>
  request({ path: '/auth/admin/register', method: 'POST', body: data });

// ─── OTP (Registration email verification) ────────────────────
export const sendOTP = (data) =>
  request({ path: '/auth/send-otp', method: 'POST', body: data });
export const verifyOTP = (data) =>
  request({ path: '/auth/verify-otp', method: 'POST', body: data });
export const resendOTP = (data) =>
  request({ path: '/auth/send-otp', method: 'POST', body: data });

// ─── Password Reset ───────────────────────────────────────────
export const requestPasswordReset = (data) =>
  request({ path: '/password-reset/request', method: 'POST', body: data });

// ✅ Used by ResetPasswordScreen — verifies token via GET
export const verifyResetToken = (token, role) =>
  request({ path: `/password-reset/verify?token=${token}&role=${role}` });

// ✅ Used by ResetPasswordScreen — resets password
export const resetPassword = (data) =>
  request({ path: '/password-reset/reset', method: 'POST', body: data });

export const verifyResetOTP = (data) =>
  request({ path: '/password-reset/verify-otp', method: 'POST', body: data });

// ─── Mood ─────────────────────────────────────────────────────
export const logMood = (data) =>
  request({ path: '/mood/log', method: 'POST', body: data });

// ✅ Alias used by MoodLogScreen and PatientDashboard
export const logMoodEntry = (data) =>
  request({ path: '/mood/log', method: 'POST', body: data });

export const getAllMoods = () =>
  request({ path: '/mood/all' });

// ✅ Alias used by PatientDashboard and ProgressScreen
export const getMoodEntries = () =>
  request({ path: '/mood/all' });

export const getTodayMood = () =>
  request({ path: '/mood/today' });
export const getWeeklySummary = () =>
  request({ path: '/mood/weekly' });
export const getMonthlySummary = () =>
  request({ path: '/mood/monthly' });
export const deleteMood = (id) =>
  request({ path: `/mood/${id}`, method: 'DELETE' });

// ─── AI Chat ──────────────────────────────────────────────────
export const sendChatMessage = (data) =>
  request({ path: '/ai/chat', method: 'POST', body: data });
export const getChatHistory = () =>
  request({ path: '/ai/history' });
export const getRiskScore = () =>
  request({ path: '/ai/risk-score' });

// ─── Sessions ─────────────────────────────────────────────────
export const searchTherapists = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request({ path: `/sessions/search${query ? `?${query}` : ''}` });
};
export const bookSessionApi = (data) =>
  request({ path: '/sessions/book', method: 'POST', body: data });
export const getMySessions = () =>
  request({ path: '/sessions/my' });
export const cancelSessionApi = (id) =>
  request({ path: `/sessions/cancel/${id}`, method: 'DELETE' });
export const rateSessionApi = (id, data) =>
  request({ path: `/sessions/rate/${id}`, method: 'POST', body: data });
export const getPsychiatristAvailability = (id, days = 7) =>
  request({ path: `/sessions/psychiatrist/availability/${id}?days=${days}` });

// ─── Payments ─────────────────────────────────────────────────
export const createPaymentIntentApi = (data) =>
  request({ path: '/payments/create-intent', method: 'POST', body: data });
export const confirmPaymentApi = (data) =>
  request({ path: '/payments/confirm', method: 'POST', body: data });
export const getMyPayments = () =>
  request({ path: '/payments/my-payments' });

// ─── Recommender ──────────────────────────────────────────────
export const getRecommendations = () =>
  request({ path: '/ai/recommender/recommend', method: 'POST' });
export const getTriageSummary = () =>
  request({ path: '/ai/recommender/triage' });
export const getSelfCareResources = (diagnosis) =>
  request({ path: `/ai/recommender/resources/${encodeURIComponent(diagnosis)}` });
export const getPsychologistPatientSummary = (patientId) => {
  console.log('📞 Calling psychologist-summary for patientId:', patientId);
  return request({ path: `/ai/recommender/psychologist-summary/${patientId}` });
};

// ─── Psychiatrist Dashboard ───────────────────────────────────
export const getPsychiatristDashboard = () =>
  request({ path: '/psychiatrist/dashboard' });
export const getPsychiatristSessions = (status) =>
  request({ path: `/psychiatrist/sessions${status ? `?status=${status}` : ''}` });
export const getPsychiatristPendingRequests = () =>
  request({ path: '/psychiatrist/sessions/pending' });

// ✅ Alias used by PsychAppointmentsScreen
export const getPendingRequests = () =>
  request({ path: '/psychiatrist/sessions/pending' });

export const confirmSessionApi = (id, data) =>
  request({ path: `/psychiatrist/sessions/${id}/confirm`, method: 'PATCH', body: data });
export const rejectSessionApi = (id) =>
  request({ path: `/psychiatrist/sessions/${id}/reject`, method: 'PATCH' });
export const completeSessionApi = (id) =>
  request({ path: `/psychiatrist/sessions/${id}/complete`, method: 'PATCH' });
export const getPsychiatristPatients = () =>
  request({ path: '/psychiatrist/patients' });
export const getPsychiatristEarnings = () =>
  request({ path: '/psychiatrist/earnings' });
export const getPsychiatristFeedback = () =>
  request({ path: '/psychiatrist/feedback' });

// ─── Admin ────────────────────────────────────────────────────
export const getAdminDashboard = () =>
  request({ path: '/admin/dashboard' });
export const getAllPatients = () =>
  request({ path: '/admin/patients' });
export const getAllPsychiatrists = () =>
  request({ path: '/admin/psychiatrists' });
export const getPendingPsychiatrists = () =>
  request({ path: '/admin/psychiatrists/pending' });
export const verifyPsychiatrist = (id) =>
  request({ path: `/admin/psychiatrists/verify/${id}`, method: 'PUT' });
export const suspendPatient = (id) =>
  request({ path: `/admin/patients/suspend/${id}`, method: 'PUT' });
export const suspendPsychiatrist = (id) =>
  request({ path: `/admin/psychiatrists/suspend/${id}`, method: 'PUT' });
export const getAllSessions = () =>
  request({ path: '/admin/sessions' });
export const getAllPayments = () =>
  request({ path: '/admin/payments' });

// ─── Consent ──────────────────────────────────────────────────
export const getConsent = () =>
  request({ path: '/auth/patient/consent' });
export const updateConsent = (consent) =>
  request({ path: '/auth/patient/consent', method: 'PATCH', body: { consent } });

// ─── Patient Profile (uses real DB) ───────────────────────────
export const getPatientProfile = () =>
  request({ path: '/auth/patient/profile' });
export const updatePatientProfile = (data) =>
  request({ path: '/auth/patient/profile', method: 'PUT', body: data });
// ─── Twilio ───────────────────────────────────────────────────
export const getTwilioToken = (data) =>
  request({ path: '/twilio/token', method: 'POST', body: data });