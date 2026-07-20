// app/utils/twilioSessionApi.js
import { request } from './apiService';

export const fetchTwilioVideoToken = (payload) => {
  console.log('[Twilio] Fetching video token for:', payload);
  return request({
    path: '/twilio/video-token',
    method: 'POST',
    body: payload
  });
};