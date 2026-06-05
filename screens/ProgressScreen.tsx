import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profileStore';
import Card from '../components/Card';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_WIDTH = (SCREEN_WIDTH - 64) / 7 - 8;

interface DayCalorie {
  date: string;
  kcal: number;
  label: string;
}

interface WeightEntry {
  date: string;
  weight_kg: number;
}

export default function ProgressScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile } = useProfileStore();
  const [weekData, setWeekData] = useState<DayCalorie[]>([]);
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const days: DayCalorie[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const { data } = await supabase
        .from('food_log')
        .select('kcal')
        .eq('user_id', user.id)
        .eq('date', dateStr);
      const total = (data ?? []).reduce((s: number, r: { kcal: number }) => s + r.kcal, 0);
      days.push({ date: dateStr, kcal: total, label: d.toLocaleDateString('en-US', { weekday: 'short' }) });
    }
    setWeekData(days);

    const { data: weights } = await supabase
      .from('body_weight_log')
      .select('date, weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(30);
    if (weights) setWeightData(weights as WeightEntry[]);
  };

  const maxKcal = Math.max(...weekData.map((d) => d.kcal), profile?.calorie_target ?? 2000);
  const chartH = 120;

  const getBarColor = (kcal: number) => {
    const target = profile?.calorie_target ?? 2000;
    if (kcal === 0) return theme.border;
    if (kcal <= target * 0.95) return theme.success;
    if (kcal <= target * 1.05) return '#FF9800';
    return theme.error;
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, justifyContent: 'center' },
    barLabel: { fontSize: 10, textAlign: 'center', marginTop: 4 },
    weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    weightDate: { fontSize: 14, color: theme.muted },
    weightVal: { fontSize: 14, fontWeight: '600', color: theme.text },
    legendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: theme.muted },
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}><Text style={s.title}>Progress</Text></View>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Weekly Calories</Text>
          <Svg width={SCREEN_WIDTH - 64} height={chartH + 30}>
            {weekData.map((day, i) => {
              const barH = maxKcal > 0 ? Math.max((day.kcal / maxKcal) * chartH, 4) : 4;
              const x = i * (BAR_WIDTH + 8);
              const y = chartH - barH;
              return (
                <React.Fragment key={day.date}>
                  <Rect x={x} y={y} width={BAR_WIDTH} height={barH} rx={4} fill={getBarColor(day.kcal)} />
                  <SvgText x={x + BAR_WIDTH / 2} y={chartH + 20} textAnchor="middle" fill={theme.muted} fontSize={10}>
                    {day.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
          <View style={s.legendRow}>
            {[['Under target', theme.success], ['On track', '#FF9800'], ['Over target', theme.error]].map(([label, color]) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Body Weight</Text>
          {weightData.length === 0 ? (
            <Text style={{ color: theme.muted, fontSize: 14 }}>No weight entries yet.</Text>
          ) : (
            weightData.slice(-7).map((entry) => (
              <View key={entry.date} style={s.weightRow}>
                <Text style={s.weightDate}>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                <Text style={s.weightVal}>{entry.weight_kg} kg</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
