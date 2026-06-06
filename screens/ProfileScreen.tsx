import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemeContext } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useProfileStore } from '../store/profileStore';
import Card from '../components/Card';

export default function ProfileScreen({ navigation }: { navigation?: any }) {
  const theme = useTheme();
  const { toggleTheme } = useThemeContext();
  const { signOut, user } = useAuth();
  const { profile } = useProfileStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20 },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
    name: { fontSize: 22, fontWeight: '700', color: theme.text },
    email: { fontSize: 14, color: theme.muted, marginTop: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.muted, marginBottom: 10, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    rowLabel: { fontSize: 15, color: theme.text },
    rowValue: { fontSize: 15, color: theme.muted, fontWeight: '600' },
    btn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
    btnText: { fontWeight: '700', fontSize: 15 },
  });

  const goal = profile?.goal ?? '-';
  const goalLabels: Record<string, string> = { cut: 'Cut', bulk: 'Bulk', maintain: 'Maintain', recomp: 'Recomp' };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={[s.header, { alignItems: 'center' }]}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={s.name}>{profile?.name ?? 'Athlete'}</Text>
          <Text style={s.email}>{user?.email}</Text>
        </View>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>TARGETS</Text>
          {[
            ['Calories', `${profile?.calorie_target ?? '-'} kcal`],
            ['Protein', `${profile?.protein_target ?? '-'}g`],
            ['Carbs', `${profile?.carbs_target ?? '-'}g`],
            ['Fat', `${profile?.fat_target ?? '-'}g`],
          ].map(([label, value]) => (
            <View key={label} style={s.row}>
              <Text style={s.rowLabel}>{label}</Text>
              <Text style={s.rowValue}>{value}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ marginHorizontal: 16 }}>
          <Text style={s.sectionTitle}>STATS</Text>
          {[
            ['Goal', goalLabels[goal] ?? goal],
            ['Current Weight', `${profile?.current_weight ?? '-'} kg`],
            ['Target Weight', `${profile?.target_weight ?? '-'} kg`],
            ['Height', `${profile?.height_cm ?? '-'} cm`],
            ['TDEE', `${profile?.tdee ?? '-'} kcal`],
          ].map(([label, value]) => (
            <View key={label} style={s.row}>
              <Text style={s.rowLabel}>{label}</Text>
              <Text style={s.rowValue}>{value}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ marginHorizontal: 16 }}>
          {navigation && (
            <TouchableOpacity style={[s.btn, { backgroundColor: theme.surface2 }]} onPress={() => navigation.navigate('Settings')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="settings-outline" size={18} color={theme.text} />
                <Text style={[s.btnText, { color: theme.text }]}>Settings</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.surface2, marginTop: 8 }]} onPress={toggleTheme}>
            <Text style={[s.btnText, { color: theme.text }]}>{theme.isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#FF4444' + '20', marginTop: 8 }]} onPress={handleSignOut}>
            <Text style={[s.btnText, { color: '#FF4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
