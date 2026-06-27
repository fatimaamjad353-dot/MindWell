import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatLogs } from './chatStorage';
import { getMoodLogs } from './moodStorage';

const SUMMARY_CONSENT_KEY = '@mindwell/share-summary-consent';

const themeRules = [
  { key: 'anxiety', label: 'Anxiety', words: ['anxious', 'anxiety', 'panic', 'worry', 'worried', 'overwhelmed'] },
  { key: 'depression', label: 'Low mood', words: ['sad', 'depressed', 'hopeless', 'lonely', 'terrible', 'low'] },
  { key: 'stress', label: 'Stress', words: ['stress', 'stressed', 'work', 'pressure', 'burnout'] },
  { key: 'sleep', label: 'Sleep difficulties', words: ['sleep', 'insomnia', 'tired', 'night', 'rest'] },
  { key: 'trauma', label: 'Trauma support', words: ['trauma', 'flashback', 'fear', 'unsafe'] },
  { key: 'family', label: 'Relationship or family concerns', words: ['family', 'relationship', 'partner', 'parents', 'friends'] },
];

const unique = values => [...new Set(values.filter(Boolean))];

export async function getSummaryConsent() {
  try {
    return (await AsyncStorage.getItem(SUMMARY_CONSENT_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setSummaryConsent(enabled) {
  await AsyncStorage.setItem(SUMMARY_CONSENT_KEY, enabled ? 'true' : 'false');
  return enabled;
}

function detectThemes(moodLogs, chatLogs) {
  const text = [
    ...moodLogs.map(log => `${log.mood || ''} ${log.note || ''} ${(log.activities || []).join(' ')}`),
    ...chatLogs.filter(log => log.sender === 'user').map(log => `${log.intent || ''} ${log.text || ''}`),
  ].join(' ').toLowerCase();

  const themes = themeRules
    .filter(rule => rule.words.some(word => text.includes(word)))
    .map(rule => rule.label);

  if (!themes.length && moodLogs.some(log => log.score <= 3)) {
    themes.push('Low mood');
  }

  return unique(themes);
}

function getRecommendedSpecialties(themes, riskScore) {
  const specialties = [];
  if (themes.includes('Anxiety') || themes.includes('Low mood')) specialties.push('Anxiety & Depression');
  if (themes.includes('Stress') || themes.includes('Trauma support')) specialties.push('Stress & Trauma');
  if (themes.includes('Relationship or family concerns')) specialties.push('Relationship & Family');
  if (themes.includes('Sleep difficulties')) specialties.push('Sleep & Anxiety');
  if (riskScore >= 7) specialties.unshift('Crisis-informed care');
  return unique(specialties.length ? specialties : ['General mental wellness']);
}

export async function getPatientClinicalSummary() {
  const [moodLogs, chatLogs, consentGranted] = await Promise.all([
    getMoodLogs(),
    getChatLogs(),
    getSummaryConsent(),
  ]);

  const recentMoods = moodLogs.slice(0, 7);
  const moodAverage = recentMoods.length
    ? recentMoods.reduce((sum, log) => sum + Number(log.score || 0), 0) / recentMoods.length
    : null;
  const lowMoodCount = recentMoods.filter(log => Number(log.score || 0) <= 3).length;
  const crisisCount = chatLogs.filter(log => log.isCrisis).length;
  const themes = detectThemes(recentMoods, chatLogs.slice(0, 20));

  const moodRisk = moodAverage === null ? 4 : Math.max(0, 10 - moodAverage);
  const riskScore = Math.min(10, Number((moodRisk + lowMoodCount * 0.8 + crisisCount * 1.5).toFixed(1)));
  const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 4 ? 'medium' : 'low';
  const latestMood = recentMoods[0];
  const userMessages = chatLogs.filter(log => log.sender === 'user');

  const summaryPoints = [
    moodAverage === null
      ? 'No mood logs have been recorded yet.'
      : `Recent mood average is ${moodAverage.toFixed(1)}/10 across ${recentMoods.length} check-ins.`,
    lowMoodCount > 0
      ? `${lowMoodCount} recent mood check-in${lowMoodCount === 1 ? '' : 's'} were low.`
      : 'Recent mood scores do not show repeated low mood.',
    themes.length
      ? `Main detected themes: ${themes.join(', ')}.`
      : 'No strong clinical theme has been detected yet.',
    userMessages[0]?.text
      ? `Latest chat signal: "${userMessages[0].text.slice(0, 90)}${userMessages[0].text.length > 90 ? '...' : ''}"`
      : 'No patient chat entries have been shared yet.',
  ];

  return {
    consentGranted,
    generatedAt: new Date().toISOString(),
    riskScore,
    riskLevel,
    moodAverage,
    latestMood,
    moodLogs: recentMoods,
    chatLogs: chatLogs.slice(0, 10),
    themes,
    summaryPoints,
    recommendedSpecialties: getRecommendedSpecialties(themes, riskScore),
  };
}
