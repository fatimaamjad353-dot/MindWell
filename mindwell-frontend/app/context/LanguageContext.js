// app/context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

const LANGUAGE_KEY = 'mindwell_language';

// ─── Translations ──────────────────────────────────────────────────
const translations = {
  en: {
    welcomeDoctor: 'Welcome, Dr.',
    hello: 'Hello',
    // ... all your translations
  },
  ur: {
    welcomeDoctor: 'خوش آمدید، ڈاکٹر',
    hello: 'ہیلو',
    // ... all your translations
  },
  ar: {
    welcomeDoctor: 'مرحباً دكتور',
    hello: 'مرحباً',
    // ... all your translations
  }
};

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

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const value = {
    language,
    setLanguage: saveLanguage,
    languageSelected,
    t,
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