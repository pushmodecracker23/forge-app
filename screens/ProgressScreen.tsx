import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';

interface WeightEntry { id: string; date: string; weight_kg: number; note?: string; }

const W = Dimensions.get('window').width;
const CHART_H = 140;
const CHART_PAD = 32;

export default function ProgressScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('body_weight_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    if (data) setEntries(data.reverse() as WeightEntry[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const logWeight = async () => {
    if (!user || !weight.trim()) { Alert.alert('Error', 'Enter a weight'); return; }
    const today = new Date().toISOString().split('T')[0];
    setLoading(true);
    const { error } = await supabase.from('body_weight_log').upsert({
      user_id: user.id, date: today, weight_kg: parseFloat(weight), note: note.trim() || null,
    }, { onConflict: 'user_id,date' });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setWeight(''); setNote('');
    load();
  };

  const deleteEntry = (id: string) => {
    Alert.alert('Delete?', 'Remove this weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('body_weight_log').delete().eq('id', id);
          load();
        },
      },
    ]);
  };

  // Mini sparkline chart
  const ChartArea = () => {
    if (entries.length < 2) return null;
    const vals = entries.map(e => e.weight_kg);
    const mn = Math.min(...vals); const mx = Math.max(...vals);
    const range = mx - mn || 1;
    const pts = vals.map((v, i) => ({
      x: CHART_PAD + (i / (vals.length - 1)) * (W - 32 - CHART_PAD * 2),
      y: 12 + ((mx - v) / range) * (CHART_H - 24),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    // Use a simple View-based chart since SVG path drawing requires svg
    return (
      <Card style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <Text style={s.sectionTitle}>Last 30 Days</Text>
        <View style={{ height: CHART_H, position: 'relative' }}>
          {pts.map((p, i) => (
            <View key={i} style={{
              position: 'absolute', left: p.x - 4, top: p.y - 4,
              width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent,
            }} />
          ))}
          {pts.slice(1).map((p, i) => {
            const prev = pts[i];
            const dx = p.x - prev.x; const dy = p.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            return (
              <View key={`l${i}`} style={{
                position: 'absolute', left: prev.x, top: prev.y,
                width: len, height: 2, backgroundColor: theme.accent + '55',
                transform: [{ rotate: `${angle}deg` }, { translateY: 0 }],
                transformOrigin: 'left center',
              } as any} />
            );
          })}
          <Text style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 10, color: theme.muted }}>
            {mn.toFixed(1)}
          </Text>
          <Text style={{ position: 'absolute', top: 0, left: 0, fontSize: 10, color: theme.muted }}>
            {mx.toFixed(1)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={s.stat}>Start: {vals[0].toFixed(1)} kg</Text>
          <Text style={s.stat}>Now: {vals[vals.length - 1].toFixed(1)} kg</Text>
          <Text style={[s.stat, { color: vals[vals.length - 1] < vals[0] ? '#4CAF50' : '#F44336' }]}>
            {vals[vals.length - 1] < vals[0] ? '↓' : '↑'} {Math.abs(vals[vals.length - 1] - vals[0]).toFixed(1)} kg
          </Text>
        </View>
      </Card>
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    subtitle: { fontSize: 14, color: theme.muted, marginTop: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 10 },
    input: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, marginBottom: 10 },
    btn: { backgroundColor: theme.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    entryWeight: { fontSize: 17, fontWeight: '700', color: theme.text },
    entryDate: { fontSize: 12, color: theme.muted, marginTop: 2 },
    entryNote: { fontSize: 12, color: theme.muted, marginTop: 2, fontStyle: 'italic' },
    delBtn: { padding: 8 },
    delText: { fontSize: 16 },
    stat: { fontSize: 13, color: theme.muted, fontWeight: '600' },
  });

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <Text style={s.title}>Progress</Text>
              <Text style={s.subtitle}>Track your body weight over time</Text>
            </View>

            <ChartArea />

            <Card style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <Text style={s.sectionTitle}>Log Weight</Text>
              <TextInput
                style={s.input} value={weight} onChangeText={setWeight}
                placeholder="Weight (kg)" placeholderTextColor={theme.muted}
                keyboardType="numeric"
              />
              <TextInput
                style={s.input} value={note} onChangeText={setNote}
                placeholder="Note (optional)" placeholderTextColor={theme.muted}
              />
              <TouchableOpacity style={s.btn} onPress={logWeight} disabled={loading}>
                <Text style={s.btnText}>{loading ? 'Saving...' : '+ Log Weight'}</Text>
              </TouchableOpacity>
            </Card>

            <Card style={{ marginHorizontal: 16 }}>
              <Text style={s.sectionTitle}>History ({entries.length})</Text>
            </Card>
          </>
        }
        data={[...entries].reverse()}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={s.entryRow}>
              <View>
                <Text style={s.entryWeight}>{item.weight_kg.toFixed(1)} kg</Text>
                <Text style={s.entryDate}>{item.date}</Text>
                {item.note ? <Text style={s.entryNote}>{item.note}</Text> : null}
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => deleteEntry(item.id)}>
                <Text style={s.delText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.muted, marginTop: 20 }}>No entries yet</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
