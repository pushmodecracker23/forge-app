import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface CustomTabBarProps extends BottomTabBarProps {
  onFabPress?: () => void;
}

// Icon map — keyed by route name (case-insensitive match)
const ROUTE_META: Record<
  string,
  { icon: string; activeIcon: string; label: string }
> = {
  Home:    { icon: '🏠', activeIcon: '🏠', label: 'Home' },
  Log:     { icon: '✏️',  activeIcon: '✏️',  label: 'Log'  },
  Stats:   { icon: '📊', activeIcon: '📊', label: 'Stats' },
  Profile: { icon: '👤', activeIcon: '👤', label: 'Profile' },
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
  onFabPress,
}: CustomTabBarProps) {
  const [fabOpen, setFabOpen] = useState(false);

  const handleFabPress = () => {
    const next = !fabOpen;
    setFabOpen(next);
    onFabPress?.();
  };

  // Build the visual slot list:
  // slots 0-1 → route indices 0-1
  // slot 2   → FAB (no route)
  // slots 3-4 → route indices 2-3
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
                <Text style={styles.fabIcon}>{fabOpen ? '✕' : '+'}</Text>
              </TouchableOpacity>
            </View>
          );
        }

        const { routeIndex } = slot;
        const route = state.routes[routeIndex];

        // Guard: if the navigator has fewer routes than expected, skip
        if (!route) return null;

        const isFocused = state.index === routeIndex;
        const meta = ROUTE_META[route.name] ?? {
          icon: '●',
          activeIcon: '●',
          label: route.name,
        };
        const iconColor = isFocused ? '#1A6FFF' : '#9CA3AF';
        const labelColor = isFocused ? '#1A6FFF' : '#9CA3AF';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options?.tabBarAccessibilityLabel}
          >
            <Text style={[styles.tabIcon, { color: iconColor }]}>
              {isFocused ? meta.activeIcon : meta.icon}
            </Text>
            <Text style={[styles.tabLabel, { color: labelColor }]}>
              {meta.label}
            </Text>
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
    // Shadow
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
  tabIcon: {
    fontSize: 22,
    lineHeight: 26,
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
    // The FAB overhangs the bar upward
    marginTop: -24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A6FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#1A6FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 34,
    textAlign: 'center',
  },
});
