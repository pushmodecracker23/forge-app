import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemeContext } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';

export default function SettingsScreen() {
  const theme = useTheme();
  const { theme: _t, toggleTheme } = useThemeContext();
  const isDark = theme.isDark;
  const { user, signOut } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (!data) return;
      setName(data.name ?? '');
      setHeight(data.height_cm ? String(data.height_cm) : '');
      setWeight(data.current_weight ? String(data.current_weight) : '');
      setTargetWeight(data.target_weight ? String(data.target_weight) : '');
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      user_id: user.id,
      name: name.trim(),
      height_cm: height ? parseFloat(height) : null,
      current_weight: weight ? parseFloat(weight) : null,
      target_weight: targetWeight ? parseFloat(targetWeight) : null,
    };

    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    if (email !== user.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) { Alert.alert('Email Error', emailErr.message); return; }
      Alert.alert('Verify Email', 'Check your new email for a confirmation link.');
    }

    if (newPassword.trim().length > 0) {
      if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) { Alert.alert('Password Error', pwErr.message); return; }
      setNewPassword('');
    }

    Alert.alert('Saved', 'Your account has been updated.');
  };

  const confirmSignOut = () => Alert.alert('Sign Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: signOut },
  ]);

  const confirmDeleteAccount = () => Alert.alert(
    'Delete Account',
    'This cannot be undone. All your data will be permanently deleted.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('delete_user');
          if (error) Alert.alert('Error', error.message);
          else signOut();
        },
      },
    ],
  );

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { padding: 20, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', color: theme.text },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: theme.muted, marginBottom: 6 },
    input: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, marginBottom: 14 },
    row: { flexDirection: 'row', gap: 10 },
    halfInput: { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, marginBottom: 14 },
    pwWrap: { position: 'relative', marginBottom: 14 },
    pwInput: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, paddingRight: 48 },
    pwToggle: { position: 'absolute', right: 14, top: 14 },
    btn: { backgroundColor: theme.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    themeLabel: { fontSize: 15, color: theme.text, fontWeight: '600' },
    dangerBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#F44336', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 8 },
    dangerText: { color: '#F44336', fontWeight: '700', fontSize: 15 },
    signOutBtn: { backgroundColor: theme.surface2, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 8 },
    signOutText: { color: theme.text, fontWeight: '700', fontSize: 15 },
    versionText: { textAlign: 'center', color: theme.muted, fontSize: 12, marginTop: 8, marginBottom: 24 },
  });

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}><Text style={s.title}>Settings</Text></View>

        {/* Account Info */}
        <Card style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <Text style={s.sectionTitle}>Account Info</Text>
          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.muted} />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={theme.muted} keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>New Password (leave blank to keep current)</Text>
          <View style={s.pwWrap}>
            <TextInput style={s.pwInput} value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor={theme.muted} secureTextEntry={!showPw} />
            <TouchableOpacity style={s.pwToggle} onPress={() => setShowPw(v => !v)}>
              <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Body Stats */}
        <Card style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <Text style={s.sectionTitle}>Body Stats</Text>
          <Text style={s.label}>Height (cm)</Text>
          <TextInput style={s.input} value={height} onChangeText={setHeight} placeholder="e.g. 175" placeholderTextColor={theme.muted} keyboardType="numeric" />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Current Weight (kg)</Text>
              <TextInput style={s.halfInput} value={weight} onChangeText={setWeight} placeholder="e.g. 80" placeholderTextColor={theme.muted} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Target Weight (kg)</Text>
              <TextInput style={s.halfInput} value={targetWeight} onChangeText={setTargetWeight} placeholder="e.g. 75" placeholderTextColor={theme.muted} keyboardType="numeric" />
            </View>
          </View>
        </Card>

        {/* Appearance */}
        <Card style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <Text style={s.sectionTitle}>Appearance</Text>
          <View style={s.themeRow}>
            <Text style={s.themeLabel}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFF"
            />
          </View>
        </Card>

        {/* Save */}
        <View style={{ marginHorizontal: 16 }}>
          <TouchableOpacity style={s.btn} onPress={saveProfile} disabled={saving}>
            <Text style={s.btnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Account actions */}
        <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={s.sectionTitle}>Account</Text>
          <TouchableOpacity style={s.signOutBtn} onPress={confirmSignOut}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dangerBtn} onPress={confirmDeleteAccount}>
            <Text style={s.dangerText}>Delete Account</Text>
          </TouchableOpacity>
        </Card>

        <Text style={s.versionText}>Forge v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
