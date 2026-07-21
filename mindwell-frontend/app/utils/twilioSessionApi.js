// app/utils/twilioSessionApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.10.8:3000/api'; // Make sure this matches your apiConfig

const AUTH_TOKEN_KEY = 'mindwell_auth_token';

export async function fetchTwilioVideoToken({ identity, roomName, sessionType }) {
  try {
    // Get the auth token
    const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    
    console.log('🎥 Fetching Twilio video token for:', { identity, roomName, sessionType });
    console.log('🔑 Auth token present:', !!authToken);

    const response = await fetch(`${API_BASE_URL}/twilio/video-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ identity, roomName, sessionType }),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error response:', errorData);
      throw new Error(errorData.message || 'Unable to fetch Twilio video token');
    }

    const data = await response.json();
    console.log('✅ Token response:', data);
    return data;

  } catch (error) {
    console.error('❌ fetchTwilioVideoToken error:', error);
    throw error;
  }
}

export async function fetchTwilioConversationToken({ identity, conversationUniqueName }) {
  try {
    const authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    console.log('💬 Fetching Twilio conversation token for:', { identity, conversationUniqueName });

    const response = await fetch(`${API_BASE_URL}/twilio/conversations-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ identity, conversationUniqueName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error response:', errorData);
      throw new Error(errorData.message || 'Unable to fetch Twilio conversation token');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('❌ fetchTwilioConversationToken error:', error);
    throw error;
  }
}