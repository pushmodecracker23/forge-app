import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');

const TAGLINES = [
  'YOUR BODY.\nYOUR RULES.\nNO EXCUSES.',
  'FORGED IN\nDISCIPLINE.',
  'BUILD THE\nBODY YOU\nDESERVE.',
];

export default function AuthScreen({ navigation }: { navigation?: any }) {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const tagline = TAGLINES[1];

  const handleSubmit = async () => {
    if (!email.trim() || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email.trim(), password);
      setLoading(false);
      if (error) { Alert.alert('Error', error.message); return; }
      navigation?.navigate('EmailVerification', { email: email.trim() });
    } else {
      const { error } = await signIn(email.trim(), password);
      setLoading(false);
      if (error) Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} bounces={false} keyboardShouldPersistTaps="handled">

        {/* Hero section */}
        <LinearGradient
          colors={['#0E0E0C', '#1a1a18', '#FF4D00']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Abstract energy shapes */}
          <View style={[styles.circle, { top: -40, right: -40, width: 180, height: 180, opacity: 0.12 }]} />
          <View style={[styles.circle, { top: 60, right: 30, width: 80, height: 80, opacity: 0.18 }]} />
          <View style={[styles.circle, { bottom: 20, left: -20, width: 120, height: 120, opacity: 0.1 }]} />

          <View style={styles.heroContent}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.appName}>FORGE</Text>
            <Text style={styles.tagline}>{tagline}</Text>
          </View>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor="#BDBDB8"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor="#BDBDB8"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.primaryBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google — coming soon */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available soon!')}
          >
            <Text style={styles.googleBtnText}>🔵  Continue with Google</Text>
            <View style={styles.soonBadge}><Text style={styles.soonText}>Soon</Text></View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchRow} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.switchAccent}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: SCREEN_H * 0.44,
    paddingHorizontal: 28,
    paddingTop: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  heroContent: { marginTop: 16 },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FF4D00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 26 },
  appName: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 12 },
  tagline: { fontSize: 22, fontWeight: '800', color: 'rgba(255,255,255,0.90)', lineHeight: 30, letterSpacing: 1 },
  form: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 28,
    paddingBottom: 48,
    minHeight: SCREEN_H * 0.6,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A18', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B6960', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#F5F4F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A18',
    borderWidth: 1,
    borderColor: '#E5E3DC',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 12,
    padding: 4,
  },
  eyeIcon: { fontSize: 18 },
  primaryBtn: {
    backgroundColor: '#FF4D00',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E3DC' },
  dividerText: { marginHorizontal: 12, color: '#BDBDB8', fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E3DC',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FAFAF8',
    opacity: 0.7,
    position: 'relative',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#1A1A18' },
  soonBadge: {
    position: 'absolute',
    right: 14,
    backgroundColor: '#E5E3DC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonText: { fontSize: 11, fontWeight: '700', color: '#6B6960' },
  switchRow: { marginTop: 24, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#6B6960' },
  switchAccent: { color: '#FF4D00', fontWeight: '700' },
});
