import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { searchFood, lookupBarcode, FoodItem } from '../lib/openfoodfacts';
import { MealType, FoodLog } from '../types/database';
import GradientBg from '../components/GradientBg';

type Tab = 'recent' | 'favorites';

interface Props {
  navigation: any;
  route: {
    params: {
      mealType: MealType;
      date: string;
      onFoodAdded?: () => void;
    };
  };
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function AddFoodScreen({ navigation, route }: Props) {
  const { mealType, date, onFoodAdded } = route.params;
  const theme = useTheme();
  const { user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scannedItem, setScannedItem] = useState<FoodItem | null>(null);
  const [showScannedModal, setShowScannedModal] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [addingId, setAddingId] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null);

  interface RecentItem {
    food_name: string;
    brand: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_g: number;
  }

  const loadRecentItems = useCallback(async () => {
    if (!user) return;
    setLoadingRecent(true);
    try {
      const { data } = await supabase
        .from('food_log')
        .select('food_name, brand, kcal, protein, carbs, fat, serving_g')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);

      if (data) {
        const seen = new Set<string>();
        const unique: RecentItem[] = [];
        for (const item of data as RecentItem[]) {
          if (!seen.has(item.food_name)) {
            seen.add(item.food_name);
            unique.push(item);
            if (unique.length >= 20) break;
          }
        }
        setRecentItems(unique);
      }
    } catch {
      // silently fail
    }
    setLoadingRecent(false);
  }, [user]);

  useEffect(() => {
    loadRecentItems();
  }, [loadRecentItems]);

  const handleSearch = async (q = searchQuery) => {
    if (!q.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const results = await searchFood(q.trim());
      setSearchResults(results);
    } catch {
      Alert.alert('Error', 'Search failed. Check your connection.');
    }
    setSearching(false);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan barcodes.');
        return;
      }
    }
    setScanning(true);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScanning(false);
    const item = await lookupBarcode(barcode);
    if (item) {
      setScannedItem(item);
      setShowScannedModal(true);
    } else {
      Alert.alert('Not Found', 'This product was not found in the database.');
    }
  };

  const addFoodItem = async (item: FoodItem | RecentItem) => {
    if (!user) return;
    const key = 'id' in item ? (item as FoodItem).id : (item as RecentItem).food_name;
    setAddingId(key);
    try {
      await supabase.from('food_log').insert({
        user_id: user.id,
        date: date,
        food_name: ('food_name' in item ? item.food_name : (item as any).name) || '',
        brand: item.brand || '',
        kcal: Math.round(item.kcal),
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        serving_g: item.serving_g || 100,
        meal_type: mealType,
        is_saved_meal: false,
      });
      if (onFoodAdded) onFoodAdded();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to add food. Please try again.');
    }
    setAddingId(null);
  };

  const addFoodItemFromSearch = async (item: FoodItem) => {
    if (!user) return;
    setAddingId(item.id);
    try {
      await supabase.from('food_log').insert({
        user_id: user.id,
        date: date,
        food_name: item.name,
        brand: item.brand || '',
        kcal: Math.round(item.kcal),
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        serving_g: item.serving_g || 100,
        meal_type: mealType,
        is_saved_meal: false,
      });
      if (onFoodAdded) onFoodAdded();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to add food. Please try again.');
    }
    setAddingId(null);
  };

  const navigateToFoodDetail = (item: FoodItem) => {
    navigation.navigate('FoodDetail', {
      foodItem: item,
      mealType,
      date,
    });
  };

  const isSearchMode = searchQuery.length > 0 || hasSearched;
  const displayList: FoodItem[] = isSearchMode ? searchResults : [];

  // ── Barcode scanner full-screen ─────────────────────────────────────────────
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" />
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={({ data }) => handleBarcodeScan(data)}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
        </View>
        <View style={styles.scannerHintContainer}>
          <Text style={styles.scannerHint}>Point camera at a barcode</Text>
        </View>
        <TouchableOpacity
          style={styles.scannerCloseBtn}
          onPress={() => setScanning(false)}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GradientBg>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add {MEAL_LABELS[mealType]}</Text>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ── Main white card ── */}
          <View style={styles.mainCard}>
            {/* Search row */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  if (!t.trim()) {
                    setHasSearched(false);
                    setSearchResults([]);
                  }
                }}
                placeholder="Search food..."
                placeholderTextColor="#6B7280"
                returnKeyType="search"
                onSubmitEditing={() => handleSearch()}
                autoFocus
              />
              {searching && <ActivityIndicator color="#1A6FFF" style={{ marginRight: 8 }} />}
              <TouchableOpacity style={styles.barcodeBtn} onPress={openScanner}>
                <Ionicons name="barcode-outline" size={22} color="#1A6FFF" />
              </TouchableOpacity>
            </View>

            {/* Tabs row */}
            <View style={styles.tabsRow}>
              <View style={styles.tabPills}>
                <TouchableOpacity
                  style={[styles.pill, activeTab === 'recent' && styles.pillActive]}
                  onPress={() => setActiveTab('recent')}
                >
                  <Text style={[styles.pillText, activeTab === 'recent' && styles.pillTextActive]}>
                    Recent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, activeTab === 'favorites' && styles.pillActive]}
                  onPress={() => setActiveTab('favorites')}
                >
                  <Text style={[styles.pillText, activeTab === 'favorites' && styles.pillTextActive]}>
                    Favorites
                  </Text>
                </TouchableOpacity>
              </View>
              <Ionicons name="filter-outline" size={20} color="#6B7280" />
            </View>

            {/* Food list */}
            {isSearchMode ? (
              <FlatList
                data={displayList}
                keyExtractor={(item, i) => item.id || String(i)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  !searching && hasSearched ? (
                    <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <View>
                    <View style={styles.foodRow}>
                      <TouchableOpacity
                        style={styles.foodRowLeft}
                        onPress={() => navigateToFoodDetail(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.foodKcal}>{item.kcal} cals</Text>
                        <Text style={styles.foodMeta}>
                          {item.serving_g ? `${item.serving_g}g` : '100g'}
                          {item.brand ? ` · ${item.brand}` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addCircle}
                        onPress={() => addFoodItemFromSearch(item)}
                        disabled={addingId === item.id}
                      >
                        {addingId === item.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                    {index < displayList.length - 1 && <View style={styles.separator} />}
                  </View>
                )}
              />
            ) : activeTab === 'recent' ? (
              loadingRecent ? (
                <ActivityIndicator color="#1A6FFF" style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={recentItems}
                  keyExtractor={(item, i) => item.food_name + i}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No recent items yet. Search for food above.</Text>
                  }
                  renderItem={({ item, index }) => (
                    <View>
                      <View style={styles.foodRow}>
                        <View style={styles.foodRowLeft}>
                          <Text style={styles.foodName} numberOfLines={1}>{item.food_name}</Text>
                          <Text style={styles.foodKcal}>{Math.round(item.kcal)} cals</Text>
                          <Text style={styles.foodMeta}>
                            {item.serving_g ? `${item.serving_g}g` : '100g'}
                            {item.brand ? ` · ${item.brand}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addCircle}
                          onPress={() => addFoodItem(item)}
                          disabled={addingId === item.food_name}
                        >
                          {addingId === item.food_name ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="add" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                      {index < recentItems.length - 1 && <View style={styles.separator} />}
                    </View>
                  )}
                />
              )
            ) : (
              <View style={styles.favoritesEmpty}>
                <Ionicons name="heart-outline" size={40} color="#6B7280" />
                <Text style={styles.emptyText}>No favorites yet</Text>
              </View>
            )}
          </View>

          {/* ── Sticky bottom barcode bar ── */}
          <TouchableOpacity style={styles.stickyBar} onPress={openScanner}>
            <Text style={styles.stickyBarText}>Scan Barcode</Text>
            <Ionicons name="barcode-outline" size={22} color="#1A6FFF" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Scanned item modal ── */}
      <Modal
        visible={showScannedModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowScannedModal(false); setScannedItem(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Found Product</Text>
            {scannedItem && (
              <>
                <Text style={styles.scannedName}>{scannedItem.name}</Text>
                <Text style={styles.scannedBrand}>
                  {scannedItem.brand || 'Generic'} · {scannedItem.kcal} kcal / 100g
                </Text>
                <View style={styles.macroPillRow}>
                  {[
                    { label: 'Protein', value: `${scannedItem.protein}g`, color: '#FF6B9D' },
                    { label: 'Carbs', value: `${scannedItem.carbs}g`, color: '#00D4D4' },
                    { label: 'Fat', value: `${scannedItem.fat}g`, color: '#FFB800' },
                  ].map((m) => (
                    <View key={m.label} style={[styles.macroPill, { borderColor: m.color }]}>
                      <Text style={[styles.macroPillText, { color: m.color }]}>
                        {m.label}: {m.value}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    setShowScannedModal(false);
                    if (scannedItem) addFoodItemFromSearch(scannedItem);
                  }}
                >
                  <Text style={styles.addBtnText}>Add to {MEAL_LABELS[mealType]}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowScannedModal(false); setScannedItem(null); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GradientBg>
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
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },

  // Main card
  mainCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    paddingVertical: 4,
  },
  barcodeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26,111,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pillActive: {
    backgroundColor: '#1A6FFF',
    borderColor: '#1A6FFF',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  // Food items
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  foodKcal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A6FFF',
    marginBottom: 2,
  },
  foodMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  addCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  favoritesEmpty: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 12,
  },

  // Sticky bottom bar
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stickyBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A6FFF',
  },

  // Scanner
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: '70%',
    height: 200,
    borderWidth: 2,
    borderColor: '#1A6FFF',
    borderRadius: 16,
  },
  scannerHintContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scannerCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 10,
  },

  // Scanned item modal
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
    marginBottom: 12,
  },
  scannedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  scannedBrand: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  macroPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  macroPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
  },
});
