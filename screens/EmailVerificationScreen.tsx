import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

export default function EmailVerificationScreen({ navigation, route }: { navigation?: any; route?: any }) {
  const theme = useTheme();
  const email: string = route?.params?.email ?? '';
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const onVerified = () => navigation?.navigate('Auth');
  const onBack = () => navigation?.goBack();

  // Poll for email confirmation every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email_confirmed_at) {
        clearInterval(interval);
        onVerified();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Countdown for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const resendEmail = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('Sent!', 'Check your inbox again.'); setCountdown(60); }
  };

  const checkManually = async () => {
    setChecking(true);
    const { data } = await supabase.auth.getSession();
    setChecking(false);
    if (data.session?.user?.email_confirmed_at) {
      onVerified();
    } else {
      Alert.alert('Not yet', 'Your email hasn\'t been verified yet. Check your inbox.');
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    inner: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center' },
    iconBg: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    },
    icon: { fontSize: 44 },
    title: { fontSize: 26, fontWeight: '800', color: '#1A1A18', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 15, color: '#6B6960', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
    email: { fontSize: 15, fontWeight: '700', color: '#FF4D00', textAlign: 'center', marginBottom: 32 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D00', margin: 4 },
    dotsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
    primaryBtn: {
      backgroundColor: '#FF4D00', borderRadius: 14, padding: 16,
      alignItems: 'center', width: '100%', marginBottom: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    secondaryBtn: {
      borderWidth: 1, borderColor: '#E5E3DC', borderRadius: 14, padding: 14,
      alignItems: 'center', width: '100%', marginBottom: 12,
    },
    secondaryBtnText: { color: '#6B6960', fontWeight: '600', fontSize: 15 },
    backBtn: { padding: 12 },
    backText: { color: '#BDBDB8', fontSize: 14 },
    pulse: { color: theme.muted, fontSize: 13, marginTop: 16, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <View style={s.iconBg}>
          <Text style={s.icon}>📧</Text>
        </View>
        <Text style={s.title}>Check Your Email</Text>
        <Text style={s.subtitle}>We sent a verification link to</Text>
        <Text style={s.email}>{email}</Text>

        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.35 }]} />
          ))}
          <ActivityIndicator color="#FF4D00" style={{ marginLeft: 8 }} />
        </View>

        <Text style={s.pulse}>Waiting for verification...</Text>

        <View style={{ height: 32 }} />

        <TouchableOpacity style={s.primaryBtn} onPress={checkManually} disabled={checking}>
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>I've Verified — Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondaryBtn, countdown > 0 && { opacity: 0.5 }]}
          onPress={resendEmail}
          disabled={resending || countdown > 0}
        >
          {resending
            ? <ActivityIndicator color="#6B6960" />
            : <Text style={s.secondaryBtnText}>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backText}>← Use a different email</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
