import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profileStore';
import { getHealthData, HealthData } from '../lib/healthService';
import { Workout } from '../types/database';

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(progress, 1));
  const center = size / 2;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutWithCount extends Workout {
  exercises?: { count: number }[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkoutScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { profile } = useProfileStore();

  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutWithCount[]>([]);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [newWorkoutModalVisible, setNewWorkoutModalVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTodayWorkouts = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('workouts')
      .select('*, exercises(count)')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: false });
    setTodayWorkouts((data as WorkoutWithCount[]) || []);
  }, [user]);

  const loadWorkoutCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', startOfWeek());
    setWorkoutCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    getHealthData().then(setHealthData);
    loadTodayWorkouts();
    loadWorkoutCount();
  }, [loadTodayWorkouts, loadWorkoutCount]);

  const handleCreateWorkout = async () => {
    if (!user || !newWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    setCreating(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        date: today,
        name: newWorkoutName.trim(),
        duration_min: 0,
        kcal_burned: 0,
        source: 'manual',
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setNewWorkoutModalVisible(false);
    setNewWorkoutName('');
    await loadTodayWorkouts();
    await loadWorkoutCount();
    navigation.navigate('ActivityDetail', {
      workoutId: (data as Workout).id,
      workoutName: (data as Workout).name,
    });
  };

  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete';
  const weekProgress = Math.min(workoutCount / 7, 1);
  const weekPercent = Math.round(weekProgress * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(profile?.name)}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.greetingName}>{firstName}!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        {/* ── Red Progress Card ── */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardLeft}>
            <Text style={styles.progressTitle}>Workout{'\n'}Progress</Text>
            <Text style={styles.progressSub}>
              {workoutCount} workout{workoutCount !== 1 ? 's' : ''} this week
            </Text>
            <Text style={styles.todayActivityLabel}>Today's Activity</Text>
          </View>
          <View style={styles.progressCardRight}>
            <View style={styles.ringWrapper}>
              <ProgressRing progress={weekProgress} size={64} />
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <View style={styles.ringCenter}>
                  <Text style={styles.ringPercent}>{weekPercent}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Today's Activity Horizontal Scroll ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activityScroll}
        >
          {todayWorkouts.map((workout, idx) => {
            const exerciseCount =
              (workout.exercises as any)?.[0]?.count ?? 0;
            const isActive = idx === 0;
            return (
              <TouchableOpacity
                key={workout.id}
                style={[
                  styles.activityCard,
                  isActive ? styles.activityCardActive : styles.activityCardInactive,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('ActivityDetail', {
                    workoutId: workout.id,
                    workoutName: workout.name,
                  })
                }
              >
                <Ionicons
                  name="barbell-outline"
                  size={24}
                  color={isActive ? '#FFFFFF' : '#E53935'}
                  style={styles.activityCardIcon}
                />
                <Text
                  style={[
                    styles.activityCardName,
                    { color: isActive ? '#FFFFFF' : '#1A1A2E' },
                  ]}
                  numberOfLines={2}
                >
                  {workout.name}
                </Text>
                <Text
                  style={[
                    styles.activityCardSub,
                    { color: isActive ? 'rgba(255,255,255,0.80)' : '#6B7280' },
                  ]}
                >
                  {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* "+" New Activity Card */}
          <TouchableOpacity
            style={styles.activityCardNew}
            activeOpacity={0.7}
            onPress={() => {
              setNewWorkoutName('');
              setNewWorkoutModalVisible(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={28} color="#1A6FFF" />
            <Text style={styles.activityCardNewText}>New Activity</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={22} color="#1A6FFF" />
            <Text style={styles.statValue}>
              {healthData ? `${(healthData.kcalBurned / 200).toFixed(1)}h` : '—'}
            </Text>
            <Text style={styles.statLabel}>Workout</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="walk-outline" size={22} color="#1A6FFF" />
            <Text style={styles.statValue}>
              {healthData ? healthData.steps.toLocaleString() : '—'}
            </Text>
            <Text style={styles.statLabel}>Steps</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={22} color="#1A6FFF" />
            <Text style={styles.statValue}>
              {healthData ? `${healthData.kcalBurned}c` : '—'}
            </Text>
            <Text style={styles.statLabel}>Burn</Text>
          </View>
        </View>

        {/* ── Motivational Banner ── */}
        <LinearGradient
          colors={['#1A6FFF', '#7B5EA7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.motivBanner}
        >
          <Text style={styles.motivTitle}>SHAPE YOURSELF</Text>
          <Text style={styles.motivSub}>Reach your fitness goals</Text>
        </LinearGradient>
      </ScrollView>

      {/* ── New Workout Name Modal ── */}
      <Modal
        visible={newWorkoutModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewWorkoutModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewWorkoutModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>New Workout</Text>
          <TextInput
            style={styles.modalInput}
            value={newWorkoutName}
            onChangeText={setNewWorkoutName}
            placeholder="e.g. Push Day, Leg Day..."
            placeholderTextColor="#9CA3AF"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreateWorkout}
          />
          <TouchableOpacity
            style={[styles.modalBtn, creating && { opacity: 0.7 }]}
            onPress={handleCreateWorkout}
            disabled={creating}
            activeOpacity={0.8}
          >
            <Text style={styles.modalBtnText}>
              {creating ? 'Creating...' : 'Start Workout'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalCancelBtn}
            onPress={() => setNewWorkoutModalVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  greeting: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress card
  progressCard: {
    backgroundColor: '#E53935',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  progressCardLeft: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 4,
  },
  progressSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    marginBottom: 12,
  },
  todayActivityLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    fontWeight: '500',
  },
  progressCardRight: {
    marginLeft: 16,
  },
  ringWrapper: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Today's activity
  activityScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  activityCard: {
    width: 160,
    height: 120,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  activityCardActive: {
    backgroundColor: '#FF5252',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },
  activityCardInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  activityCardIcon: {
    marginBottom: 4,
  },
  activityCardName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  activityCardSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  activityCardNew: {
    width: 160,
    height: 120,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A6FFF',
    borderStyle: 'dashed',
    gap: 8,
  },
  activityCardNewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A6FFF',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Motivational banner
  motivBanner: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  motivSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '500',
  },

  // New workout modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  modalBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#1A6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
