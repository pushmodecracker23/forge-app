import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useWorkoutStore } from '../store/workoutStore';
import { useProfileStore } from '../store/profileStore';
import { Exercise, ExerciseSet, Workout } from '../types/database';
import { MUSCLE_GROUPS, EXERCISE_SUGGESTIONS, MuscleGroup } from '../lib/exercises';
import { getHealthData, HealthData } from '../lib/healthService';

// ── Progress Ring Component ──────────────────────────────────────────────────
function ProgressRing({ progress, size = 80 }: { progress: number; size?: number }) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(progress, 1));
  const center = size / 2;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.25)" strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={center} cy={center} r={radius}
        stroke="#FFFFFF" strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function WorkoutScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeWorkout, exercises, setActiveWorkout, addExercise, clear } = useWorkoutStore();
  const { profile } = useProfileStore();

  const [workoutName, setWorkoutName] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sets, setSets] = useState<ExerciseSet[]>([{ reps: 0, weight_kg: 0 }]);
  const [addingExercise, setAddingExercise] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('Chest');
  const [exerciseName, setExerciseName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    getHealthData().then(setHealthData);
    loadWorkoutCount();
  }, [user]);

  const loadWorkoutCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setWorkoutCount(count ?? 0);
  };

  const suggestions = EXERCISE_SUGGESTIONS[selectedMuscle].filter(e =>
    !exerciseName || e.toLowerCase().includes(exerciseName.toLowerCase())
  );

  const startWorkout = async () => {
    if (!user || !workoutName.trim()) { Alert.alert('Error', 'Enter a workout name'); return; }
    const now = new Date();
    setStartTime(now);
    const { data, error } = await supabase.from('workouts').insert({
      user_id: user.id,
      date: now.toISOString().split('T')[0],
      name: workoutName,
      duration_min: 0,
      kcal_burned: 0,
      source: 'manual',
    }).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    setActiveWorkout(data as Workout);
  };

  const addSet = () => setSets([...sets, { reps: 0, weight_kg: 0 }]);
  const removeSet = (i: number) => sets.length > 1 && setSets(sets.filter((_, idx) => idx !== i));
  const updateSet = (index: number, field: keyof ExerciseSet, value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSets(updated);
  };

  const saveExercise = async () => {
    if (!user || !activeWorkout || !exerciseName.trim()) { Alert.alert('Error', 'Enter exercise name'); return; }
    const { data, error } = await supabase.from('exercises').insert({
      workout_id: activeWorkout.id,
      user_id: user.id,
      name: exerciseName,
      muscle_group: selectedMuscle,
      sets,
    }).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addExercise(data as Exercise);
    setExerciseName('');
    setSets([{ reps: 0, weight_kg: 0 }]);
    setAddingExercise(false);
    setShowSuggestions(false);
  };

  const endWorkout = async () => {
    if (!activeWorkout || !startTime) return;
    const duration = Math.round((Date.now() - startTime.getTime()) / 60000);
    Alert.alert('End Workout?', `Duration: ${duration} min`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End', onPress: async () => {
          await supabase.from('workouts').update({ duration_min: duration }).eq('id', activeWorkout.id);
          Alert.alert('Workout Saved!', `${activeWorkout.name} — ${duration} min, ${exercises.length} exercises`);
          clear();
          setWorkoutName('');
          setAddingExercise(false);
          loadWorkoutCount();
        },
      },
    ]);
  };

  const elapsedMin = startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0;
  const progressRatio = Math.min(workoutCount / 20, 1); // progress out of 20 workouts goal
  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

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
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Workout Progress Card ── */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardLeft}>
            <Text style={styles.progressTitle}>Workout{'\n'}Progress</Text>
            <Text style={styles.progressSub}>{workoutCount} workout{workoutCount !== 1 ? 's' : ''} done</Text>
            {activeWorkout && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Active: {activeWorkout.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.progressCardRight}>
            <View style={styles.ringWrapper}>
              <ProgressRing progress={progressRatio} size={88} />
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <View style={styles.ringCenter}>
                  <Text style={styles.ringPercent}>{Math.round(progressRatio * 100)}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.activityTitle}>Today's Activity</Text>

        {/* ── Exercise Cards Horizontal Scroll ── */}
        {exercises.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
            {exercises.map((ex, idx) => (
              <View
                key={ex.id}
                style={[
                  styles.exerciseCard,
                  idx === 0 ? styles.exerciseCardActive : styles.exerciseCardInactive,
                ]}
              >
                <Text style={[styles.exerciseCardName, idx === 0 ? { color: '#FFFFFF' } : { color: '#1A1A2E' }]}>
                  {ex.name}
                </Text>
                <Text style={[styles.exerciseCardSets, idx === 0 ? { color: 'rgba(255,255,255,0.85)' } : { color: '#6B7280' }]}>
                  {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                  {ex.sets[0] ? ` · ${ex.sets[0].weight_kg}kg × ${ex.sets[0].reps}` : ''}
                </Text>
                <Text style={[styles.exerciseCardMuscle, idx === 0 ? { color: 'rgba(255,255,255,0.7)' } : { color: '#6B7280' }]}>
                  {ex.muscle_group}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── No Active Workout: Start Section ── */}
        {!activeWorkout && (
          <View style={styles.startSection}>
            <TextInput
              style={styles.workoutNameInput}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name (e.g. Push Day)"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.startBtn} onPress={startWorkout}>
              <Text style={styles.startBtnText}>⚡ Start Workout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Active Workout UI ── */}
        {activeWorkout && (
          <View style={styles.activeSection}>
            {/* Active workout header */}
            <View style={styles.activeHeader}>
              <View>
                <Text style={styles.activeWorkoutName}>{activeWorkout.name}</Text>
                <Text style={styles.activeWorkoutMeta}>
                  {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · ⏱ {elapsedMin} min
                </Text>
              </View>
              <TouchableOpacity style={styles.endBtn} onPress={endWorkout}>
                <Text style={styles.endBtnText}>🏁 End</Text>
              </TouchableOpacity>
            </View>

            {/* Add exercise panel */}
            {addingExercise ? (
              <View style={styles.addExerciseCard}>
                <Text style={styles.cardSectionTitle}>Add Exercise</Text>

                {/* Muscle group picker */}
                <TouchableOpacity style={styles.muscleBtn} onPress={() => setMusclePickerOpen(true)}>
                  <Text style={styles.muscleBtnText}>💪 {selectedMuscle}</Text>
                  <Text style={{ color: '#6B7280' }}>▼</Text>
                </TouchableOpacity>

                {/* Exercise name */}
                <TextInput
                  style={styles.exerciseInput}
                  value={exerciseName}
                  onChangeText={(v) => { setExerciseName(v); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Exercise name..."
                  placeholderTextColor="#9CA3AF"
                />

                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionsCard}>
                    {suggestions.slice(0, 6).map(sug => (
                      <TouchableOpacity
                        key={sug}
                        style={styles.suggestionRow}
                        onPress={() => { setExerciseName(sug); setShowSuggestions(false); }}
                      >
                        <Text style={styles.suggestionText}>{sug}</Text>
                        <Text style={{ color: '#1A6FFF', fontSize: 13 }}>Select</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Sets */}
                <Text style={[styles.cardSectionTitle, { marginTop: 8, fontSize: 14 }]}>Sets</Text>
                {sets.map((set, i) => (
                  <View key={i} style={styles.setRow}>
                    <View style={styles.setNumBadge}>
                      <Text style={styles.setNum}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.setLabel}>Weight (kg)</Text>
                      <TextInput
                        style={styles.setInput}
                        value={set.weight_kg ? String(set.weight_kg) : ''}
                        onChangeText={v => updateSet(i, 'weight_kg', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.setLabel}>Reps</Text>
                      <TextInput
                        style={styles.setInput}
                        value={set.reps ? String(set.reps) : ''}
                        onChangeText={v => updateSet(i, 'reps', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeSet(i)} style={{ padding: 8 }}>
                      <Text style={{ color: '#F44336', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
                  <Text style={styles.addSetBtnText}>+ Add Set</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveExerciseBtn} onPress={saveExercise}>
                  <Text style={styles.saveExerciseBtnText}>Save Exercise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelExerciseBtn} onPress={() => { setAddingExercise(false); setShowSuggestions(false); }}>
                  <Text style={styles.cancelExerciseBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addExerciseTrigger} onPress={() => setAddingExercise(true)}>
                <Text style={styles.addExerciseTriggerText}>+ Add Exercise</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { icon: '⏱', label: 'Workout', value: activeWorkout ? `${elapsedMin}m` : '0m' },
            { icon: '👟', label: 'Steps', value: healthData ? `${healthData.steps.toLocaleString()}` : '—' },
            { icon: '🔥', label: 'Burn', value: healthData ? `${healthData.kcalBurned}` : '—' },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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

      {/* ── Muscle Group Picker Modal ── */}
      <Modal visible={musclePickerOpen} transparent animationType="slide" onRequestClose={() => setMusclePickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Muscle Group</Text>
            <ScrollView>
              {MUSCLE_GROUPS.map(mg => (
                <TouchableOpacity
                  key={mg}
                  style={styles.muscleOption}
                  onPress={() => {
                    setSelectedMuscle(mg);
                    setShowSuggestions(true);
                    setExerciseName('');
                    setMusclePickerOpen(false);
                  }}
                >
                  <Text style={styles.muscleOptionText}>{mg}</Text>
                  {selectedMuscle === mg && <Text style={{ color: '#1A6FFF' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  bellIcon: {
    fontSize: 18,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 6,
  },
  progressSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  activeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progressCardRight: {
    marginLeft: 16,
  },
  ringWrapper: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  ringCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },

  // Exercise cards
  exerciseCard: {
    width: 160,
    height: 140,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'flex-end',
  },
  exerciseCardActive: {
    backgroundColor: '#FF5252',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exerciseCardInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 111, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseCardName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  exerciseCardSets: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseCardMuscle: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Start section
  startSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  workoutNameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  startBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1A6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // Active section
  activeSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  activeWorkoutName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  activeWorkoutMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  endBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  endBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  addExerciseTrigger: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginBottom: 4,
  },
  addExerciseTriggerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  addExerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  muscleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  muscleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  exerciseInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    color: '#1A1A2E',
    fontSize: 15,
    marginBottom: 8,
  },
  suggestionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1A1A2E',
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(26,111,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6FFF',
  },
  setLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 3,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    color: '#1A1A2E',
    fontSize: 14,
  },
  addSetBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  addSetBtnText: {
    color: '#1A1A2E',
    fontWeight: '600',
    fontSize: 14,
  },
  saveExerciseBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveExerciseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelExerciseBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelExerciseBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 2,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  motivSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Muscle picker modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  muscleOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscleOptionText: {
    fontSize: 15,
    color: '#1A1A2E',
  },
});
