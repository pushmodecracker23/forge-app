import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ExerciseSet } from '../types/database';
import { MUSCLE_GROUPS, EXERCISE_SUGGESTIONS, MuscleGroup } from '../lib/exercises';

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddExerciseScreen({ route, navigation }: { route: any; navigation: any }) {
  const { workoutId, workoutName } = route.params as { workoutId: string; workoutName: string };
  const { user } = useAuth();

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('Chest');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([{ reps: 10, weight_kg: 0 }]);
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Sets helpers ──────────────────────────────────────────────────────────

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, { reps: last?.reps ?? 10, weight_kg: last?.weight_kg ?? 0 }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== index));
  };

  const updateSet = (index: number, field: keyof ExerciseSet, value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setSets(updated);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    if (!exerciseName.trim()) {
      Alert.alert('Missing Info', 'Please enter an exercise name');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('exercises').insert({
      workout_id: workoutId,
      user_id: user.id,
      name: exerciseName.trim(),
      muscle_group: selectedMuscle,
      sets,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    navigation.goBack();
  };

  // ── Suggestions ───────────────────────────────────────────────────────────

  const suggestions = EXERCISE_SUGGESTIONS[selectedMuscle];

  // ── Render ────────────────────────────────────────────────────────────────

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
        <Text style={styles.headerTitle}>Add Exercise</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Muscle Group ── */}
          <Text style={styles.label}>Muscle Group</Text>
          <TouchableOpacity
            style={styles.musclePicker}
            onPress={() => setMusclePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.musclePickerText}>{selectedMuscle}</Text>
            <Ionicons name="chevron-down" size={18} color="#1A6FFF" />
          </TouchableOpacity>

          {/* ── Exercise Name ── */}
          <Text style={styles.label}>Exercise Name</Text>
          <TextInput
            style={styles.textInput}
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="e.g. Bench Press"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
          />

          {/* ── Suggestions ── */}
          {suggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
              keyboardShouldPersistTaps="handled"
            >
              {suggestions.map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[
                    styles.suggestionPill,
                    exerciseName === sug && styles.suggestionPillActive,
                  ]}
                  onPress={() => setExerciseName(sug)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.suggestionPillText,
                      exerciseName === sug && styles.suggestionPillTextActive,
                    ]}
                  >
                    {sug}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Sets ── */}
          <View style={styles.setsHeader}>
            <Text style={styles.label} >Sets</Text>
            <TouchableOpacity onPress={addSet} activeOpacity={0.7}>
              <Text style={styles.addSetLink}>Add Set</Text>
            </TouchableOpacity>
          </View>

          {sets.map((set, i) => (
            <View key={i} style={styles.setRow}>
              {/* Badge */}
              <View style={styles.setNumBadge}>
                <Text style={styles.setNumText}>{i + 1}</Text>
              </View>

              {/* Weight */}
              <View style={styles.setInputGroup}>
                <Text style={styles.setInputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.setInput}
                  value={set.weight_kg > 0 ? String(set.weight_kg) : ''}
                  onChangeText={(v) => updateSet(i, 'weight_kg', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                />
              </View>

              {/* Reps */}
              <View style={styles.setInputGroup}>
                <Text style={styles.setInputLabel}>Reps</Text>
                <TextInput
                  style={styles.setInput}
                  value={set.reps > 0 ? String(set.reps) : ''}
                  onChangeText={(v) => updateSet(i, 'reps', v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                />
              </View>

              {/* Delete set */}
              <TouchableOpacity
                onPress={() => removeSet(i)}
                style={styles.deleteSetBtn}
                activeOpacity={0.7}
                disabled={sets.length <= 1}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={sets.length <= 1 ? '#D1D5DB' : '#F44336'}
                />
              </TouchableOpacity>
            </View>
          ))}

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save Exercise'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Muscle Group Picker Modal ── */}
      <Modal
        visible={musclePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMusclePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMusclePickerOpen(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select Muscle Group</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {MUSCLE_GROUPS.map((mg) => (
              <TouchableOpacity
                key={mg}
                style={styles.muscleOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedMuscle(mg);
                  setMusclePickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.muscleOptionText,
                    mg === selectedMuscle && styles.muscleOptionTextActive,
                  ]}
                >
                  {mg}
                </Text>
                {mg === selectedMuscle && (
                  <Ionicons name="checkmark" size={18} color="#1A6FFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  },
  headerPlaceholder: {
    width: 40,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Muscle picker
  musclePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#1A6FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: 'rgba(26,111,255,0.04)',
  },
  musclePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A6FFF',
  },

  // Text input
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },

  // Suggestions
  suggestionsRow: {
    gap: 8,
    paddingBottom: 20,
  },
  suggestionPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1A6FFF',
  },
  suggestionPillActive: {
    backgroundColor: '#1A6FFF',
  },
  suggestionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A6FFF',
  },
  suggestionPillTextActive: {
    color: '#FFFFFF',
  },

  // Sets
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  addSetLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A6FFF',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  setNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  setInputGroup: {
    flex: 1,
  },
  setInputLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  setInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  deleteSetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    flexShrink: 0,
  },

  // Save button
  saveBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#1A6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // Muscle picker modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  pickerSheet: {
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
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  pickerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  muscleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  muscleOptionText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  muscleOptionTextActive: {
    color: '#1A6FFF',
    fontWeight: '700',
  },
});
