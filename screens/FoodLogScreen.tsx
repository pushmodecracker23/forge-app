import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import { searchFood, lookupBarcode, FoodItem } from '../lib/openfoodfacts';
import { MealType, SavedMeal } from '../types/database';
import Card from '../components/Card';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodLogScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { addLog } = useFoodStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [modalItem, setModalItem] = useState<FoodItem | null>(null);
  const [servingSize, setServingSize] = useState('100');

  useEffect(() => {
    loadSavedMeals();
  }, []);

  const loadSavedMeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', user.id);
    if (data) setSavedMeals(data as SavedMeal[]);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const items = await searchFood(query);
      setResults(items);
    } catch {
      Alert.alert('Error', 'Search failed. Check your connection.');
    }
    setSearching(false);
  };

  const handleAddFood = async (item: FoodItem) => {
    if (!user) return;
    const ratio = parseFloat(servingSize) / 100;
    const today = new Date().toISOString().split('T')[0];

    const entry = {
      user_id: user.id,
      date: today,
      food_name: item.name,
      brand: item.brand,
      kcal: Math.round(item.kcal * ratio),
      protein: Math.round(item.protein * ratio * 10) / 10,
      carbs: Math.round(item.carbs * ratio * 10) / 10,
      fat: Math.round(item.fat * ratio * 10) / 10,
      serving_g: parseFloat(servingSize),
      meal_type: selectedMeal,
      is_saved_meal: false,
    };

    const { data, error } = await supabase.from('food_log').insert(entry).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    if (data) addLog(data as any);
    setModalItem(null);
    Alert.alert('Added!', `${item.name} logged.`);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 0 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    searchRow: { flexDirection: 'row', gap: 8, padding: 16 },
    input: {
      flex: 1,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      color: theme.text,
      fontSize: 15,
    },
    searchBtn: { backgroundColor: theme.accent, borderRadius: 12, padding: 12, justifyContent: 'center' },
    searchBtnText: { color: '#FFF', fontWeight: '700' },
    mealRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    mealChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    mealChipText: { fontSize: 13, fontWeight: '600' },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    resultName: { fontSize: 14, fontWeight: '600', color: theme.text, flex: 1 },
    resultMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
    addBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8, paddingHorizontal: 16 },
    pill: {
      backgroundColor: theme.surface2,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillText: { color: theme.text, fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: theme.muted, marginBottom: 16 },
    modalLabel: { fontSize: 13, color: theme.muted, marginBottom: 6 },
    modalInput: {
      backgroundColor: theme.surface2,
      borderRadius: 10,
      padding: 12,
      color: theme.text,
      fontSize: 15,
      marginBottom: 16,
    },
    modalBtn: { backgroundColor: theme.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
    modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><Text style={s.title}>Food Log</Text></View>

      <View style={s.mealRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.mealChip, { borderColor: selectedMeal === m ? theme.accent : theme.border, backgroundColor: selectedMeal === m ? theme.accent + '20' : theme.surface }]}
            onPress={() => setSelectedMeal(m)}
          >
            <Text style={[s.mealChipText, { color: selectedMeal === m ? theme.accent : theme.muted }]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search food..."
          placeholderTextColor={theme.muted}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
          {searching ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.searchBtnText}>Go</Text>}
        </TouchableOpacity>
      </View>

      {savedMeals.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Saved Meals</Text>
          <FlatList
            horizontal
            data={savedMeals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.pill}>
                <Text style={s.pillText}>{item.name}</Text>
                <Text style={[s.pillText, { color: theme.muted, fontSize: 11 }]}>{item.total_kcal} kcal</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={({ item }) => (
          <View style={s.resultItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.resultName}>{item.name}</Text>
              <Text style={s.resultMeta}>{item.brand} · {item.kcal} kcal/100g · P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => { setModalItem(item); setServingSize('100'); }}>
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !searching ? <Text style={{ color: theme.muted, textAlign: 'center', padding: 32 }}>Search for food to log</Text> : null
        }
      />

      <Modal visible={!!modalItem} transparent animationType="slide" onRequestClose={() => setModalItem(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{modalItem?.name}</Text>
            <Text style={s.modalSub}>{modalItem?.brand}</Text>
            <Text style={s.modalLabel}>Serving size (g)</Text>
            <TextInput
              style={s.modalInput}
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="numeric"
            />
            <Text style={[s.modalSub, { marginBottom: 16 }]}>
              {Math.round((modalItem?.kcal ?? 0) * parseFloat(servingSize || '0') / 100)} kcal ·
              P {Math.round((modalItem?.protein ?? 0) * parseFloat(servingSize || '0') / 10) / 10}g ·
              C {Math.round((modalItem?.carbs ?? 0) * parseFloat(servingSize || '0') / 10) / 10}g ·
              F {Math.round((modalItem?.fat ?? 0) * parseFloat(servingSize || '0') / 10) / 10}g
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => modalItem && handleAddFood(modalItem)}>
              <Text style={s.modalBtnText}>Log Food</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
