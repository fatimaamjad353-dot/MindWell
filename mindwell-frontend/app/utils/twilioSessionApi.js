import { API_BASE_URL } from './apiConfig';

export async function fetchTwilioVideoToken({ identity, roomName, sessionType }) {
  const response = await fetch(`${API_BASE_URL}/twilio/video-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, roomName, sessionType }),
  });

  if (!response.ok) {
    throw new Error('Unable to fetch Twilio video token');
  }

  return response.json();
}

export async function fetchTwilioConversationToken({ identity, conversationUniqueName }) {
  const response = await fetch(`${API_BASE_URL}/twilio/conversations-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, conversationUniqueName }),
  });

  if (!response.ok) {
    throw new Error('Unable to fetch Twilio conversation token');
  }

  return response.json();
}
