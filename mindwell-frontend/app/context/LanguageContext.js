import React, { createContext, useState, useContext } from 'react';
import { getTranslation } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(null);
  const [languageSelected, setLanguageSelected] = useState(false);
  const t = getTranslation(language || 'en');
  const isRTL = language === 'ur' || language === 'ar';

  const selectLanguage = (lang) => {
    setLanguage(lang);
    setLanguageSelected(true);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: selectLanguage, t, languageSelected, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);