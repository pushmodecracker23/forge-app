import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import { searchFood, lookupBarcode, FoodItem } from '../lib/openfoodfacts';
import { MealType, SavedMeal, FoodLog } from '../types/database';
import GradientBg from '../components/GradientBg';
import MacroRing from '../components/MacroRing';
import { Ionicons } from '@expo/vector-icons';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
type IoniconName = 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' | 'cafe-outline';
const MEAL_ICONS: Record<MealType, IoniconName> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const NUTRITION_TIPS = [
  'High in protein 💪',
  'Good source of fiber 🌿',
  'Rich in vitamins 🍊',
  'Low in calories ✅',
];

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function dateLabel(date: Date) {
  const today = new Date();
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (formatDate(date) === formatDate(today)) return `Today, ${dateStr}`;
  return dateStr;
}

export default function FoodLogScreen({ navigation }: { navigation?: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { addLog, setTodayLogs } = useFoodStore();
  const { profile } = useProfileStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  // Date navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const isToday = formatDate(currentDate) === formatDate(new Date());

  // Food log grouped by meal
  const [foodByMeal, setFoodByMeal] = useState<Record<MealType, FoodLog[]>>({
    breakfast: [], lunch: [], dinner: [], snack: [],
  });

  // Add food modal state
  const [addingToMeal, setAddingToMeal] = useState<MealType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);
  const [servingSize, setServingSize] = useState('100');
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealType>('lunch');

  // Saved meals
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  // Create saved meal modal
  const [createMealModal, setCreateMealModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealItems, setMealItems] = useState<FoodItem[]>([]);
  const [mealQuery, setMealQuery] = useState('');
  const [mealResults, setMealResults] = useState<FoodItem[]>([]);

  const loadFoodLogs = useCallback(async (date: Date) => {
    if (!user) return;
    const { data } = await supabase
      .from('food_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formatDate(date))
      .order('created_at', { ascending: true });
    const logs = (data ?? []) as FoodLog[];
    const grouped: Record<MealType, FoodLog[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [],
    };
    logs.forEach(log => {
      if (grouped[log.meal_type]) grouped[log.meal_type].push(log);
    });
    setFoodByMeal(grouped);
    if (isToday) setTodayLogs(logs);
  }, [user, isToday, setTodayLogs]);

  useEffect(() => {
    loadFoodLogs(currentDate);
  }, [currentDate, user]);

  // Reload when navigating back from AddFoodScreen / FoodDetailScreen
  useFocusEffect(useCallback(() => {
    loadFoodLogs(currentDate);
  }, [currentDate, user]));

  useEffect(() => {
    loadSavedMeals();
  }, [user]);

  const loadSavedMeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', user.id);
    if (data) setSavedMeals(data as SavedMeal[]);
  };

  const changeDay = (delta: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
  };

  const handleSearch = async (q = searchQuery) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      setSearchResults(await searchFood(q));
    } catch {
      Alert.alert('Error', 'Search failed. Check your connection.');
    }
    setSearching(false);
  };

  const handleBarcode = async (barcode: string) => {
    setScanning(false);
    const item = await lookupBarcode(barcode);
    if (item) {
      setModalItem(item);
      setServingSize('100');
    } else {
      Alert.alert('Not Found', 'Product not found in database.');
    }
  };

  const handleAddFood = async (item: FoodItem) => {
    if (!user) return;
    const ratio = parseFloat(servingSize) / 100;
    const meal = addingToMeal ?? selectedMealForAdd;
    const entry = {
      user_id: user.id,
      date: formatDate(currentDate),
      food_name: item.name,
      brand: item.brand ?? '',
      kcal: Math.round(item.kcal * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
      serving_g: parseFloat(servingSize),
      meal_type: meal,
      is_saved_meal: false,
    };
    const { data, error } = await supabase.from('food_log').insert(entry).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addLog(data as FoodLog);
    setModalItem(null);
    setSearchQuery('');
    setSearchResults([]);
    await loadFoodLogs(currentDate);
  };

  const handleDeleteLog = (log: FoodLog) => {
    Alert.alert('Delete?', `Remove ${log.food_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('food_log').delete().eq('id', log.id);
          await loadFoodLogs(currentDate);
        },
      },
    ]);
  };

  const quickAddSavedMeal = async (meal: SavedMeal) => {
    if (!user) return;
    const dateStr = formatDate(currentDate);
    const items: any[] = (meal.items as any[]).map(item => ({
      user_id: user.id, date: dateStr,
      food_name: item.food_name, brand: item.brand ?? '',
      kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat,
      serving_g: item.serving_g, meal_type: selectedMealForAdd, is_saved_meal: true,
    }));
    const { data } = await supabase.from('food_log').insert(items).select();
    if (data) (data as FoodLog[]).forEach(d => addLog(d));
    await loadFoodLogs(currentDate);
    Alert.alert('Added!', `${meal.name} logged.`);
  };

  const saveMeal = async () => {
    if (!user || !mealName.trim() || mealItems.length === 0) {
      Alert.alert('Error', 'Add a name and at least one food item');
      return;
    }
    const total_kcal = mealItems.reduce((s, i) => s + i.kcal, 0);
    const total_protein = mealItems.reduce((s, i) => s + i.protein, 0);
    const total_carbs = mealItems.reduce((s, i) => s + i.carbs, 0);
    const total_fat = mealItems.reduce((s, i) => s + i.fat, 0);
    const items = mealItems.map(i => ({
      food_name: i.name, brand: i.brand, kcal: i.kcal,
      protein: i.protein, carbs: i.carbs, fat: i.fat, serving_g: i.serving_g ?? 100,
    }));
    await supabase.from('saved_meals').insert({
      user_id: user.id, name: mealName.trim(), items,
      total_kcal, total_protein, total_carbs, total_fat,
    });
    setCreateMealModal(false); setMealName(''); setMealItems([]);
    loadSavedMeals();
    Alert.alert('Saved!', `${mealName} saved as a meal.`);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Permission', 'Camera permission is required.'); return; }
    }
    setScanning(true);
  };

  // Totals
  const allLogs = [...foodByMeal.breakfast, ...foodByMeal.lunch, ...foodByMeal.dinner, ...foodByMeal.snack];
  const carbsEaten = Math.round(allLogs.reduce((s, l) => s + l.carbs, 0));
  const proteinEaten = Math.round(allLogs.reduce((s, l) => s + l.protein, 0));
  const fatEaten = Math.round(allLogs.reduce((s, l) => s + l.fat, 0));

  const ratio = parseFloat(servingSize || '0') / 100;

  // ── Barcode scanner full-screen ──────────────────────────────────────────────
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={({ data }) => handleBarcode(data)}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        />
        <View style={{
          position: 'absolute', top: '30%', left: '15%', right: '15%',
          height: 200, borderWidth: 2, borderColor: theme.accent, borderRadius: 16,
        }} />
        <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10 }}>
            Point camera at a barcode
          </Text>
        </View>
        <TouchableOpacity
          style={{ position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 10 }}
          onPress={() => setScanning(false)}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕ Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GradientBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Food Log</Text>
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{dateLabel(currentDate)}</Text>
            <TouchableOpacity onPress={() => changeDay(1)} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Macro Goals Card ── */}
          <View style={styles.macroCard}>
            <View style={styles.macroCardHeader}>
              <Text style={styles.macroCardTitle}>Macro Goals</Text>
              <TouchableOpacity onPress={() => setCreateMealModal(true)}>
                <Text style={styles.macroCardDots}>...</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.macroRingRow}>
              <MacroRing
                grams={carbsEaten}
                target={profile?.carbs_target ?? 216}
                color="#00D4D4"
                label="Carbs"
                size={90}
              />
              <MacroRing
                grams={proteinEaten}
                target={profile?.protein_target ?? 147}
                color="#FF6B9D"
                label="Protein"
                size={90}
              />
              <MacroRing
                grams={fatEaten}
                target={profile?.fat_target ?? 38}
                color="#FFB800"
                label="Fat"
                size={90}
              />
            </View>
          </View>

          {/* ── Saved Meals Quick Add ── */}
          {savedMeals.length > 0 && (
            <View style={styles.quickAddRow}>
              <Text style={styles.quickAddLabel}>Quick Add:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {savedMeals.map(meal => (
                  <TouchableOpacity key={meal.id} style={styles.savedMealPill} onPress={() => quickAddSavedMeal(meal)}>
                    <Text style={styles.savedMealPillText}>{meal.name}</Text>
                    <Text style={styles.savedMealPillSub}>{meal.total_kcal} kcal</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Meal Sections ── */}
          {MEAL_TYPES.map(meal => {
            const items = foodByMeal[meal];
            const totalKcal = items.reduce((s, l) => s + l.kcal, 0);
            const tipIndex = Math.floor(Math.random() * NUTRITION_TIPS.length);

            return (
              <View key={meal} style={styles.mealSection}>
                {/* Blue header card */}
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <Ionicons name={MEAL_ICONS[meal]} size={20} color="#FFF" style={{ marginRight: 4 }} />
                    <View>
                      <Text style={styles.mealName}>{MEAL_LABELS[meal]}</Text>
                      <Text style={styles.mealKcal}>{totalKcal > 0 ? `${totalKcal} kcal` : 'No food logged'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.mealAddBtn}
                    onPress={() => {
                      if (navigation) {
                        navigation.navigate('AddFood', { mealType: meal, date: formatDate(currentDate) });
                      } else {
                        setAddingToMeal(meal);
                        setSelectedMealForAdd(meal);
                        setSearchQuery(''); setSearchResults([]); setModalItem(null);
                      }
                    }}
                  >
                    <Ionicons name="add" size={18} color="#1A6FFF" />
                  </TouchableOpacity>
                </View>

                {/* White content area */}
                <View style={styles.mealContent}>
                  {items.length === 0 ? (
                    <Text style={styles.emptyMealText}>Tap + to add food</Text>
                  ) : (
                    items.map((log, idx) => (
                      <TouchableOpacity
                        key={log.id}
                        style={[styles.foodItem, idx < items.length - 1 && styles.foodItemBorder]}
                        onPress={() => navigation?.navigate('FoodDetail', { foodLog: log, mealType: log.meal_type, date: formatDate(currentDate) })}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.foodItemRow}>
                            <Text style={styles.foodItemName}>{log.food_name}</Text>
                            <Text style={styles.foodItemKcal}>{log.kcal} kcal</Text>
                          </View>
                          <Text style={styles.foodItemMeta}>{log.serving_g}g · P {log.protein}g · C {log.carbs}g · F {log.fat}g</Text>
                          {idx === 0 && items.length > 0 && (
                            <View style={styles.tipBadge}>
                              <Text style={styles.tipBadgeText}>{NUTRITION_TIPS[tipIndex]}</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteLog(log)}>
                          <Ionicons name="trash-outline" size={16} color="#F44336" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ── Add Food Modal (bottom sheet) ── */}
        <Modal
          visible={addingToMeal !== null}
          transparent
          animationType="slide"
          onRequestClose={() => { setAddingToMeal(null); setModalItem(null); setSearchResults([]); setSearchQuery(''); }}
        >
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              {/* Search bar */}
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search food..."
                  placeholderTextColor={theme.muted}
                  onSubmitEditing={() => handleSearch()}
                  returnKeyType="search"
                  autoFocus
                />
                <TouchableOpacity onPress={openScanner} style={styles.barcodeBtn}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </TouchableOpacity>
                {searching
                  ? <ActivityIndicator color={theme.accent} style={{ marginLeft: 8 }} />
                  : (
                    <TouchableOpacity onPress={() => handleSearch()} style={styles.goBtn}>
                      <Text style={styles.goBtnText}>Go</Text>
                    </TouchableOpacity>
                  )
                }
              </View>

              {/* Scanned item card */}
              {modalItem && (
                <View style={styles.scannedCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scannedName}>{modalItem.name}</Text>
                    <Text style={styles.scannedBrand}>{modalItem.brand || 'Generic'} · {modalItem.kcal} kcal/100g</Text>
                    <View style={styles.macroPillRow}>
                      {[
                        { label: 'P', value: Math.round((modalItem.protein) * (parseFloat(servingSize) / 100) * 10) / 10 + 'g', color: theme.protein },
                        { label: 'C', value: Math.round((modalItem.carbs) * (parseFloat(servingSize) / 100) * 10) / 10 + 'g', color: theme.carbs },
                        { label: 'F', value: Math.round((modalItem.fat) * (parseFloat(servingSize) / 100) * 10) / 10 + 'g', color: theme.fat },
                      ].map(m => (
                        <View key={m.label} style={[styles.macroPill, { borderColor: m.color }]}>
                          <Text style={[styles.macroPillText, { color: m.color }]}>{m.label}: {m.value}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.servingRow}>
                      <Text style={styles.servingLabel}>Serving (g):</Text>
                      <TextInput
                        style={styles.servingInput}
                        value={servingSize}
                        onChangeText={setServingSize}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.addCircleBtn} onPress={() => handleAddFood(modalItem)}>
                    <Text style={styles.addCircleBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Results list */}
              <FlatList
                data={searchResults}
                keyExtractor={(item, i) => item.id || String(i)}
                style={{ maxHeight: 320 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  !searching && searchQuery.length > 0
                    ? <Text style={{ color: theme.muted, textAlign: 'center', padding: 20 }}>No results found</Text>
                    : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => { setModalItem(item); setServingSize('100'); }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultMeta}>{item.brand ? item.brand + ' · ' : ''}{item.serving_g ?? 100}g</Text>
                    </View>
                    <Text style={styles.resultKcal}>{item.kcal}</Text>
                    <Text style={styles.resultKcalUnit}> kcal</Text>
                    <TouchableOpacity
                      style={styles.addCircleSmall}
                      onPress={() => { setModalItem(item); setServingSize('100'); }}
                    >
                      <Text style={styles.addCircleSmallText}>+</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setAddingToMeal(null); setModalItem(null); setSearchResults([]); setSearchQuery(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Create Saved Meal Modal ── */}
        <Modal
          visible={createMealModal}
          transparent
          animationType="slide"
          onRequestClose={() => setCreateMealModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Create Saved Meal</Text>
              <Text style={styles.sheetSub}>Combine multiple foods into a reusable meal</Text>

              <TextInput
                style={styles.sheetInput}
                value={mealName}
                onChangeText={setMealName}
                placeholder="Meal name (e.g. Post-workout shake)"
                placeholderTextColor={theme.muted}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={[styles.sheetInput, { flex: 1, marginBottom: 0 }]}
                  value={mealQuery}
                  onChangeText={setMealQuery}
                  placeholder="Search food to add..."
                  placeholderTextColor={theme.muted}
                  onSubmitEditing={async () => {
                    if (!mealQuery.trim()) return;
                    setMealResults((await searchFood(mealQuery)).slice(0, 5));
                  }}
                />
                <TouchableOpacity
                  style={[styles.goBtn, { paddingHorizontal: 16 }]}
                  onPress={async () => {
                    setMealResults((await searchFood(mealQuery)).slice(0, 5));
                  }}
                >
                  <Text style={styles.goBtnText}>Go</Text>
                </TouchableOpacity>
              </View>

              {mealResults.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.mealResultRow}
                  onPress={() => { setMealItems(prev => [...prev, item]); setMealResults([]); setMealQuery(''); }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{item.name}</Text>
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>+ Add</Text>
                </TouchableOpacity>
              ))}

              {mealItems.length > 0 && (
                <View style={{ marginVertical: 8 }}>
                  <Text style={styles.sheetLabel}>Items in this meal:</Text>
                  {mealItems.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: theme.text, flex: 1 }}>{item.name}</Text>
                      <Text style={{ color: theme.muted }}>{item.kcal} kcal</Text>
                      <TouchableOpacity onPress={() => setMealItems(prev => prev.filter((_, idx) => idx !== i))}>
                        <Text style={{ color: theme.error, marginLeft: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.sheetBtn} onPress={saveMeal}>
                <Text style={styles.sheetBtnText}>
                  Save Meal ({mealItems.reduce((s, i) => s + i.kcal, 0)} kcal)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateMealModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  dateLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },

  // Macro card
  macroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  macroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  macroCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  macroCardDots: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 2,
  },
  macroRingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  // Quick add
  quickAddRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickAddLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  savedMealPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  savedMealPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  savedMealPillSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Meal section
  mealSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mealHeader: {
    backgroundColor: '#1A6FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIcon: {
    fontSize: 20,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mealKcal: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  mealAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealAddBtnText: {
    color: '#1A6FFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  mealContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  emptyMealText: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  foodItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
    marginRight: 8,
  },
  foodItemKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  foodItemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6FBF4',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  tipBadgeText: {
    color: '#00C48C',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  deleteBtnText: {
    fontSize: 16,
  },

  // Add food modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    paddingVertical: 10,
  },
  barcodeBtn: {
    padding: 4,
  },
  goBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  goBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  resultKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A6FFF',
  },
  resultKcalUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  addCircleSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addCircleSmallText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  // Scanned item card
  scannedCard: {
    backgroundColor: '#F0F6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5DBFF',
  },
  scannedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  scannedBrand: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  macroPill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  macroPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  servingInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    width: 70,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  addCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  addCircleBtnText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F9FAFB',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
  },
  // Create meal modal extras
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },
  sheetLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  sheetInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    color: '#1A1A2E',
    fontSize: 15,
    marginBottom: 10,
  },
  sheetBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mealResultRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
