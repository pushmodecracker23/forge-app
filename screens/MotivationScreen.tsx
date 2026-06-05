import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useFoodStore } from '../store/foodStore';
import { useProfileStore } from '../store/profileStore';
import MacroBar from '../components/MacroBar';

const INSULTS_MILD = [
  "You're literally one meal away from ruining today.",
  "Is this really what you're training for?",
  "Future you will remember this moment.",
];
const INSULTS_HEAVY = [
  "You've been off track for days. Do you even want this?",
  "This is exactly why you haven't hit your goal yet.",
  "Your competitors don't take breaks.",
];

export default function MotivationScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { todayLogs } = useFoodStore();
  const { profile } = useProfileStore();
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [goalPhoto, setGoalPhoto] = useState<string | null>(null);

  const totalKcal = todayLogs.reduce((s, l) => s + l.kcal, 0);
  const target = profile?.calorie_target ?? 2000;
  const deficit = target - totalKcal;
  const deficitRatio = Math.max(0, Math.min(deficit / target, 1));
  const isHeavilyOff = totalKcal > target * 1.2;
  const insults = isHeavilyOff ? INSULTS_HEAVY : INSULTS_MILD;
  const insult = insults[Math.floor(Math.random() * insults.length)];

  const pickPhoto = async (type: 'current' | 'goal') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'current') setCurrentPhoto(uri);
      else setGoalPhoto(uri);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    insultCard: {
      margin: 16,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      borderLeftWidth: 4,
      borderLeftColor: theme.accent,
    },
    insult: { fontSize: 17, fontWeight: '600', color: theme.text, lineHeight: 24 },
    photoRow: { flexDirection: 'row', padding: 16, gap: 12 },
    photoSlot: {
      flex: 1,
      height: 160,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoSlotLabel: { color: theme.muted, fontSize: 13, marginTop: 6 },
    photo: { width: '100%', height: '100%' },
    progressSection: { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 },
    btnRow: { flexDirection: 'row', gap: 12, padding: 16 },
    btnStay: { flex: 1, backgroundColor: theme.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
    btnLog: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, alignItems: 'center' },
    btnText: { fontWeight: '700', fontSize: 15 },
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>Stay the Course</Text>
        </View>

        <View style={s.insultCard}>
          <Text style={s.insult}>"{insult}"</Text>
        </View>

        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoSlot} onPress={() => pickPhoto('current')}>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={s.photo} resizeMode="cover" />
            ) : (
              <>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={s.photoSlotLabel}>Current physique</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.photoSlot} onPress={() => pickPhoto('goal')}>
            {goalPhoto ? (
              <Image source={{ uri: goalPhoto }} style={s.photo} resizeMode="cover" />
            ) : (
              <>
                <Text style={{ fontSize: 28 }}>🎯</Text>
                <Text style={s.photoSlotLabel}>Goal physique</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.progressSection}>
          <Text style={s.sectionTitle}>Today's Deficit</Text>
          <MacroBar label="Remaining" current={Math.max(0, target - totalKcal)} target={target} color={theme.accent} unit=" kcal" />
          <Text style={{ color: theme.muted, fontSize: 13, marginTop: 8 }}>
            {deficit > 0 ? `You need ${deficit} more kcal to hit your target.` : `You've gone ${Math.abs(deficit)} kcal over your target.`}
          </Text>
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.btnStay} onPress={() => navigation.goBack()}>
            <Text style={[s.btnText, { color: '#FFF' }]}>Stay on Track 💪</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnLog} onPress={() => navigation.navigate('FoodLog')}>
            <Text style={[s.btnText, { color: theme.muted }]}>Log It Anyway</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
