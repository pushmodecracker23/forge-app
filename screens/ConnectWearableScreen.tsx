import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import GradientBg from '../components/GradientBg';

interface Props {
  navigation: any;
}

interface Wearable {
  id: string;
  name: string;
  subtitle: string;
  iconFamily: 'ionicons' | 'mci';
  iconName: string;
  iconBg: string;
}

const WEARABLES: Wearable[] = [
  {
    id: 'apple_watch',
    name: 'Apple Watch',
    subtitle: 'Tap to connect',
    iconFamily: 'ionicons',
    iconName: 'watch-outline',
    iconBg: '#000000',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    subtitle: 'Tap to connect',
    iconFamily: 'mci',
    iconName: 'watch-export-variant',
    iconBg: '#00B0B9',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    subtitle: 'Tap to connect',
    iconFamily: 'mci',
    iconName: 'watch-import-variant',
    iconBg: '#1E73BE',
  },
  {
    id: 'samsung',
    name: 'Samsung Galaxy Watch',
    subtitle: 'Tap to connect',
    iconFamily: 'mci',
    iconName: 'watch',
    iconBg: '#1428A0',
  },
  {
    id: 'polar',
    name: 'Polar',
    subtitle: 'Tap to connect',
    iconFamily: 'mci',
    iconName: 'heart-pulse',
    iconBg: '#C8102E',
  },
  {
    id: 'whoop',
    name: 'Whoop',
    subtitle: 'Tap to connect',
    iconFamily: 'mci',
    iconName: 'arm-flex-outline',
    iconBg: '#000000',
  },
];

function WearableIcon({ wearable }: { wearable: Wearable }) {
  if (wearable.iconFamily === 'ionicons') {
    return (
      <Ionicons
        name={wearable.iconName as any}
        size={28}
        color="#FFFFFF"
      />
    );
  }
  return (
    <MaterialCommunityIcons
      name={wearable.iconName as any}
      size={28}
      color="#FFFFFF"
    />
  );
}

function handleConnectPress(name: string) {
  Alert.alert(
    `Sync Your ${name}`,
    `Manual sync is available — connect your device through the ${name} app, then your data will appear here automatically.\n\nFull automatic sync coming soon.`,
    [{ text: 'Got it', style: 'default' }]
  );
}

export default function ConnectWearableScreen({ navigation }: Props) {
  const theme = useTheme();

  return (
    <GradientBg>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect Wearable</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Intro card ── */}
          <View style={styles.introCard}>
            <View style={styles.introIconWrapper}>
              <Ionicons name="watch-outline" size={48} color="#1A6FFF" />
            </View>
            <Text style={styles.introTitle}>Connect Your Wearable</Text>
            <Text style={styles.introSubtitle}>
              Sync workouts and health data from your device
            </Text>
          </View>

          {/* ── Wearable list card ── */}
          <View style={styles.listCard}>
            {WEARABLES.map((wearable, index) => (
              <View key={wearable.id}>
                <View style={styles.wearableRow}>
                  {/* Icon circle */}
                  <View style={[styles.iconCircle, { backgroundColor: wearable.iconBg }]}>
                    <WearableIcon wearable={wearable} />
                  </View>

                  {/* Name + subtitle */}
                  <View style={styles.wearableInfo}>
                    <Text style={styles.wearableName}>{wearable.name}</Text>
                    <Text style={styles.wearableSubtitle}>{wearable.subtitle}</Text>
                  </View>

                  {/* Connect button */}
                  <TouchableOpacity
                    style={styles.connectBtn}
                    onPress={() => handleConnectPress(wearable.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.connectBtnText}>Connect</Text>
                  </TouchableOpacity>
                </View>

                {index < WEARABLES.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            ))}
          </View>

          {/* ── Mock data info card ── */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#1A6FFF"
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Your dashboard shows estimated activity data. Connect a wearable for accurate tracking.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
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

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Intro card
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  introIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26,111,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Wearable list card
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  wearableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  wearableInfo: {
    flex: 1,
  },
  wearableName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  wearableSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  connectBtn: {
    backgroundColor: '#1A6FFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
});
