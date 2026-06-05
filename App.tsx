import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from 'react-native';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider, useTheme } from './lib/theme';
import { supabase } from './lib/supabase';
import { useProfileStore } from './store/profileStore';
import { Profile } from './types/database';

import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import FoodLogScreen from './screens/FoodLogScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import ProgressScreen from './screens/ProgressScreen';
import MotivationScreen from './screens/MotivationScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const theme = useTheme();
  const icons: Record<string, string> = { Home: '⚡', Scan: '🔍', Workout: '🏋️', Progress: '📈', Me: '👤' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[name]}</Text>
      <Text style={{ fontSize: 10, color: focused ? theme.accent : theme.muted, marginTop: 2, fontWeight: focused ? '700' : '400' }}>
        {name}
      </Text>
    </View>
  );
}

function MainTabs({ navigation }: { navigation: any }) {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 72,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} /> }}>
        {(props) => <DashboardScreen {...props} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen
        name="FoodLog"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Scan" focused={focused} />, tabBarLabel: 'Scan' }}
      >
        {() => <FoodLogScreen />}
      </Tab.Screen>
      <Tab.Screen name="Workout" options={{ tabBarIcon: ({ focused }) => <TabIcon name="Workout" focused={focused} /> }}>
        {() => <WorkoutScreen />}
      </Tab.Screen>
      <Tab.Screen name="Progress" options={{ tabBarIcon: ({ focused }) => <TabIcon name="Progress" focused={focused} /> }}>
        {() => <ProgressScreen />}
      </Tab.Screen>
      <Tab.Screen name="Me" options={{ tabBarIcon: ({ focused }) => <TabIcon name="Me" focused={focused} /> }}>
        {() => <ProfileScreen />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

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
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !profile ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Motivation"
              component={MotivationScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

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
