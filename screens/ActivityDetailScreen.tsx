import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Exercise, Workout } from '../types/database';

// ── Muscle group badge colors ─────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#FF6B9D',
  Back: '#1A6FFF',
  Shoulders: '#FFB800',
  Biceps: '#00D4D4',
  Triceps: '#7B5EA7',
  Legs: '#00C48C',
  Glutes: '#FF8C00',
  Core: '#E53935',
  'Full Body': '#1A1A2E',
  Cardio: '#FF6B9D',
};

function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] ?? '#6B7280';
}

// ── Elapsed timer ──────────────────────────────────────────────────────────────

function useElapsed(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Swipe-to-delete row ───────────────────────────────────────────────────────

function RenderRightAction({ onDelete }: { onDelete: () => void }) {
  return (
    <TouchableOpacity style={styles.swipeDeleteAction} onPress={onDelete} activeOpacity={0.8}>
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// ── Exercise Row ──────────────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: Exercise;
  onDelete: (id: string) => void;
}

function ExerciseRow({ exercise, onDelete }: ExerciseRowProps) {
  const badgeColor = getMuscleColor(exercise.muscle_group);

  const handleDelete = () => {
    Alert.alert(
      'Delete Exercise',
      `Remove "${exercise.name}" from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(exercise.id) },
      ]
    );
  };

  return (
    <Swipeable
      renderRightActions={() => <RenderRightAction onDelete={handleDelete} />}
      overshootRight={false}
    >
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseCardTop}>
          <View style={[styles.muscleBadge, { backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.muscleBadgeText, { color: badgeColor }]}>
              {exercise.muscle_group}
            </Text>
          </View>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.setsCount}>
            {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {exercise.sets.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.setsPills}
          >
            {exercise.sets.map((set, idx) => (
              <View key={idx} style={styles.setPill}>
                <Text style={styles.setPillText}>
                  {set.weight_kg}kg x {set.reps}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Swipeable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ActivityDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { workoutId, workoutName } = route.params as { workoutId: string; workoutName: string };
  const { user } = useAuth();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const isToday = workout
    ? workout.date === new Date().toISOString().split('T')[0]
    : false;

  const elapsedLabel = useElapsed(workout?.created_at ?? null);

  const loadWorkout = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single();
    if (data) setWorkout(data as Workout);
  }, [workoutId]);

  const loadExercises = useCallback(async () => {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('created_at');
    setExercises((data as Exercise[]) || []);
    setLoading(false);
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
    loadExercises();
  }, [loadWorkout, loadExercises]);

  const handleDeleteExercise = async (id: string) => {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEndWorkout = () => {
    if (!workout) return;
    const durationMin = Math.round(
      (Date.now() - new Date(workout.created_at).getTime()) / 60000
    );
    Alert.alert(
      'End Workout?',
      `Duration: ${durationMin} min`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('workouts')
              .update({ duration_min: durationMin })
              .eq('id', workoutId);
            Alert.alert(
              'Workout Complete',
              `${workoutName} — ${durationMin} min, ${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`
            );
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A6FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {workoutName}
        </Text>
        <TouchableOpacity style={styles.headerMoreBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Workout Info Card ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardName} numberOfLines={1}>
                {workoutName}
              </Text>
              <Text style={styles.infoCardMeta}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.infoCardRight}>
              {isToday && (
                <Text style={styles.elapsedTimer}>{elapsedLabel}</Text>
              )}
            </View>
          </View>
          {isToday && (
            <TouchableOpacity style={styles.endWorkoutBtn} onPress={handleEndWorkout} activeOpacity={0.8}>
              <Text style={styles.endWorkoutBtnText}>End Workout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Exercises Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <TouchableOpacity
            style={styles.addExerciseBtn}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('AddExercise', { workoutId, workoutName })
            }
          >
            <Ionicons name="add-circle" size={18} color="#1A6FFF" />
            <Text style={styles.addExerciseBtnText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exercisesList}>
          {!loading && exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#1A6FFF" />
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySub}>Tap Add Exercise to get started</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('AddExercise', { workoutId, workoutName })
                }
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          )}

          {exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onDelete={handleDeleteExercise}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginHorizontal: 8,
  },
  headerMoreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  infoCardMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoCardRight: {
    alignItems: 'flex-end',
  },
  elapsedTimer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A6FFF',
    fontVariant: ['tabular-nums'],
  },
  endWorkoutBtn: {
    borderWidth: 1.5,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  endWorkoutBtnText: {
    color: '#F44336',
    fontWeight: '700',
    fontSize: 14,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExerciseBtnText: {
    color: '#1A6FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Exercises list
  exercisesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  muscleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  setsCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  setsPills: {
    gap: 6,
    paddingBottom: 2,
  },
  setPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  setPillText: {
    fontSize: 12,
    color: '#1A1A2E',
    fontWeight: '600',
  },

  // Swipe delete
  swipeDeleteAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 16,
    marginBottom: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: '#1A6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
