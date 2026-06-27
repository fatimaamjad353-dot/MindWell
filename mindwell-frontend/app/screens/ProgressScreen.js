import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMoodEntries } from '../utils/apiService';

const FILTERS = [
  { key: 'week', label: '7 Days', days: 7 },
  { key: 'month', label: '30 Days', days: 30 },
  { key: 'all', label: 'All', days: null }
];

const dayKey = date => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const formatDate = date =>
  new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

const formatTime = date =>
  new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });

function calculateStreak(logs) {
  const dates = [...new Set(logs.map(log => dayKey(log.createdAt)))].sort().reverse();
  if (!dates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(`${dates[0]}T00:00:00`);
  const gap = Math.round((today - latest) / 86400000);
  if (gap > 1) return 0;

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const newer = new Date(`${dates[index - 1]}T00:00:00`);
    const older = new Date(`${dates[index]}T00:00:00`);
    if (Math.round((newer - older) / 86400000) !== 1) break;
    streak += 1;
  }
  return streak;
}

export default function ProgressScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadLogs = async () => {
        setLoading(true);
        const response = await getMoodEntries();
        const savedLogs = (response?.data || []).map(entry => ({
          id: entry._id || entry.id,
          score: entry.moodScore,
          mood: entry.moodType,
          emoji: entry.moodType === 'Amazing' ? '😄' : entry.moodType === 'Good' ? '🙂' : entry.moodType === 'Okay' ? '😐' : entry.moodType === 'Low' ? '😔' : '😢',
          color: entry.moodType === 'Amazing' ? '#4CAF50' : entry.moodType === 'Good' ? '#8BC34A' : entry.moodType === 'Okay' ? '#FFC107' : entry.moodType === 'Low' ? '#FF9800' : '#F44336',
          note: entry.notes,
          activities: entry.activities || [],
          createdAt: entry.timestamp || entry.createdAt
        }));
        if (active) {
          setLogs(savedLogs);
          setLoading(false);
        }
      };

      loadLogs();
      return () => {
        active = false;
      };
    }, [])
  );

  const filteredLogs = useMemo(() => {
    const selected = FILTERS.find(item => item.key === filter);
    if (!selected?.days) return logs;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (selected.days - 1));
    return logs.filter(log => new Date(log.createdAt) >= cutoff);
  }, [filter, logs]);

  const dailyData = useMemo(() => {
    const grouped = {};

    filteredLogs.forEach(log => {
      const key = dayKey(log.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    return Object.entries(grouped)
      .map(([date, entries]) => ({
        date,
        score: entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length,
        emoji: entries[0].emoji
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-7);
  }, [filteredLogs]);

  const groupedHistory = useMemo(() => {
    return filteredLogs.reduce((groups, log) => {
      const key = dayKey(log.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
      return groups;
    }, {});
  }, [filteredLogs]);

  const average = filteredLogs.length
    ? (filteredLogs.reduce((sum, log) => sum + log.score, 0) / filteredLogs.length).toFixed(1)
    : '—';
  const streak = calculateStreak(logs);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mood Progress</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MoodLog')}>
          <Text style={styles.add}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterBtn, filter === item.key && styles.filterBtnActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#6C63FF" />
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{average}</Text>
              <Text style={styles.statLabel}>Average Mood</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{filteredLogs.length}</Text>
              <Text style={styles.statLabel}>Mood Logs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Mood Graph</Text>
            {dailyData.length ? (
              <View style={styles.chart}>
                {dailyData.map(day => (
                  <View key={day.date} style={styles.barWrapper}>
                    <Text style={styles.barEmoji}>{day.emoji}</Text>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(day.score * 10, 8)}%`,
                            backgroundColor:
                              day.score >= 7
                                ? '#1D9E75'
                                : day.score >= 5
                                  ? '#FFC107'
                                  : '#FF6B6B'
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.barScore}>{day.score.toFixed(1)}</Text>
                    <Text style={styles.barDay}>
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>No mood data yet</Text>
                <Text style={styles.emptyText}>Log your mood to start building this graph.</Text>
                <TouchableOpacity
                  style={styles.logBtn}
                  onPress={() => navigation.navigate('MoodLog')}
                >
                  <Text style={styles.logBtnText}>Log Mood</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Complete Mood History</Text>
            <Text style={styles.historyHint}>
              Tap an entry to reopen its note and activities.
            </Text>

            {Object.entries(groupedHistory).map(([date, entries]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateTitle}>{formatDate(`${date}T00:00:00`)}</Text>
                {entries.map(entry => {
                  const expanded = expandedId === entry.id;
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.historyCard}
                      activeOpacity={0.8}
                      onPress={() => setExpandedId(expanded ? null : entry.id)}
                    >
                      <View style={styles.historyTop}>
                        <Text style={styles.historyEmoji}>{entry.emoji}</Text>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyMood}>{entry.mood}</Text>
                          <Text style={styles.historyTime}>{formatTime(entry.createdAt)}</Text>
                        </View>
                        <View style={[styles.scoreBadge, { backgroundColor: `${entry.color || '#6C63FF'}20` }]}>
                          <Text style={[styles.scoreText, { color: entry.color || '#6C63FF' }]}>
                            {entry.score}/10
                          </Text>
                        </View>
                      </View>

                      {expanded && (
                        <View style={styles.details}>
                          <Text style={styles.detailLabel}>Activities</Text>
                          <Text style={styles.detailText}>
                            {entry.activities?.length ? entry.activities.join(' • ') : 'None added'}
                          </Text>
                          <Text style={styles.detailLabel}>Note</Text>
                          <Text style={styles.detailText}>
                            {entry.note || 'No note added'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </>
      )}
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0EFFF' },
  header: { backgroundColor: '#6C63FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50 },
  back: { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  add: { fontSize: 27, lineHeight: 28, color: '#fff', fontWeight: '400' },
  filterRow: { flexDirection: 'row', margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 2 },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  filterBtnActive: { backgroundColor: '#6C63FF' },
  filterText: { color: '#777', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  loader: { marginTop: 80 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#6C63FF' },
  statLabel: { fontSize: 10, color: '#777', marginTop: 4, textAlign: 'center' },
  chartSection: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 190, paddingTop: 12 },
  barWrapper: { alignItems: 'center', flex: 1, maxWidth: 48 },
  barEmoji: { fontSize: 17, marginBottom: 5 },
  barBg: { width: 26, height: 105, backgroundColor: '#F0EFFF', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barScore: { fontSize: 11, fontWeight: '700', color: '#333', marginTop: 5 },
  barDay: { fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' },
  emptyChart: { alignItems: 'center', paddingVertical: 22 },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText: { fontSize: 13, color: '#777', marginTop: 4, textAlign: 'center' },
  logBtn: { backgroundColor: '#6C63FF', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10, marginTop: 14 },
  logBtnText: { color: '#fff', fontWeight: '700' },
  historySection: { paddingHorizontal: 16 },
  historyHint: { color: '#777', fontSize: 12, marginBottom: 14 },
  dateGroup: { marginBottom: 16 },
  dateTitle: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2 },
  historyTop: { flexDirection: 'row', alignItems: 'center' },
  historyEmoji: { fontSize: 31, marginRight: 12 },
  historyInfo: { flex: 1 },
  historyMood: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  historyTime: { fontSize: 12, color: '#888', marginTop: 3 },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  scoreText: { fontSize: 12, fontWeight: '700' },
  details: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 12, paddingTop: 12 },
  detailLabel: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#444', lineHeight: 19, marginBottom: 10 },
  bottomSpace: { height: 30 }
});
