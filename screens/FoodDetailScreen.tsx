import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useProfileStore } from '../store/profileStore';
import { supabase } from '../lib/supabase';
import { FoodItem } from '../lib/openfoodfacts';
import { MealType, FoodLog } from '../types/database';

interface Props {
  navigation: any;
  route: {
    params: {
      foodLog?: FoodLog;
      foodItem?: FoodItem;
      mealType: MealType;
      date: string;
    };
  };
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const UNITS = ['g', 'oz', 'cup', 'tbsp', 'tsp', 'ml'];

const RING_SIZE = 100;
const RING_RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CalorieRingAnimated({
  displayKcal,
  calorieTarget,
  ringAnim,
}: {
  displayKcal: number;
  calorieTarget: number;
  ringAnim: Animated.Value;
}) {
  const progress = Math.min(displayKcal / (calorieTarget || 2000), 1);

  const strokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - progress)],
  });

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={RING_RADIUS}
          stroke="#F5F5F5"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={RING_RADIUS}
          stroke="#FF6B9D"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringKcalValue}>{displayKcal}</Text>
        <Text style={styles.ringKcalLabel}>Cals</Text>
      </View>
    </View>
  );
}

export default function FoodDetailScreen({ navigation, route }: Props) {
  const { foodLog, foodItem, mealType, date } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  const { profile } = useProfileStore();

  const [servingSize, setServingSize] = useState(foodLog?.serving_g || 100);
  const [servings, setServings] = useState(1);
  const [unit, setUnit] = useState('g');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealType);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(ringAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, []);

  // Base nutrients: per 100g if foodItem, absolute if foodLog
  const baseKcal = foodItem ? foodItem.kcal : (foodLog?.kcal || 0);
  const baseCarbs = foodItem ? foodItem.carbs : (foodLog?.carbs || 0);
  const baseProtein = foodItem ? foodItem.protein : (foodLog?.protein || 0);
  const baseFat = foodItem ? foodItem.fat : (foodLog?.fat || 0);

  const multiplier = foodItem ? (servingSize / 100) * servings : servings;
  const displayKcal = Math.round(baseKcal * multiplier);
  const displayCarbs = +(baseCarbs * multiplier).toFixed(1);
  const displayProtein = +(baseProtein * multiplier).toFixed(1);
  const displayFat = +(baseFat * multiplier).toFixed(1);

  const calorieTarget = profile?.calorie_target || 2000;
  const proteinTarget = profile?.protein_target || 150;
  const carbsTarget = profile?.carbs_target || 250;
  const fatTarget = profile?.fat_target || 65;

  const foodName = foodItem?.name || foodLog?.food_name || 'Unknown Food';

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (foodLog) {
        // Update existing
        await supabase.from('food_log').update({
          kcal: displayKcal,
          protein: displayProtein,
          carbs: displayCarbs,
          fat: displayFat,
          serving_g: servingSize * servings,
          meal_type: selectedMeal,
        }).eq('id', foodLog.id);
      } else if (foodItem) {
        // Insert new
        await supabase.from('food_log').insert({
          user_id: user.id,
          date: date,
          food_name: foodItem.name,
          brand: foodItem.brand || '',
          kcal: displayKcal,
          protein: displayProtein,
          carbs: displayCarbs,
          fat: displayFat,
          serving_g: servingSize * servings,
          meal_type: selectedMeal,
          is_saved_meal: false,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const macroBarColor = (color: string, value: number, target: number) => {
    const pct = Math.min(value / (target || 1), 1) * 100;
    return { pct, color };
  };

  const caloriePct = Math.min((displayKcal / calorieTarget) * 100, 100);
  const carbsPct = Math.min((displayCarbs / carbsTarget) * 100, 100);
  const proteinPct = Math.min((displayProtein / proteinTarget) * 100, 100);
  const fatPct = Math.min((displayFat / fatTarget) * 100, 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A6FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{foodLog ? 'Edit Entry' : 'Add Food'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#1A6FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Food name ── */}
        <Text style={styles.foodName} numberOfLines={2}>{foodName}</Text>

        {/* ── Calorie ring + macros ── */}
        <View style={styles.calorieRow}>
          <CalorieRingAnimated
            displayKcal={displayKcal}
            calorieTarget={calorieTarget}
            ringAnim={ringAnim}
          />
          <View style={styles.macrosColumn}>
            {[
              { label: 'Carbs', value: displayCarbs, color: '#00D4D4' },
              { label: 'Protein', value: displayProtein, color: '#FF6B9D' },
              { label: 'Fat', value: displayFat, color: '#FFB800' },
            ].map((m) => (
              <View key={m.label} style={styles.macroRow}>
                <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                <Text style={styles.macroValue}>{m.value}g</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Serving size ── */}
        <Text style={styles.sectionLabel}>Serving Size</Text>
        <View style={styles.servingRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setServingSize((s) => Math.max(0.1, +(s - 0.5).toFixed(1)))}
          >
            <Ionicons name="remove" size={18} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.servingValue}>{servingSize}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnActive]}
            onPress={() => setServingSize((s) => +(s + 0.5).toFixed(1))}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.unitDropdown}
            onPress={() => setShowUnitPicker(true)}
          >
            <Text style={styles.unitText}>{unit}</Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ── Number of servings ── */}
        <Text style={styles.sectionLabel}>Number of Servings</Text>
        <View style={styles.servingRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))}
          >
            <Ionicons name="remove" size={18} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.servingValue}>{servings}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnActive]}
            onPress={() => setServings((s) => +(s + 0.5).toFixed(1))}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ── Time + Meal ── */}
        <View style={styles.timeMealRow}>
          <View style={styles.timeMealCol}>
            <Text style={styles.sectionLabelSmall}>Time</Text>
            <TouchableOpacity style={styles.lockedField}>
              <Ionicons name="lock-closed-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.lockedText}>10:00 AM</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeMealCol}>
            <Text style={styles.sectionLabelSmall}>Meal</Text>
            <TouchableOpacity
              style={styles.mealDropdown}
              onPress={() => setShowMealPicker(true)}
            >
              <Text style={styles.mealDropdownText}>{MEAL_LABELS[selectedMeal]}</Text>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Percent of daily goals ── */}
        <Text style={styles.sectionTitle}>Percent of Daily Goals</Text>
        {[
          { label: 'Calories', value: displayKcal, target: calorieTarget, pct: caloriePct, color: '#1A6FFF' },
          { label: 'Carbs', value: displayCarbs, target: carbsTarget, pct: carbsPct, color: '#00D4D4' },
          { label: 'Protein', value: displayProtein, target: proteinTarget, pct: proteinPct, color: '#FF6B9D' },
          { label: 'Fat', value: displayFat, target: fatTarget, pct: fatPct, color: '#FFB800' },
        ].map((item) => (
          <View key={item.label} style={styles.goalRow}>
            <View style={styles.goalLabelRow}>
              <Text style={styles.goalLabel}>{item.label}</Text>
              <Text style={styles.goalPct}>{item.pct.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.pct}%`, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        {/* ── Nutrition Facts ── */}
        <Text style={styles.sectionTitle}>Nutrition Facts</Text>
        <View style={styles.nutritionTable}>
          {[
            { label: 'Calories', value: displayKcal + ' kcal' },
            { label: 'Total Fat', value: displayFat + 'g' },
            { label: 'Carbohydrates', value: displayCarbs + 'g' },
            { label: 'Protein', value: displayProtein + 'g' },
            { label: 'Sodium', value: '—' },
          ].map((row, index, arr) => (
            <View
              key={row.label}
              style={[
                styles.nutritionRow,
                index < arr.length - 1 && styles.nutritionRowBorder,
              ]}
            >
              <Text style={styles.nutritionLabel}>{row.label}</Text>
              <Text style={styles.nutritionValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : foodLog ? 'Update Entry' : 'Add to Log'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Meal picker modal ── */}
      <Modal
        visible={showMealPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Meal</Text>
            {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.pickerOption,
                  selectedMeal === m && styles.pickerOptionActive,
                ]}
                onPress={() => { setSelectedMeal(m); setShowMealPicker(false); }}
              >
                <Text style={[styles.pickerOptionText, selectedMeal === m && styles.pickerOptionTextActive]}>
                  {MEAL_LABELS[m]}
                </Text>
                {selectedMeal === m && (
                  <Ionicons name="checkmark" size={18} color="#1A6FFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMealPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Unit picker modal ── */}
      <Modal
        visible={showUnitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.pickerOption, unit === u && styles.pickerOptionActive]}
                onPress={() => { setUnit(u); setShowUnitPicker(false); }}
              >
                <Text style={[styles.pickerOptionText, unit === u && styles.pickerOptionTextActive]}>
                  {u}
                </Text>
                {unit === u && <Ionicons name="checkmark" size={18} color="#1A6FFF" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowUnitPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
    textAlign: 'center',
  },

  // Food name
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },

  // Calorie ring + macros
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringKcalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  ringKcalLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  macrosColumn: {
    flex: 1,
    gap: 10,
    paddingLeft: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    minWidth: 48,
  },
  macroLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Section labels
  sectionLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  sectionLabelSmall: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },

  // Serving controls
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 4,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepBtnActive: {
    backgroundColor: '#1A6FFF',
    borderColor: '#1A6FFF',
  },
  servingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    width: 60,
    textAlign: 'center',
  },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    marginLeft: 8,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Time + Meal section
  timeMealRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  timeMealCol: {
    flex: 1,
  },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  lockedText: {
    fontSize: 14,
    color: '#6B7280',
  },
  mealDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  mealDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Progress bars
  goalRow: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  goalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  goalPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Nutrition table
  nutritionTable: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nutritionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#1A1A2E',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 16,
    marginHorizontal: 24,
  },

  // Save button
  saveBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    paddingVertical: 15,
    marginHorizontal: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(26,111,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#1A1A2E',
  },
  pickerOptionTextActive: {
    color: '#1A6FFF',
    fontWeight: '700',
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#F9FAFB',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
  },
});
