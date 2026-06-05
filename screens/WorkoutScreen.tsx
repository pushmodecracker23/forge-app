import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useWorkoutStore } from '../store/workoutStore';
import Card from '../components/Card';
import { Exercise, ExerciseSet, Workout } from '../types/database';
import { MUSCLE_GROUPS, EXERCISE_SUGGESTIONS, MuscleGroup } from '../lib/exercises';

export default function WorkoutScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeWorkout, exercises, setActiveWorkout, addExercise, clear } = useWorkoutStore();

  const [workoutName, setWorkoutName] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sets, setSets] = useState<ExerciseSet[]>([{ reps: 0, weight_kg: 0 }]);
  const [addingExercise, setAddingExercise] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('Chest');
  const [exerciseName, setExerciseName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);

  const suggestions = EXERCISE_SUGGESTIONS[selectedMuscle].filter(e =>
    !exerciseName || e.toLowerCase().includes(exerciseName.toLowerCase())
  );

  const startWorkout = async () => {
    if (!user || !workoutName.trim()) { Alert.alert('Error', 'Enter a workout name'); return; }
    const now = new Date();
    setStartTime(now);
    const { data, error } = await supabase.from('workouts').insert({
      user_id: user.id, date: now.toISOString().split('T')[0],
      name: workoutName, duration_min: 0, kcal_burned: 0, source: 'manual',
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
      workout_id: activeWorkout.id, user_id: user.id,
      name: exerciseName, muscle_group: selectedMuscle, sets,
    }).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addExercise(data as Exercise);
    setExerciseName(''); setSets([{ reps: 0, weight_kg: 0 }]); setAddingExercise(false);
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
          clear(); setWorkoutName('');
        },
      },
    ]);
  };

  const elapsedMin = startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    subtitle: { fontSize: 14, color: theme.muted, marginTop: 4 },
    input: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, marginBottom: 12 },
    btn: { backgroundColor: theme.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    btnOutline: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 10 },
    muscleBtn: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.surface2, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 10,
    },
    muscleBtnText: { fontSize: 15, fontWeight: '600', color: theme.text },
    suggestionItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' },
    suggestionText: { fontSize: 14, color: theme.text, flex: 1 },
    setRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    setInput: { flex: 1, backgroundColor: theme.surface2, borderRadius: 8, padding: 10, color: theme.text, fontSize: 14 },
    setLabel: { fontSize: 11, color: theme.muted, marginBottom: 3 },
    setNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' },
    setNum: { fontSize: 12, fontWeight: '700', color: theme.accent },
    exItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    exName: { fontSize: 15, fontWeight: '700', color: theme.text },
    exMeta: { fontSize: 12, color: theme.muted, marginTop: 2, marginBottom: 6 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface2 },
    pillText: { fontSize: 12, fontWeight: '600', color: theme.text },
    endBtn: { margin: 16, backgroundColor: '#2A2A2A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A38' },
    endBtnText: { color: '#F5F4F0', fontWeight: '700', fontSize: 15 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 16 },
    muscleOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muscleOptionText: { fontSize: 15, color: theme.text },
  });

  if (!activeWorkout) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}><Text style={s.title}>Workout</Text><Text style={s.subtitle}>Track your sets, reps & weights</Text></View>
        <View style={{ padding: 16 }}>
          <TextInput style={s.input} value={workoutName} onChangeText={setWorkoutName} placeholder="Workout name (e.g. Push Day)" placeholderTextColor={theme.muted} />
          <TouchableOpacity style={s.btn} onPress={startWorkout}>
            <Text style={s.btnText}>⚡ Start Workout</Text>
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
          <Text style={s.subtitle}>{exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · ⏱ {elapsedMin} min</Text>
        </View>

        {/* Logged exercises */}
        {exercises.length > 0 && (
          <Card style={{ marginHorizontal: 16 }}>
            <Text style={s.sectionTitle}>Exercises</Text>
            {exercises.map(ex => (
              <View key={ex.id} style={s.exItem}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exMeta}>{ex.muscle_group} · {ex.sets.length} sets</Text>
                <View style={s.pillRow}>
                  {ex.sets.map((set, i) => (
                    <View key={i} style={s.pill}>
                      <Text style={s.pillText}>{set.weight_kg}kg × {set.reps}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Add exercise panel */}
        {addingExercise ? (
          <Card style={{ marginHorizontal: 16 }}>
            <Text style={s.sectionTitle}>Add Exercise</Text>

            {/* Muscle group picker */}
            <TouchableOpacity style={s.muscleBtn} onPress={() => setMusclePickerOpen(true)}>
              <Text style={s.muscleBtnText}>💪 {selectedMuscle}</Text>
              <Text style={{ color: theme.muted }}>▼</Text>
            </TouchableOpacity>

            {/* Exercise name with suggestions */}
            <TextInput
              style={s.input}
              value={exerciseName}
              onChangeText={(v) => { setExerciseName(v); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Exercise name..."
              placeholderTextColor={theme.muted}
            />

            {showSuggestions && suggestions.length > 0 && (
              <Card style={{ marginBottom: 10, padding: 0 }}>
                {suggestions.slice(0, 6).map(sug => (
                  <TouchableOpacity key={sug} style={s.suggestionItem} onPress={() => { setExerciseName(sug); setShowSuggestions(false); }}>
                    <Text style={s.suggestionText}>{sug}</Text>
                    <Text style={{ color: theme.accent, fontSize: 13 }}>Select</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            {/* Sets */}
            <Text style={[s.sectionTitle, { marginTop: 8 }]}>Sets</Text>
            {sets.map((set, i) => (
              <View key={i} style={s.setRow}>
                <View style={s.setNumBadge}><Text style={s.setNum}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.setLabel}>Weight (kg)</Text>
                  <TextInput style={s.setInput} value={set.weight_kg ? String(set.weight_kg) : ''} onChangeText={v => updateSet(i, 'weight_kg', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.setLabel}>Reps</Text>
                  <TextInput style={s.setInput} value={set.reps ? String(set.reps) : ''} onChangeText={v => updateSet(i, 'reps', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.muted} />
                </View>
                <TouchableOpacity onPress={() => removeSet(i)} style={{ padding: 8 }}>
                  <Text style={{ color: theme.error, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[s.btn, s.btnOutline, { marginBottom: 8 }]} onPress={addSet}>
              <Text style={[s.btnText, { color: theme.text }]}>+ Add Set</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={saveExercise}>
              <Text style={s.btnText}>Save Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => setAddingExercise(false)}>
              <Text style={[s.btnText, { color: theme.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <TouchableOpacity style={[s.btn, { marginHorizontal: 16 }]} onPress={() => setAddingExercise(true)}>
            <Text style={s.btnText}>+ Add Exercise</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.endBtn} onPress={endWorkout}>
          <Text style={s.endBtnText}>🏁 End Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Muscle group picker modal */}
      <Modal visible={musclePickerOpen} transparent animationType="slide" onRequestClose={() => setMusclePickerOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Muscle Group</Text>
            <ScrollView>
              {MUSCLE_GROUPS.map(mg => (
                <TouchableOpacity key={mg} style={s.muscleOption} onPress={() => { setSelectedMuscle(mg); setShowSuggestions(true); setExerciseName(''); setMusclePickerOpen(false); }}>
                  <Text style={s.muscleOptionText}>{mg}</Text>
                  {selectedMuscle === mg && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
