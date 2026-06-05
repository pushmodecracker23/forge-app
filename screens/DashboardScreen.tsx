import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import AnimatedRing from '../components/AnimatedRing';
import MacroBar from '../components/MacroBar';
import Card from '../components/Card';
import { FoodLog } from '../types/database';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function dateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (formatDate(date) === formatDate(today)) return 'Today';
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';
  if (formatDate(date) === formatDate(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { todayLogs, setTodayLogs } = useFoodStore();
  const { profile } = useProfileStore();
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateLogs, setDateLogs] = useState<FoodLog[]>([]);

  const isToday = formatDate(currentDate) === formatDate(new Date());

  const loadLogs = useCallback(async (date: Date) => {
    if (!user) return;
    const { data } = await supabase
      .from('food_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formatDate(date))
      .order('created_at', { ascending: false });
    const logs = (data ?? []) as FoodLog[];
    setDateLogs(logs);
    if (isToday) setTodayLogs(logs);
  }, [user, isToday]);

  useEffect(() => { loadLogs(currentDate); }, [currentDate, user]);

  const changeDay = (delta: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -40) changeDay(1);
      else if (g.dx > 40) changeDay(-1);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs(currentDate);
    setRefreshing(false);
  };

  const logs = dateLogs;
  const totalKcal = logs.reduce((s, l) => s + l.kcal, 0);
  const totalProtein = logs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = logs.reduce((s, l) => s + l.fat, 0);
  const calorieTarget = profile?.calorie_target ?? 2000;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
    greeting: { fontSize: 18, fontWeight: '700', color: theme.text },
    subGreeting: { fontSize: 13, color: theme.muted, marginTop: 2 },
    dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 16 },
    navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    navBtnText: { fontSize: 16, color: theme.text },
    dateLabel: { fontSize: 17, fontWeight: '700', color: theme.text, minWidth: 140, textAlign: 'center' },
    todayBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.accent + '20' },
    todayBtnText: { fontSize: 12, fontWeight: '700', color: theme.accent },
    ringSection: { alignItems: 'center', paddingVertical: 8 },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    statChip: { backgroundColor: theme.surface2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.border },
    statText: { fontSize: 12, color: theme.muted, fontWeight: '500' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 10 },
    logItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    logLeft: { flex: 1 },
    logName: { fontSize: 14, fontWeight: '600', color: theme.text },
    logMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    logKcal: { fontSize: 14, fontWeight: '700', color: theme.accent },
    emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
    temptBtn: {
      margin: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
      borderRadius: 14, padding: 14, alignItems: 'center',
    },
    temptText: { color: theme.muted, fontSize: 14 },
    mealBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: theme.surface2, marginLeft: 6 },
    mealBadgeText: { fontSize: 10, color: theme.muted, textTransform: 'capitalize' },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hey, {profile?.name ?? 'Athlete'} 👊</Text>
          <Text style={s.subGreeting}>Let's make today count</Text>
        </View>
      </View>

      {/* Date navigation */}
      <View style={s.dateNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => changeDay(-1)}>
          <Text style={s.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.dateLabel}>{dateLabel(currentDate)}</Text>
        <TouchableOpacity style={s.navBtn} onPress={() => changeDay(1)}>
          <Text style={s.navBtnText}>›</Text>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity style={s.todayBtn} onPress={() => setCurrentDate(new Date())}>
            <Text style={s.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        {...panResponder.panHandlers}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Calorie Ring */}
        <View style={s.ringSection}>
          <AnimatedRing eaten={totalKcal} target={calorieTarget} burned={0} />
          <View style={s.statsRow}>
            <View style={s.statChip}><Text style={s.statText}>🍽 {totalKcal} eaten</Text></View>
            <View style={s.statChip}><Text style={s.statText}>🎯 {calorieTarget} target</Text></View>
          </View>
        </View>

        {/* Macros */}
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Macros</Text>
          <MacroBar label="Protein" current={Math.round(totalProtein)} target={profile?.protein_target ?? 150} color={theme.protein} />
          <MacroBar label="Carbs" current={Math.round(totalCarbs)} target={profile?.carbs_target ?? 200} color={theme.carbs} />
          <MacroBar label="Fat" current={Math.round(totalFat)} target={profile?.fat_target ?? 65} color={theme.fat} />
        </Card>

        {/* Food log */}
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>
            {isToday ? "Today's Food" : `Food on ${dateLabel(currentDate)}`}
          </Text>
          {logs.length === 0 ? (
            <Text style={s.emptyText}>{isToday ? 'No food logged yet. Add something!' : 'Nothing logged on this day.'}</Text>
          ) : (
            logs.map(log => (
              <View key={log.id} style={s.logItem}>
                <View style={s.logLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={s.logName}>{log.food_name}</Text>
                    <View style={s.mealBadge}><Text style={s.mealBadgeText}>{log.meal_type}</Text></View>
                  </View>
                  <Text style={s.logMeta}>P {log.protein}g · C {log.carbs}g · F {log.fat}g · {log.serving_g}g</Text>
                </View>
                <Text style={s.logKcal}>{log.kcal}</Text>
              </View>
            ))
          )}
        </Card>

        <TouchableOpacity style={s.temptBtn} onPress={() => navigation.navigate('Motivation')}>
          <Text style={s.temptText}>🧠 Feeling tempted? Tap here.</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
