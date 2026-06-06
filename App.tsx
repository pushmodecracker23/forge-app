import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider, useTheme } from './lib/theme';
import { supabase } from './lib/supabase';
import { useProfileStore } from './store/profileStore';
import { Profile } from './types/database';
import CustomTabBar from './components/CustomTabBar';

import AuthScreen from './screens/AuthScreen';
import EmailVerificationScreen from './screens/EmailVerificationScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import FoodLogScreen from './screens/FoodLogScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import ActivityDetailScreen from './screens/ActivityDetailScreen';
import AddExerciseScreen from './screens/AddExerciseScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import FoodDetailScreen from './screens/FoodDetailScreen';
import ConnectWearableScreen from './screens/ConnectWearableScreen';
import ProgressScreen from './screens/ProgressScreen';
import MotivationScreen from './screens/MotivationScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── FAB Action Sheet ─────────────────────────────────────────────────────────

interface FabOption {
  label: string;
  iconName: string;
  iconSet: 'Ionicons' | 'MaterialCommunityIcons';
  bg: string;
  onPress: () => void;
}

interface FabModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

function FabModal({ visible, onClose, onNavigate }: FabModalProps) {
  const options: FabOption[] = [
    {
      label: 'Weight',
      iconName: 'scale-balance',
      iconSet: 'MaterialCommunityIcons',
      bg: '#00C48C',
      onPress: () => { onClose(); onNavigate('Stats'); },
    },
    {
      label: 'Water',
      iconName: 'water-outline',
      iconSet: 'Ionicons',
      bg: '#1A6FFF',
      onPress: () => {
        onClose();
        Alert.alert('Water', 'Track your water intake on the Dashboard screen.');
      },
    },
    {
      label: 'Food',
      iconName: 'restaurant-outline',
      iconSet: 'Ionicons',
      bg: '#FF6B9D',
      onPress: () => { onClose(); onNavigate('Log'); },
    },
    {
      label: 'Exercise',
      iconName: 'barbell-outline',
      iconSet: 'Ionicons',
      bg: '#FFB800',
      onPress: () => { onClose(); onNavigate('Workout'); },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableOpacity
        style={fab.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Bottom sheet */}
      <View style={fab.sheet}>
        {/* Handle pill */}
        <View style={fab.handle} />

        <Text style={fab.title}>Add to your day</Text>

        {/* 2×2 grid */}
        <View style={fab.grid}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={fab.gridItem}
              onPress={opt.onPress}
              activeOpacity={0.8}
            >
              <View style={[fab.iconCircle, { backgroundColor: opt.bg }]}>
                {opt.iconSet === 'Ionicons'
                  ? <Ionicons name={opt.iconName as any} size={26} color="#FFF" />
                  : <MaterialCommunityIcons name={opt.iconName as any} size={26} color="#FFF" />
                }
              </View>
              <Text style={fab.gridLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cancel */}
        <TouchableOpacity style={fab.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={fab.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const fab = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    // shadow upward
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 20,
    marginBottom: 24,
  },
  gridItem: {
    width: '45%',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

function MainTabs({ navigation: parentNav }: { navigation: any }) {
  const [fabOpen, setFabOpen] = useState(false);
  const theme = useTheme();

  const handleNavigate = (screen: string) => {
    // Tab screens
    if (['Home', 'Log', 'Stats', 'Profile'].includes(screen)) {
      // Navigate within the tab navigator
      parentNav.navigate(screen);
    } else {
      // Stack screens (e.g. Workout)
      parentNav.navigate(screen);
    }
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomTabBar {...props} onFabPress={() => setFabOpen(true)} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Log" component={FoodLogScreen} />
        <Tab.Screen name="Stats" component={ProgressScreen} />
        <Tab.Screen
          name="Profile"
          options={{ tabBarLabel: 'Profile' }}
        >
          {(props) => <ProfileScreen {...props} navigation={parentNav} />}
        </Tab.Screen>
      </Tab.Navigator>

      <FabModal
        visible={fabOpen}
        onClose={() => setFabOpen(false)}
        onNavigate={(screen) => {
          setFabOpen(false);
          // Give the modal time to close before navigating
          setTimeout(() => handleNavigate(screen), 50);
        }}
      />
    </>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

function RootNavigator() {
  const { session, loading } = useAuth();
  const { profile, setProfile } = useProfileStore();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setCheckingProfile(false);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
        setCheckingProfile(false);
      });
  }, [session]);

  if (loading || checkingProfile) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          </>
        ) : !profile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ActivityDetail"
              component={ActivityDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddExercise"
              component={AddExerciseScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="AddFood" component={AddFoodScreen as any} options={{ headerShown: false }} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen as any} options={{ headerShown: false }} />
            <Stack.Screen name="ConnectWearable" component={ConnectWearableScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Motivation"
              component={MotivationScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
