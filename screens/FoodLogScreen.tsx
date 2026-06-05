import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { searchFood, lookupBarcode, FoodItem } from '../lib/openfoodfacts';
import { MealType, SavedMeal, FoodLog } from '../types/database';
import Card from '../components/Card';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function FoodLogScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { addLog, todayLogs, removeLog } = useFoodStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);
  const [servingSize, setServingSize] = useState('100');
  const [editLog, setEditLog] = useState<FoodLog | null>(null);

  // Create meal modal state
  const [createMealModal, setCreateMealModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealItems, setMealItems] = useState<FoodItem[]>([]);
  const [mealQuery, setMealQuery] = useState('');
  const [mealResults, setMealResults] = useState<FoodItem[]>([]);

  useEffect(() => { loadSavedMeals(); }, []);

  const loadSavedMeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', user.id);
    if (data) setSavedMeals(data as SavedMeal[]);
  };

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setSearching(true);
    try { setResults(await searchFood(q)); } catch { Alert.alert('Error', 'Search failed. Check your connection.'); }
    setSearching(false);
  };

  const handleBarcode = async (barcode: string) => {
    setScanning(false);
    const item = await lookupBarcode(barcode);
    if (item) { setModalItem(item); setServingSize('100'); }
    else Alert.alert('Not Found', 'Product not found in database.');
  };

  const handleAddFood = async (item: FoodItem, overrideServing?: string) => {
    if (!user) return;
    const ratio = parseFloat(overrideServing ?? servingSize) / 100;
    const today = new Date().toISOString().split('T')[0];
    const entry = {
      user_id: user.id, date: today,
      food_name: item.name, brand: item.brand,
      kcal: Math.round(item.kcal * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
      serving_g: parseFloat(overrideServing ?? servingSize),
      meal_type: selectedMeal, is_saved_meal: false,
    };
    const { data, error } = await supabase.from('food_log').insert(entry).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addLog(data as any);
    setModalItem(null);
  };

  const handleDeleteLog = (log: FoodLog) => {
    Alert.alert('Delete?', `Remove ${log.food_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('food_log').delete().eq('id', log.id);
          removeLog(log.id);
        },
      },
    ]);
  };

  const handleEditLog = async () => {
    if (!editLog) return;
    const ratio = parseFloat(servingSize) / 100;
    const base = modalItem!;
    const updated = {
      serving_g: parseFloat(servingSize),
      kcal: Math.round(base.kcal * ratio),
      protein: Math.round(base.protein * ratio * 10) / 10,
      carbs: Math.round(base.carbs * ratio * 10) / 10,
      fat: Math.round(base.fat * ratio * 10) / 10,
    };
    await supabase.from('food_log').update(updated).eq('id', editLog.id);
    setEditLog(null); setModalItem(null);
    Alert.alert('Updated!', 'Food entry updated.');
  };

  const quickAddSavedMeal = async (meal: SavedMeal) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const items: any[] = (meal.items as any[]).map(item => ({
      user_id: user.id, date: today,
      food_name: item.food_name, brand: item.brand ?? '',
      kcal: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat,
      serving_g: item.serving_g, meal_type: selectedMeal, is_saved_meal: true,
    }));
    const { data } = await supabase.from('food_log').insert(items).select();
    if (data) (data as any[]).forEach(d => addLog(d));
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
    const items = mealItems.map(i => ({ food_name: i.name, brand: i.brand, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, serving_g: i.serving_g }));
    await supabase.from('saved_meals').insert({ user_id: user.id, name: mealName.trim(), items, total_kcal, total_protein, total_carbs, total_fat });
    setCreateMealModal(false); setMealName(''); setMealItems([]);
    loadSavedMeals();
    Alert.alert('Saved!', `${mealName} saved as a meal.`);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Permission', 'Camera permission is required to scan barcodes.'); return; }
    }
    setScanning(true);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    createMealBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    createMealText: { fontSize: 13, fontWeight: '600', color: theme.accent },
    mealRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginVertical: 10 },
    mealChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 5 },
    mealChipText: { fontSize: 12, fontWeight: '700' },
    searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
    input: { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, color: theme.text, fontSize: 15 },
    searchBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
    scanBtn: { backgroundColor: theme.surface2, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
    searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 8, paddingHorizontal: 16, marginTop: 4 },
    resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    resultName: { fontSize: 14, fontWeight: '600', color: theme.text, flex: 1 },
    resultMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    addBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    pill: { backgroundColor: theme.surface2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: theme.border },
    pillText: { color: theme.text, fontSize: 13, fontWeight: '600' },
    pillSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
    logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    logName: { fontSize: 14, fontWeight: '600', color: theme.text, flex: 1 },
    logMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    deleteBtn: { padding: 8 },
    deleteBtnText: { fontSize: 18 },
    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 4 },
    sheetSub: { fontSize: 13, color: theme.muted, marginBottom: 16 },
    sheetLabel: { fontSize: 13, color: theme.muted, marginBottom: 6 },
    sheetInput: { backgroundColor: theme.surface2, borderRadius: 10, padding: 14, color: theme.text, fontSize: 16, marginBottom: 12 },
    sheetBtn: { backgroundColor: theme.accent, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 4 },
    sheetBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    sheetBtnOutline: { borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8, backgroundColor: theme.surface2 },
    macroPreview: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    macroChip: { alignItems: 'center', flex: 1 },
    macroVal: { fontSize: 18, fontWeight: '800', color: theme.text },
    macroLab: { fontSize: 11, color: theme.muted, marginTop: 2 },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    closeScanner: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 10 },
    closeScannerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    scanFrame: { position: 'absolute', top: '30%', left: '15%', right: '15%', height: 200, borderWidth: 2, borderColor: theme.accent, borderRadius: 16 },
    scanHint: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
    scanHintText: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10 },
  });

  if (scanning) {
    return (
      <View style={s.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={({ data }) => handleBarcode(data)}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        />
        <View style={s.scanFrame} />
        <View style={s.scanHint}><Text style={s.scanHintText}>Point camera at a barcode</Text></View>
        <TouchableOpacity style={s.closeScanner} onPress={() => setScanning(false)}>
          <Text style={s.closeScannerText}>✕ Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratio = parseFloat(servingSize || '0') / 100;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Food Log</Text>
        <TouchableOpacity style={s.createMealBtn} onPress={() => setCreateMealModal(true)}>
          <Text style={{ fontSize: 14 }}>🍽</Text>
          <Text style={s.createMealText}>Create Meal</Text>
        </TouchableOpacity>
      </View>

      {/* Meal type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.mealRow}>
          {MEAL_TYPES.map(m => (
            <TouchableOpacity key={m} style={[s.mealChip, { borderColor: selectedMeal === m ? theme.accent : theme.border, backgroundColor: selectedMeal === m ? theme.accent + '18' : theme.surface }]} onPress={() => setSelectedMeal(m)}>
              <Text>{MEAL_ICONS[m]}</Text>
              <Text style={[s.mealChipText, { color: selectedMeal === m ? theme.accent : theme.muted }]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput style={s.input} value={query} onChangeText={setQuery}
          placeholder="Search food..." placeholderTextColor={theme.muted}
          onSubmitEditing={() => handleSearch()} returnKeyType="search" />
        <TouchableOpacity style={s.searchBtn} onPress={() => handleSearch()}>
          {searching ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.searchBtnText}>Go</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.scanBtn} onPress={openScanner}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id || String(i)}
        ListHeaderComponent={
          <>
            {savedMeals.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.sectionTitle}>Saved Meals — Quick Add</Text>
                <FlatList
                  horizontal
                  data={savedMeals}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.pill} onPress={() => quickAddSavedMeal(item)}>
                      <Text style={s.pillText}>{item.name}</Text>
                      <Text style={s.pillSub}>{item.total_kcal} kcal</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            {todayLogs.length > 0 && (
              <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
                <Text style={s.sectionTitle}>Today's Log</Text>
                {todayLogs.map(log => (
                  <View key={log.id} style={s.logItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.logName}>{log.food_name}</Text>
                      <Text style={s.logMeta}>{log.kcal} kcal · {log.serving_g}g</Text>
                    </View>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteLog(log)}>
                      <Text style={s.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}
            {results.length > 0 && <Text style={s.sectionTitle}>Search Results</Text>}
          </>
        }
        renderItem={({ item }) => (
          <View style={s.resultItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.resultName}>{item.name}</Text>
              <Text style={s.resultMeta}>{item.brand ? item.brand + ' · ' : ''}{item.kcal} kcal/100g · P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => { setModalItem(item); setServingSize('100'); setEditLog(null); }}>
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !searching && results.length === 0
            ? <Text style={{ color: theme.muted, textAlign: 'center', padding: 32, fontSize: 14 }}>Search for food to log it</Text>
            : null
        }
      />

      {/* Add/Edit food modal */}
      <Modal visible={!!modalItem} transparent animationType="slide" onRequestClose={() => setModalItem(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{modalItem?.name}</Text>
            <Text style={s.sheetSub}>{modalItem?.brand || 'Generic'} · per 100g: {modalItem?.kcal} kcal</Text>

            <View style={s.macroPreview}>
              {[
                { label: 'Calories', value: Math.round((modalItem?.kcal ?? 0) * ratio) + ' kcal', color: theme.accent },
                { label: 'Protein', value: Math.round((modalItem?.protein ?? 0) * ratio * 10) / 10 + 'g', color: theme.protein },
                { label: 'Carbs', value: Math.round((modalItem?.carbs ?? 0) * ratio * 10) / 10 + 'g', color: theme.carbs },
                { label: 'Fat', value: Math.round((modalItem?.fat ?? 0) * ratio * 10) / 10 + 'g', color: theme.fat },
              ].map(m => (
                <View key={m.label} style={s.macroChip}>
                  <Text style={[s.macroVal, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.macroLab}>{m.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sheetLabel}>Serving size (g)</Text>
            <TextInput style={s.sheetInput} value={servingSize} onChangeText={setServingSize} keyboardType="numeric" />

            <TouchableOpacity style={s.sheetBtn} onPress={() => editLog ? handleEditLog() : handleAddFood(modalItem!)}>
              <Text style={s.sheetBtnText}>{editLog ? 'Update Entry' : 'Log Food'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetBtnOutline} onPress={() => { setModalItem(null); setEditLog(null); }}>
              <Text style={{ color: theme.muted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Meal modal */}
      <Modal visible={createMealModal} transparent animationType="slide" onRequestClose={() => setCreateMealModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Create Saved Meal</Text>
            <Text style={s.sheetSub}>Combine multiple foods into a reusable meal</Text>
            <Text style={s.sheetLabel}>Meal name</Text>
            <TextInput style={s.sheetInput} value={mealName} onChangeText={setMealName} placeholder="e.g. Post-workout shake" placeholderTextColor={theme.muted} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[s.sheetInput, { flex: 1, marginBottom: 0 }]}
                value={mealQuery} onChangeText={setMealQuery}
                placeholder="Search food to add..." placeholderTextColor={theme.muted}
                onSubmitEditing={async () => {
                  if (!mealQuery.trim()) return;
                  const items = await searchFood(mealQuery);
                  setMealResults(items.slice(0, 5));
                }}
              />
              <TouchableOpacity style={[s.sheetBtn, { paddingHorizontal: 16, marginTop: 0 }]} onPress={async () => {
                const items = await searchFood(mealQuery);
                setMealResults(items.slice(0, 5));
              }}>
                <Text style={s.sheetBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
            {mealResults.map((item, i) => (
              <TouchableOpacity key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' }}
                onPress={() => { setMealItems(prev => [...prev, item]); setMealResults([]); setMealQuery(''); }}>
                <Text style={{ color: theme.text, fontSize: 14 }}>{item.name}</Text>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>+ Add</Text>
              </TouchableOpacity>
            ))}
            {mealItems.length > 0 && (
              <View style={{ marginTop: 8, marginBottom: 8 }}>
                <Text style={[s.sheetLabel, { marginBottom: 8 }]}>Items in this meal:</Text>
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
            <TouchableOpacity style={s.sheetBtn} onPress={saveMeal}>
              <Text style={s.sheetBtnText}>Save Meal ({mealItems.reduce((s, i) => s + i.kcal, 0)} kcal)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetBtnOutline} onPress={() => setCreateMealModal(false)}>
              <Text style={{ color: theme.muted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
