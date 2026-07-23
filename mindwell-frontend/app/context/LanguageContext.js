// app/context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../utils/translations';

const LanguageContext = createContext();
const LANGUAGE_KEY = 'mindwell_language';

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [languageSelected, setLanguageSelected] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved && translations[saved]) {
        setLanguage(saved);
        setLanguageSelected(true);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const saveLanguage = async (lang) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguage(lang);
      setLanguageSelected(true);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // ✅ t is now an OBJECT (translations[language]) not a function
  // This supports both t.aiCoach AND t('aiCoach') usage across screens
  const t = translations[language] || translations['en'];

  const value = {
    language,
    setLanguage: saveLanguage,
    languageSelected,
    t,           // ✅ object — t.aiCoach works
    isRTL: language === 'ar' || language === 'ur',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}