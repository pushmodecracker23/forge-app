import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profileStore';
import { calculateBMR, calculateTDEE, calculateMacros, Goal, ActivityLevel } from '../lib/tdee';

const GOALS: { key: Goal; label: string; desc: string }[] = [
  { key: 'cut', label: 'Cut', desc: 'Lose fat, preserve muscle' },
  { key: 'bulk', label: 'Bulk', desc: 'Build muscle, some fat gain' },
  { key: 'maintain', label: 'Maintain', desc: 'Hold current weight' },
  { key: 'recomp', label: 'Recomp', desc: 'Lose fat and gain muscle' },
];

const ACTIVITIES: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary (desk job)' },
  { key: 'light', label: 'Light (1-3x/week)' },
  { key: 'moderate', label: 'Moderate (3-5x/week)' },
  { key: 'active', label: 'Active (6-7x/week)' },
  { key: 'very_active', label: 'Very Active (2x/day)' },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { setProfile } = useProfileStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const bmr = calculateBMR(parseFloat(currentWeight) || 70, parseFloat(height) || 170, parseInt(age) || 25);
  const tdee = calculateTDEE(bmr, activity);
  const macros = calculateMacros(tdee, goal, parseFloat(currentWeight) || 70);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        name,
        age: parseInt(age),
        height_cm: parseFloat(height),
        current_weight: parseFloat(currentWeight),
        target_weight: parseFloat(targetWeight),
        goal,
        activity_level: activity,
        tdee,
        protein_target: macros.protein,
        carbs_target: macros.carbs,
        fat_target: macros.fat,
        calorie_target: macros.calories,
      })
      .select()
      .single();
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) setProfile(data);
  };

  const s = makeStyles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.stepIndicator}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.dot, step >= n && s.dotActive]} />
        ))}
      </View>

      {step === 1 && (
        <View>
          <Text style={s.title}>Tell us about yourself</Text>
          {([
            ['Name', name, setName, 'default', false],
            ['Age', age, setAge, 'numeric', false],
            ['Height (cm)', height, setHeight, 'numeric', false],
            ['Current weight (kg)', currentWeight, setCurrentWeight, 'numeric', false],
            ['Target weight (kg)', targetWeight, setTargetWeight, 'numeric', false],
          ] as const).map(([label, val, setter, kbType, secure]) => (
            <View key={label}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={val as string}
                onChangeText={setter as (v: string) => void}
                keyboardType={kbType as 'default' | 'numeric'}
                secureTextEntry={secure as boolean}
                placeholderTextColor={theme.muted}
                placeholder={label}
              />
            </View>
          ))}
          <TouchableOpacity style={s.btn} onPress={() => setStep(2)}>
            <Text style={s.btnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={s.title}>Your Goal</Text>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[s.option, goal === g.key && s.optionActive]}
              onPress={() => setGoal(g.key)}
            >
              <Text style={[s.optionTitle, { color: goal === g.key ? theme.accent : theme.text }]}>{g.label}</Text>
              <Text style={[s.optionDesc, { color: theme.muted }]}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.title, { marginTop: 24 }]}>Activity Level</Text>
          {ACTIVITIES.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[s.option, activity === a.key && s.optionActive]}
              onPress={() => setActivity(a.key)}
            >
              <Text style={[s.optionTitle, { color: activity === a.key ? theme.accent : theme.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.row}>
            <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => setStep(1)}>
              <Text style={[s.btnText, { color: theme.text }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={() => setStep(3)}>
              <Text style={s.btnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={s.title}>Your Targets</Text>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{macros.calories} kcal</Text>
            <Text style={[s.summaryLabel, { color: theme.muted }]}>Daily calories</Text>
          </View>
          {[
            { label: 'Protein', value: macros.protein, color: theme.protein },
            { label: 'Carbs', value: macros.carbs, color: theme.carbs },
            { label: 'Fat', value: macros.fat, color: theme.fat },
          ].map((m) => (
            <View key={m.label} style={s.macroRow}>
              <View style={[s.macroDot, { backgroundColor: m.color }]} />
              <Text style={[s.macroLabel, { color: theme.text }]}>{m.label}</Text>
              <Text style={[s.macroValue, { color: theme.text }]}>{m.value}g</Text>
            </View>
          ))}
          <View style={s.row}>
            <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => setStep(2)}>
              <Text style={[s.btnText, { color: theme.text }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={saveProfile} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Let's Forge ⚡</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 24, paddingTop: 60 },
    stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border },
    dotActive: { backgroundColor: theme.accent, width: 24 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 20 },
    label: { fontSize: 13, color: theme.muted, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: theme.text,
    },
    btn: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    btnOutline: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, flex: 0.45 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    row: { flexDirection: 'row', gap: 12 },
    option: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginVertical: 4,
    },
    optionActive: { borderColor: theme.accent },
    optionTitle: { fontSize: 15, fontWeight: '600' },
    optionDesc: { fontSize: 13, marginTop: 2 },
    summaryCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
    },
    summaryValue: { fontSize: 48, fontWeight: '800', color: theme.accent },
    summaryLabel: { fontSize: 14, marginTop: 4 },
    macroRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    macroDot: { width: 10, height: 10, borderRadius: 5 },
    macroLabel: { flex: 1, fontSize: 15 },
    macroValue: { fontSize: 15, fontWeight: '600' },
  });
}
