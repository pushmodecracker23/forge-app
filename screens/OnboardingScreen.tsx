import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profileStore';
import {
  calculateBMR, calculateTDEE, calculateMacros, estimateWeeksToGoal,
  Goal, ActivityLevel, Gender, CUT_OPTIONS, BULK_OPTIONS, ACTIVITY_LABELS,
  ftInToCm, lbsToKg, kgToLbs,
} from '../lib/tdee';

const TOTAL_STEPS = 10;

const GOALS: { key: Goal; label: string; icon: string; desc: string }[] = [
  { key: 'cut', label: 'Cut', icon: '🔥', desc: 'Lose fat while preserving muscle' },
  { key: 'bulk', label: 'Bulk', icon: '💪', desc: 'Build muscle with a calorie surplus' },
  { key: 'maintain', label: 'Maintain', icon: '⚖️', desc: 'Stay at your current weight' },
  { key: 'recomp', label: 'Recomp', icon: '🔄', desc: 'Lose fat AND gain muscle simultaneously' },
];

const ACTIVITIES: { key: ActivityLevel; icon: string }[] = [
  { key: 'sedentary', icon: '🪑' },
  { key: 'light', icon: '🚶' },
  { key: 'moderate', icon: '🏃' },
  { key: 'active', icon: '⚡' },
  { key: 'very_active', icon: '🔥' },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { setProfile } = useProfileStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [deficitKcal, setDeficitKcal] = useState(500);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const getHeightInCm = () => {
    if (heightUnit === 'cm') return parseFloat(heightCm) || 0;
    return ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0);
  };
  const getCurrentWeightKg = () => weightUnit === 'kg' ? parseFloat(currentWeight) || 0 : lbsToKg(parseFloat(currentWeight) || 0);
  const getTargetWeightKg = () => weightUnit === 'kg' ? parseFloat(targetWeight) || 0 : lbsToKg(parseFloat(targetWeight) || 0);

  const bmr = calculateBMR(getCurrentWeightKg(), getHeightInCm(), parseInt(age) || 25, gender);
  const tdee = calculateTDEE(bmr, activity);
  const macros = calculateMacros(tdee, goal, getCurrentWeightKg(), deficitKcal);
  const currentKg = getCurrentWeightKg();
  const targetKg = getTargetWeightKg();

  const deficitOptions = goal === 'cut' ? CUT_OPTIONS : goal === 'bulk' ? BULK_OPTIONS : [];
  const selectedOption = deficitOptions.find(o => o.kcal === deficitKcal) ?? deficitOptions[1];
  const weeksToGoal = selectedOption ? estimateWeeksToGoal(currentKg, targetKg, selectedOption.weeklyChangeKg) : 0;

  const goNext = () => {
    // Validation
    if (step === 1 && !name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    if (step === 2 && (!age || parseInt(age) < 10 || parseInt(age) > 100)) { Alert.alert('Required', 'Please enter a valid age'); return; }
    if (step === 4 && getHeightInCm() < 50) { Alert.alert('Required', 'Please enter a valid height'); return; }
    if (step === 5 && getCurrentWeightKg() < 20) { Alert.alert('Required', 'Please enter a valid weight'); return; }
    if (step === 6 && getTargetWeightKg() < 20) { Alert.alert('Required', 'Please enter a valid target weight'); return; }

    // Skip deficit step for maintain/recomp
    const nextStep = step === 7 && (goal === 'maintain' || goal === 'recomp') ? 9 : step + 1;
    animateToStep(nextStep);
  };

  const goBack = () => {
    const prevStep = step === 9 && (goal === 'maintain' || goal === 'recomp') ? 7 : step - 1;
    animateToStep(prevStep);
  };

  const animateToStep = (newStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setStep(newStep);
  };

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        name: name.trim(),
        age: parseInt(age),
        gender,
        height_cm: getHeightInCm(),
        current_weight: getCurrentWeightKg(),
        target_weight: getTargetWeightKg(),
        goal,
        activity_level: activity,
        tdee,
        deficit_kcal: deficitKcal,
        protein_target: macros.protein,
        carbs_target: macros.carbs,
        fat_target: macros.fat,
        calorie_target: macros.calories,
      })
      .select()
      .single();
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) setProfile(data as any);
  };

  const progress = step / TOTAL_STEPS;
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container}>
      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Back button */}
      {step > 1 && (
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* STEP 1: Name */}
          {step === 1 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 1 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>What's your name?</Text>
              <TextInput style={s.bigInput} value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor={theme.muted}
                autoCapitalize="words" autoFocus />
            </View>
          )}

          {/* STEP 2: Age */}
          {step === 2 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 2 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>How old are you, {name}?</Text>
              <TextInput style={s.bigInput} value={age} onChangeText={setAge}
                placeholder="e.g. 25" placeholderTextColor={theme.muted}
                keyboardType="numeric" autoFocus />
            </View>
          )}

          {/* STEP 3: Gender */}
          {step === 3 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 3 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>What's your biological sex?</Text>
              <Text style={s.hint}>Used for accurate calorie calculation</Text>
              <View style={s.genderRow}>
                {(['male', 'female'] as Gender[]).map(g => (
                  <TouchableOpacity
                    key={g} style={[s.genderBtn, gender === g && s.optionActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={s.genderIcon}>{g === 'male' ? '♂️' : '♀️'}</Text>
                    <Text style={[s.genderLabel, { color: gender === g ? theme.accent : theme.text }]}>
                      {g === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 4: Height */}
          {step === 4 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 4 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>How tall are you?</Text>
              <View style={s.unitToggleRow}>
                {(['cm', 'ft'] as const).map(u => (
                  <TouchableOpacity key={u} style={[s.unitBtn, heightUnit === u && s.unitBtnActive]} onPress={() => setHeightUnit(u)}>
                    <Text style={[s.unitBtnText, { color: heightUnit === u ? '#fff' : theme.muted }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {heightUnit === 'cm' ? (
                <TextInput style={s.bigInput} value={heightCm} onChangeText={setHeightCm}
                  placeholder="e.g. 178" placeholderTextColor={theme.muted} keyboardType="numeric" autoFocus />
              ) : (
                <View style={s.ftRow}>
                  <TextInput style={[s.bigInput, { flex: 1, marginRight: 8 }]} value={heightFt} onChangeText={setHeightFt}
                    placeholder="5 ft" placeholderTextColor={theme.muted} keyboardType="numeric" />
                  <TextInput style={[s.bigInput, { flex: 1 }]} value={heightIn} onChangeText={setHeightIn}
                    placeholder="11 in" placeholderTextColor={theme.muted} keyboardType="numeric" />
                </View>
              )}
            </View>
          )}

          {/* STEP 5: Current Weight */}
          {step === 5 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 5 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>What's your current weight?</Text>
              <View style={s.unitToggleRow}>
                {(['kg', 'lbs'] as const).map(u => (
                  <TouchableOpacity key={u} style={[s.unitBtn, weightUnit === u && s.unitBtnActive]} onPress={() => setWeightUnit(u)}>
                    <Text style={[s.unitBtnText, { color: weightUnit === u ? '#fff' : theme.muted }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.bigInput} value={currentWeight} onChangeText={setCurrentWeight}
                placeholder={weightUnit === 'kg' ? 'e.g. 80 kg' : 'e.g. 176 lbs'}
                placeholderTextColor={theme.muted} keyboardType="numeric" autoFocus />
            </View>
          )}

          {/* STEP 6: Target Weight */}
          {step === 6 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 6 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>What's your target weight?</Text>
              <Text style={s.hint}>Your goal body weight in {weightUnit}</Text>
              <TextInput style={s.bigInput} value={targetWeight} onChangeText={setTargetWeight}
                placeholder={weightUnit === 'kg' ? 'e.g. 72 kg' : 'e.g. 158 lbs'}
                placeholderTextColor={theme.muted} keyboardType="numeric" autoFocus />
            </View>
          )}

          {/* STEP 7: Goal */}
          {step === 7 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 7 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>What's your main goal?</Text>
              {GOALS.map(g => (
                <TouchableOpacity key={g.key} style={[s.option, goal === g.key && s.optionActive]} onPress={() => setGoal(g.key)}>
                  <Text style={s.optionIcon}>{g.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionTitle, { color: goal === g.key ? theme.accent : theme.text }]}>{g.label}</Text>
                    <Text style={[s.optionDesc, { color: theme.muted }]}>{g.desc}</Text>
                  </View>
                  {goal === g.key && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 8: Deficit/Surplus (only for cut/bulk) */}
          {step === 8 && (goal === 'cut' || goal === 'bulk') && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 8 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>{goal === 'cut' ? 'How aggressive is your cut?' : 'How fast do you want to bulk?'}</Text>
              {deficitOptions.map(opt => (
                <TouchableOpacity key={opt.kcal} style={[s.option, deficitKcal === opt.kcal && s.optionActive]} onPress={() => setDeficitKcal(opt.kcal)}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.optionTitle, { color: deficitKcal === opt.kcal ? theme.accent : theme.text }]}>{opt.label}</Text>
                      {opt.recommended && <View style={s.recBadge}><Text style={s.recText}>Recommended</Text></View>}
                    </View>
                    <Text style={[s.optionDesc, { color: theme.muted }]}>{opt.description}</Text>
                    <Text style={[s.optionDesc, { color: theme.accent, marginTop: 4 }]}>
                      {goal === 'cut' ? `~${opt.weeklyChangeKg} kg lost/week` : `~${opt.weeklyChangeKg} kg gained/week`}
                    </Text>
                    {targetKg > 0 && deficitKcal === opt.kcal && (
                      <Text style={[s.optionDesc, { color: theme.muted, marginTop: 2 }]}>
                        Estimated time to goal: ~{estimateWeeksToGoal(currentKg, targetKg, opt.weeklyChangeKg)} weeks
                      </Text>
                    )}
                  </View>
                  {deficitKcal === opt.kcal && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 9: Activity Level */}
          {step === 9 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 9 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>How active are you?</Text>
              {ACTIVITIES.map(a => (
                <TouchableOpacity key={a.key} style={[s.option, activity === a.key && s.optionActive]} onPress={() => setActivity(a.key)}>
                  <Text style={s.optionIcon}>{a.icon}</Text>
                  <Text style={[s.optionTitle, { flex: 1, color: activity === a.key ? theme.accent : theme.text }]}>
                    {ACTIVITY_LABELS[a.key]}
                  </Text>
                  {activity === a.key && <Text style={{ color: theme.accent }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 10: Summary */}
          {step === 10 && (
            <View style={s.stepView}>
              <Text style={s.stepNum}>Step 10 of {TOTAL_STEPS}</Text>
              <Text style={s.question}>Your daily targets</Text>
              <Text style={s.hint}>Calculated with the Mifflin-St Jeor equation</Text>

              <View style={s.summaryCard}>
                <Text style={[s.summaryBig, { color: theme.accent }]}>{macros.calories}</Text>
                <Text style={[s.summaryLabel, { color: theme.muted }]}>kcal / day</Text>
                {(goal === 'cut' || goal === 'bulk') && targetKg > 0 && (
                  <Text style={[s.summaryLabel, { color: theme.muted, marginTop: 6 }]}>
                    ~{weeksToGoal} weeks to reach {Math.round(targetKg * 10) / 10} kg
                  </Text>
                )}
              </View>

              {[
                { label: 'Protein', value: macros.protein, color: theme.protein, note: 'Preserves muscle' },
                { label: 'Carbs', value: macros.carbs, color: theme.carbs, note: 'Energy source' },
                { label: 'Fat', value: macros.fat, color: theme.fat, note: 'Hormonal health' },
              ].map(m => (
                <View key={m.label} style={s.macroRow}>
                  <View style={[s.macroDot, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.macroLabel, { color: theme.text }]}>{m.label}</Text>
                    <Text style={[s.macroNote, { color: theme.muted }]}>{m.note}</Text>
                  </View>
                  <Text style={[s.macroValue, { color: theme.text }]}>{m.value}g</Text>
                </View>
              ))}

              <TouchableOpacity style={s.primaryBtn} onPress={saveProfile} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Let's Forge ⚡</Text>}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Animated.View>

      {/* Next button (not shown on step 10) */}
      {step < 10 && (
        <View style={s.footer}>
          <TouchableOpacity style={s.nextBtn} onPress={goNext}>
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    progressTrack: { height: 3, backgroundColor: theme.border, marginHorizontal: 0 },
    progressFill: { height: 3, backgroundColor: theme.accent },
    backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
    backText: { color: theme.muted, fontSize: 15 },
    content: { padding: 24, paddingBottom: 120 },
    stepView: {},
    stepNum: { fontSize: 13, color: theme.muted, marginBottom: 8 },
    question: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 8, lineHeight: 34 },
    hint: { fontSize: 14, color: theme.muted, marginBottom: 20 },
    bigInput: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 18,
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    unitToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    unitBtn: {
      paddingHorizontal: 20, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1.5, borderColor: theme.border,
    },
    unitBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    unitBtnText: { fontWeight: '700', fontSize: 14 },
    ftRow: { flexDirection: 'row', gap: 8 },
    genderRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    genderBtn: {
      flex: 1, backgroundColor: theme.surface, borderRadius: 16,
      borderWidth: 1.5, borderColor: theme.border, padding: 20, alignItems: 'center',
    },
    genderIcon: { fontSize: 36, marginBottom: 8 },
    genderLabel: { fontSize: 16, fontWeight: '700' },
    option: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5,
      borderRadius: 14, padding: 16, marginVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    optionActive: { borderColor: theme.accent },
    optionIcon: { fontSize: 22 },
    optionTitle: { fontSize: 15, fontWeight: '700' },
    optionDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
    recBadge: { backgroundColor: theme.accent + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    recText: { fontSize: 11, fontWeight: '700', color: theme.accent },
    summaryCard: {
      backgroundColor: theme.surface, borderRadius: 20, padding: 28,
      alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.border,
    },
    summaryBig: { fontSize: 56, fontWeight: '900' },
    summaryLabel: { fontSize: 15, marginTop: 4 },
    macroRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
    macroDot: { width: 12, height: 12, borderRadius: 6 },
    macroLabel: { fontSize: 15, fontWeight: '600' },
    macroNote: { fontSize: 12 },
    macroValue: { fontSize: 18, fontWeight: '800' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.bg },
    nextBtn: { backgroundColor: theme.accent, borderRadius: 16, padding: 18, alignItems: 'center' },
    nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    primaryBtn: { backgroundColor: theme.accent, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24 },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
}
