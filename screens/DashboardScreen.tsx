import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';
import Card from '../components/Card';
import { FoodLog } from '../types/database';

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { todayLogs, setTodayLogs } = useFoodStore();
  const { profile } = useProfileStore();
  const [refreshing, setRefreshing] = useState(false);
  const [kcalBurned, setKcalBurned] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const loadTodayLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('food_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: false });
    if (data) setTodayLogs(data as FoodLog[]);
  };

  useEffect(() => {
    loadTodayLogs();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayLogs();
    setRefreshing(false);
  };

  const totalKcal = todayLogs.reduce((s, l) => s + l.kcal, 0);
  const totalProtein = todayLogs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = todayLogs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = todayLogs.reduce((s, l) => s + l.fat, 0);

  const calorieTarget = profile?.calorie_target ?? 2000;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    greeting: { fontSize: 22, fontWeight: '700', color: theme.text },
    date: { fontSize: 13, color: theme.muted, marginTop: 2 },
    ringSection: { alignItems: 'center', paddingVertical: 16 },
    burnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    burnChip: { backgroundColor: theme.surface2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    burnText: { fontSize: 13, color: theme.muted },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
    logItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logName: { fontSize: 14, color: theme.text, flex: 1 },
    logKcal: { fontSize: 14, color: theme.muted, fontWeight: '600' },
    temptBtn: {
      margin: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    temptText: { color: theme.muted, fontSize: 14 },
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hey, {profile?.name ?? 'Athlete'} 👊</Text>
            <Text style={s.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>

        <View style={s.ringSection}>
          <CalorieRing eaten={totalKcal} target={calorieTarget} burned={kcalBurned} />
          <View style={s.burnRow}>
            <View style={s.burnChip}>
              <Text style={s.burnText}>🔥 {totalKcal} eaten</Text>
            </View>
            <View style={s.burnChip}>
              <Text style={s.burnText}>⚡ {kcalBurned} burned</Text>
            </View>
          </View>
        </View>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Macros</Text>
          <MacroBar label="Protein" current={Math.round(totalProtein)} target={profile?.protein_target ?? 150} color={theme.protein} />
          <MacroBar label="Carbs" current={Math.round(totalCarbs)} target={profile?.carbs_target ?? 200} color={theme.carbs} />
          <MacroBar label="Fat" current={Math.round(totalFat)} target={profile?.fat_target ?? 65} color={theme.fat} />
        </Card>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Today's Food</Text>
          {todayLogs.length === 0 ? (
            <Text style={{ color: theme.muted, fontSize: 14 }}>No food logged yet. Add something!</Text>
          ) : (
            todayLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={s.logItem}>
                <Text style={s.logName}>{log.food_name}</Text>
                <Text style={s.logKcal}>{log.kcal} kcal</Text>
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
