import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

interface CustomTabBarProps extends BottomTabBarProps {
  onFabPress?: () => void;
}

type RouteIconKey = 'home-outline' | 'home' | 'pencil-outline' | 'pencil' | 'bar-chart-outline' | 'bar-chart' | 'person-outline' | 'person';

const ROUTE_META: Record<string, { icon: RouteIconKey; activeIcon: RouteIconKey; label: string }> = {
  Home:    { icon: 'home-outline',       activeIcon: 'home',        label: 'Home'    },
  Log:     { icon: 'pencil-outline',     activeIcon: 'pencil',      label: 'Log'     },
  Stats:   { icon: 'bar-chart-outline',  activeIcon: 'bar-chart',   label: 'Stats'   },
  Profile: { icon: 'person-outline',     activeIcon: 'person',      label: 'Profile' },
};

export default function CustomTabBar({ state, descriptors, navigation, onFabPress }: CustomTabBarProps) {
  const [fabOpen, setFabOpen] = useState(false);

  const handleFabPress = () => {
    const next = !fabOpen;
    setFabOpen(next);
    onFabPress?.();
  };

  const slots: Array<{ type: 'tab'; routeIndex: number } | { type: 'fab' }> = [
    { type: 'tab', routeIndex: 0 },
    { type: 'tab', routeIndex: 1 },
    { type: 'fab' },
    { type: 'tab', routeIndex: 2 },
    { type: 'tab', routeIndex: 3 },
  ];

  return (
    <View style={styles.container}>
      {slots.map((slot, slotIndex) => {
        if (slot.type === 'fab') {
          return (
            <View key="fab" style={styles.fabSlot}>
              <TouchableOpacity
                style={styles.fab}
                onPress={handleFabPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Quick action"
              >
                <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
          );
        }

        const { routeIndex } = slot;
        const route = state.routes[routeIndex];
        if (!route) return null;

        const isFocused = state.index === routeIndex;
        const meta = ROUTE_META[route.name] ?? { icon: 'ellipse-outline', activeIcon: 'ellipse', label: route.name };
        const iconName = (isFocused ? meta.activeIcon : meta.icon) as any;
        const color = isFocused ? '#1A6FFF' : '#9CA3AF';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{meta.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 72,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1A6FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
});
