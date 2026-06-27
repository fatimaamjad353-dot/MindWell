// src/models/Chatbot.js
const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  patientName: { 
    type: String, 
    default: '' 
  },
  chat_text: { 
    type: String, 
    required: true 
  },
  greeting: { 
    type: String, 
    default: '' 
  },
  intent_recognition: { 
    type: String, 
    default: 'general' 
  },
  riskLevel: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Low' 
  },
  escalatedToHuman: { 
    type: Boolean, 
    default: false 
  },
  language: { 
    type: String, 
    enum: ['english', 'arabic', 'roman_urdu'], 
    default: 'english' 
  },
  usedFAQ: { 
    type: Boolean, 
    default: false 
  },
  messages: [{
    sender: { 
      type: String, 
      enum: ['patient', 'ai'], 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  endedAt: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Chatbot', chatbotSchema);