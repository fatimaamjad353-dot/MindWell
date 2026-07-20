// src/controllers/twilio.controller.js
const twilio = require('twilio');

// Initialize Twilio client with credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

exports.generateVideoToken = async (req, res) => {
  try {
    const { identity, roomName, sessionType } = req.body;

    console.log('🎥 Generating Twilio token for:', { identity, roomName, sessionType });

    if (!identity || !roomName) {
      return res.status(400).json({
        success: false,
        message: 'Identity and room name are required'
      });
    }

    // Check if Twilio credentials are configured
    if (!accountSid || !apiKey || !apiSecret) {
      console.warn('⚠️ Twilio credentials not configured. Using demo mode.');
      
      // Return a demo token for testing
      return res.status(200).json({
        success: true,
        data: {
          token: 'demo-token-' + Date.now(),
          identity: identity,
          roomName: roomName,
          isDemo: true,
          message: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET in .env'
        }
      });
    }

    // Create an access token
    const token = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      {
        identity: identity,
        ttl: 3600 // 1 hour
      }
    );

    // Grant video access to the room
    const videoGrant = new VideoGrant({
      room: roomName
    });

    token.addGrant(videoGrant);

    console.log('✅ Twilio token generated successfully');

    res.status(200).json({
      success: true,
      data: {
        token: token.toJwt(),
        identity: identity,
        roomName: roomName,
        isDemo: false
      }
    });

  } catch (error) {
    console.error('❌ Twilio token generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};