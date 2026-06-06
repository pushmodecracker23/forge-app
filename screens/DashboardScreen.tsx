import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, PanResponder, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import GradientBg from '../components/GradientBg';
import { FoodLog } from '../types/database';
import { getHealthData, getExercises, ExerciseEntry } from '../lib/healthService';
import { Ionicons } from '@expo/vector-icons';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function dateLabel(date: Date): string {
  const today = new Date();
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (formatDate(date) === formatDate(today)) return `Today, ${dateStr}`;
  return dateStr;
}

// ─── Multicolor Calorie Ring ──────────────────────────────────────────────────

interface CalorieRingProps {
  carbs: number;
  protein: number;
  fat: number;
  target: number;
}

function CalorieRing({ carbs, protein, fat, target }: CalorieRingProps) {
  const R = 75;
  const SW = 16;
  const C = 2 * Math.PI * R;
  const SIZE = 180;

  const caloriesEaten = carbs * 4 + protein * 4 + fat * 9;
  const caloriesLeft = Math.max(target - caloriesEaten, 0);
  const fillFraction = Math.min(caloriesEaten / (target || 2000), 1);

  const carbsFrac = caloriesEaten > 0 ? (carbs * 4) / caloriesEaten : 0;
  const proteinFrac = caloriesEaten > 0 ? (protein * 4) / caloriesEaten : 0;
  const fatFrac = caloriesEaten > 0 ? (fat * 9) / caloriesEaten : 0;

  const carbsLen = carbsFrac * fillFraction * C;
  const proteinLen = proteinFrac * fillFraction * C;
  const fatLen = fatFrac * fillFraction * C;

  const carbsStartDeg = -90;
  const proteinStartDeg = -90 + carbsFrac * fillFraction * 360;
  const fatStartDeg = proteinStartDeg + proteinFrac * fillFraction * 360;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background track */}
        <Circle
          cx={90} cy={90} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={SW}
        />
        {/* Carbs arc – cyan */}
        {carbsLen > 0 && (
          <Circle
            cx={90} cy={90} r={R}
            fill="none"
            stroke="#00D4D4"
            strokeWidth={SW}
            strokeDasharray={`${carbsLen} ${C}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${carbsStartDeg} 90 90)`}
          />
        )}
        {/* Protein arc – pink */}
        {proteinLen > 0 && (
          <Circle
            cx={90} cy={90} r={R}
            fill="none"
            stroke="#FF6B9D"
            strokeWidth={SW}
            strokeDasharray={`${proteinLen} ${C}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${proteinStartDeg} 90 90)`}
          />
        )}
        {/* Fat arc – amber */}
        {fatLen > 0 && (
          <Circle
            cx={90} cy={90} r={R}
            fill="none"
            stroke="#FFB800"
            strokeWidth={SW}
            strokeDasharray={`${fatLen} ${C}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${fatStartDeg} 90 90)`}
          />
        )}
      </Svg>
      {/* Center text overlay */}
      <View style={StyleSheet.absoluteFillObject as any} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700', lineHeight: 40 }}>
            {caloriesLeft}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
            {'Calories\nLeft'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Steps Ring (small) ───────────────────────────────────────────────────────

function StepsRing({ steps }: { steps: number }) {
  const R = 22;
  const SW = 5;
  const C = 2 * Math.PI * R;
  const frac = Math.min(steps / 10000, 1);
  const len = frac * C;

  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={R} fill="none" stroke="rgba(255,107,157,0.2)" strokeWidth={SW} />
      {len > 0 && (
        <Circle
          cx={28} cy={28} r={R}
          fill="none"
          stroke="#FF6B9D"
          strokeWidth={SW}
          strokeDasharray={`${len} ${C}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      )}
    </Svg>
  );
}

// ─── Segmented Control ────────────────────────────────────────────────────────

type Tab = 'Macros' | 'Nutrients' | 'Calories';

interface SegmentedControlProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

function SegmentedControl({ active, onChange }: SegmentedControlProps) {
  const tabs: Tab[] = ['Macros', 'Nutrients', 'Calories'];
  return (
    <View style={sc.wrapper}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          style={[sc.pill, active === t && sc.activePill]}
          onPress={() => onChange(t)}
          activeOpacity={0.8}
        >
          <Text style={[sc.label, active === t && sc.activeLabel]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  activePill: {
    backgroundColor: '#1A6FFF',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeLabel: {
    color: '#FFFFFF',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { setTodayLogs } = useFoodStore();
  const { profile } = useProfileStore();

  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateLogs, setDateLogs] = useState<FoodLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Macros');
  const [waterOz, setWaterOz] = useState(0);
  const [steps, setSteps] = useState(0);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);

  const isToday = formatDate(currentDate) === formatDate(new Date());

  // Load food logs for the selected date
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

  // Load health service data once
  useEffect(() => {
    getHealthData().then((d) => {
      setWaterOz(d.waterOz);
      setSteps(d.steps);
    });
    getExercises().then(setExercises);
  }, []);

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

  // Macro totals
  const totalKcal = dateLogs.reduce((s, l) => s + l.kcal, 0);
  const totalProtein = dateLogs.reduce((s, l) => s + l.protein, 0);
  const totalCarbs = dateLogs.reduce((s, l) => s + l.carbs, 0);
  const totalFat = dateLogs.reduce((s, l) => s + l.fat, 0);
  const calorieTarget = profile?.calorie_target ?? 2000;
  const caloriesLeft = Math.max(calorieTarget - totalKcal, 0);

  return (
    <GradientBg>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => changeDay(-1)} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{dateLabel(currentDate)}</Text>
            <TouchableOpacity onPress={() => changeDay(1)} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Segmented control ── */}
        <SegmentedControl active={activeTab} onChange={setActiveTab} />

        <ScrollView
          {...panResponder.panHandlers}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══════════════════════ MACROS TAB ═══════════════════════ */}
          {activeTab === 'Macros' && (
            <>
              {/* Blue card with ring */}
              <View style={styles.blueCard}>
                <CalorieRing
                  carbs={totalCarbs}
                  protein={totalProtein}
                  fat={totalFat}
                  target={calorieTarget}
                />

                {/* Macro dots row */}
                <View style={styles.macroDotsRow}>
                  {/* Carbs */}
                  <View style={styles.macroDot}>
                    <View style={[styles.dot, { backgroundColor: '#00D4D4' }]} />
                    <Text style={styles.dotValue}>{Math.round(totalCarbs)}g</Text>
                    <Text style={styles.dotLabel}>Carbs</Text>
                  </View>
                  {/* Protein */}
                  <View style={styles.macroDot}>
                    <View style={[styles.dot, { backgroundColor: '#FF6B9D' }]} />
                    <Text style={styles.dotValue}>{Math.round(totalProtein)}g</Text>
                    <Text style={styles.dotLabel}>Protein</Text>
                  </View>
                  {/* Fat */}
                  <View style={styles.macroDot}>
                    <View style={[styles.dot, { backgroundColor: '#FFB800' }]} />
                    <Text style={styles.dotValue}>{Math.round(totalFat)}g</Text>
                    <Text style={styles.dotLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {/* ── Water + Steps cards ── */}
              <View style={styles.smallCardsRow}>
                {/* Water */}
                <View style={[styles.smallCard, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.cardTitle}>Water</Text>
                  <Text style={{ fontSize: 36, marginVertical: 4 }}>💧</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <Text style={styles.bigValue}>{waterOz.toFixed(1)}</Text>
                    <Text style={styles.smallUnit}>FL OZ</Text>
                  </View>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setWaterOz((v) => Math.max(0, v - 8))}
                    >
                      <Text style={styles.counterBtnText}>–</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setWaterOz((v) => v + 8)}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Walking */}
                <View style={[styles.smallCard, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.cardTitle}>Walking</Text>
                  <StepsRing steps={steps} />
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                    <Text style={styles.bigValue}>{steps.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.smallUnit}>Steps</Text>
                </View>
              </View>

              {/* ── Apple Watch banner ── */}
              <TouchableOpacity
                style={styles.watchBanner}
                onPress={() => navigation.navigate('ConnectWearable')}
                activeOpacity={0.8}
              >
                <View style={styles.watchBannerLeft} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="watch-outline" size={18} color={theme.text} />
                    <Text style={styles.watchTitle}>Connect Wearable</Text>
                  </View>
                  <Text style={styles.watchSub}>Sync workouts and activity data</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.muted} />
              </TouchableOpacity>

              {/* ── Exercise section ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Exercise</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('Workout')}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {exercises.map((ex) => (
                <View key={ex.id} style={styles.exerciseCard}>
                  <View style={[styles.exerciseIconBg, { backgroundColor: ex.color }]}>
                    <Text style={{ fontSize: 28 }}>{ex.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseMeta}>{ex.durationMin} min</Text>
                  </View>
                  <Text style={styles.exerciseKcal}>{ex.kcal} kcal</Text>
                </View>
              ))}
            </>
          )}

          {/* ═══════════════════════ NUTRIENTS TAB ═══════════════════════ */}
          {activeTab === 'Nutrients' && (
            <View style={styles.simpleCard}>
              <Text style={styles.simpleCardText}>Nutrients breakdown coming soon</Text>
            </View>
          )}

          {/* ═══════════════════════ CALORIES TAB ═══════════════════════ */}
          {activeTab === 'Calories' && (
            <View style={styles.simpleCard}>
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Goal</Text>
                <Text style={styles.calValue}>{calorieTarget} kcal</Text>
              </View>
              <View style={styles.calDivider} />
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Eaten</Text>
                <Text style={[styles.calValue, { color: theme.accent }]}>{totalKcal} kcal</Text>
              </View>
              <View style={styles.calDivider} />
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Remaining</Text>
                <Text style={[styles.calValue, { color: theme.success }]}>{caloriesLeft} kcal</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 20, color: '#FFFFFF' },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#1A6FFF',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrowBtn: { padding: 6 },
  arrowText: { fontSize: 22, color: '#FFFFFF', fontWeight: '300' },
  dateLabel: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', minWidth: 90, textAlign: 'center' },

  // Blue card
  blueCard: {
    backgroundColor: '#1A6FFF',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    // subtle inner shadow via border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  macroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  macroDot: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  dotLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Small cards row
  smallCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  smallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 },
  bigValue: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  smallUnit: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  counterRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 20, color: '#1A6FFF', fontWeight: '600', lineHeight: 24 },

  // Apple Watch banner
  watchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    overflow: 'hidden',
  },
  watchBannerLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#1A6FFF',
  },
  watchTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', paddingLeft: 12 },
  watchSub: { fontSize: 12, color: '#6B7280', marginTop: 2, paddingLeft: 12 },

  // Exercise section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, color: '#FFFFFF', fontWeight: '300', lineHeight: 28 },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
  },
  exerciseIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  exerciseMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  exerciseKcal: { fontSize: 14, fontWeight: '700', color: '#1A6FFF' },

  // Simple placeholder cards
  simpleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
  },
  simpleCardText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  // Calories tab
  calRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  calLabel: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  calValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  calDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
});
