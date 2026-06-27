const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

class AIClient {
  /**
   * Full analysis: Diagnosis + Sentiment + Severity
   */
  async analyzeText(text, userId = null) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/analyze`, {
        text: text,
        user_id: userId
      });
      
      return {
        success: true,
        diagnosis: response.data.diagnosis,
        confidence: response.data.confidence,
        top3: response.data.top3 || [],
        severity: response.data.severity || 5,
        normalizedText: response.data.normalized_text
      };
    } catch (error) {
      console.error('AI Service error:', error.message);
      return {
        success: false,
        error: 'AI service unavailable',
        diagnosis: null,
        confidence: 0,
        severity: 5
      };
    }
  }

  /**
   * Diagnosis only (faster)
   */
  async getDiagnosis(text) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/diagnosis`, {
        text: text
      });
      
      return {
        success: true,
        diagnosis: response.data.diagnosis,
        confidence: response.data.confidence,
        normalizedText: response.data.normalized_text
      };
    } catch (error) {
      console.error('Diagnosis service error:', error.message);
      return {
        success: false,
        error: 'Diagnosis service unavailable',
        diagnosis: null,
        confidence: 0
      };
    }
  }

  /**
   * Sentiment/Emotion analysis only
   */
  async getSentiment(text) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/sentiment`, {
        text: text
      });
      
      return {
        success: true,
        emotion: response.data.emotion,
        confidence: response.data.confidence,
        severityScore: response.data.severity_score,
        normalizedText: response.data.normalized_text
      };
    } catch (error) {
      console.error('Sentiment service error:', error.message);
      return {
        success: false,
        error: 'Sentiment service unavailable',
        emotion: null,
        severityScore: 5
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`);
      return response.data;
    } catch (error) {
      return { status: 'unavailable', model_loaded: false };
    }
  }
}

module.exports = new AIClient();