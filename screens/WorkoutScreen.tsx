import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useWorkoutStore } from '../store/workoutStore';
import Card from '../components/Card';
import { Exercise, ExerciseSet, Workout } from '../types/database';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body'];

export default function WorkoutScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeWorkout, exercises, setActiveWorkout, addExercise, setExercises, clear } = useWorkoutStore();

  const [workoutName, setWorkoutName] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [sets, setSets] = useState<ExerciseSet[]>([{ reps: 0, weight_kg: 0 }]);
  const [addingExercise, setAddingExercise] = useState(false);

  const startWorkout = async () => {
    if (!user || !workoutName.trim()) { Alert.alert('Error', 'Enter a workout name'); return; }
    const now = new Date();
    setStartTime(now);
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        name: workoutName,
        duration_min: 0,
        kcal_burned: 0,
        source: 'manual',
      })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); return; }
    setActiveWorkout(data as Workout);
  };

  const addSet = () => setSets([...sets, { reps: 0, weight_kg: 0 }]);
  const updateSet = (index: number, field: keyof ExerciseSet, value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSets(updated);
  };

  const saveExercise = async () => {
    if (!user || !activeWorkout || !exerciseName.trim()) return;
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        workout_id: activeWorkout.id,
        user_id: user.id,
        name: exerciseName,
        muscle_group: muscleGroup,
        sets,
      })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addExercise(data as Exercise);
    setExerciseName('');
    setSets([{ reps: 0, weight_kg: 0 }]);
    setAddingExercise(false);
  };

  const endWorkout = async () => {
    if (!activeWorkout || !startTime) return;
    const duration = Math.round((Date.now() - startTime.getTime()) / 60000);
    await supabase.from('workouts').update({ duration_min: duration }).eq('id', activeWorkout.id);
    Alert.alert('Workout Saved!', `Duration: ${duration} min`);
    clear();
    setWorkoutName('');
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    input: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      color: theme.text,
      fontSize: 15,
      marginBottom: 12,
    },
    btn: { backgroundColor: theme.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    btnOutline: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
    setRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    setInput: {
      flex: 1,
      backgroundColor: theme.surface2,
      borderRadius: 8,
      padding: 10,
      color: theme.text,
      fontSize: 14,
    },
    setLabel: { color: theme.muted, fontSize: 12, marginBottom: 2 },
    exItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    exName: { fontSize: 15, fontWeight: '600', color: theme.text },
    exMeta: { fontSize: 13, color: theme.muted, marginTop: 2 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
    pillText: { fontSize: 13, fontWeight: '500' },
    endBtn: { backgroundColor: '#333', borderRadius: 12, padding: 14, alignItems: 'center', margin: 16 },
    endBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  });

  if (!activeWorkout) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}><Text style={s.title}>Workout</Text></View>
        <View style={{ padding: 16 }}>
          <TextInput
            style={s.input}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Workout name (e.g. Push Day)"
            placeholderTextColor={theme.muted}
          />
          <TouchableOpacity style={s.btn} onPress={startWorkout}>
            <Text style={s.btnText}>Start Workout ⚡</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>{activeWorkout.name}</Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0} min
          </Text>
        </View>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>Exercises</Text>
          {exercises.map((ex) => (
            <View key={ex.id} style={s.exItem}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.exMeta}>{ex.muscle_group} · {ex.sets.length} sets</Text>
              <View style={s.pillRow}>
                {ex.sets.map((set, i) => (
                  <View key={i} style={[s.pill, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
                    <Text style={[s.pillText, { color: theme.text }]}>{set.weight_kg}kg × {set.reps}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Card>

        {addingExercise ? (
          <Card style={{ marginHorizontal: 16 }}>
            <Text style={s.sectionTitle}>Add Exercise</Text>
            <TextInput
              style={s.input}
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="Exercise name"
              placeholderTextColor={theme.muted}
            />
            <Text style={[s.sectionTitle, { fontSize: 13 }]}>Muscle Group</Text>
            <View style={s.pillRow}>
              {MUSCLE_GROUPS.map((mg) => (
                <TouchableOpacity
                  key={mg}
                  style={[s.pill, { borderColor: muscleGroup === mg ? theme.accent : theme.border, backgroundColor: muscleGroup === mg ? theme.accent + '20' : theme.surface2 }]}
                  onPress={() => setMuscleGroup(mg)}
                >
                  <Text style={[s.pillText, { color: muscleGroup === mg ? theme.accent : theme.muted }]}>{mg}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.sectionTitle}>Sets</Text>
            {sets.map((set, i) => (
              <View key={i} style={s.setRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.setLabel}>Weight (kg)</Text>
                  <TextInput style={s.setInput} value={String(set.weight_kg || '')} onChangeText={(v) => updateSet(i, 'weight_kg', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.setLabel}>Reps</Text>
                  <TextInput style={s.setInput} value={String(set.reps || '')} onChangeText={(v) => updateSet(i, 'reps', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.muted} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={[s.btn, s.btnOutline, { marginBottom: 8 }]} onPress={addSet}>
              <Text style={[s.btnText, { color: theme.text }]}>+ Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={saveExercise}>
              <Text style={s.btnText}>Save Exercise</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <TouchableOpacity style={[s.btn, { marginHorizontal: 16 }]} onPress={() => setAddingExercise(true)}>
            <Text style={s.btnText}>+ Add Exercise</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.endBtn} onPress={endWorkout}>
          <Text style={s.endBtnText}>End Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
