import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export default function AuthScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    inner: { flex: 1, justifyContent: 'center', padding: 24 },
    logo: { fontSize: 42, fontWeight: '800', color: theme.accent, textAlign: 'center', marginBottom: 8 },
    tagline: { fontSize: 15, color: theme.muted, textAlign: 'center', marginBottom: 48 },
    label: { fontSize: 13, color: theme.muted, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: theme.text,
    },
    btn: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 28,
    },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    toggle: { marginTop: 20, alignItems: 'center' },
    toggleText: { color: theme.muted, fontSize: 14 },
    toggleAccent: { color: theme.accent, fontWeight: '600' },
  });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <Text style={s.logo}>⚡ FORGE</Text>
        <Text style={s.tagline}>Build the body you want.</Text>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={theme.muted}
          placeholder="you@example.com"
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={theme.muted}
          placeholder="••••••••"
        />

        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.btnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.toggle} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={s.toggleText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={s.toggleAccent}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
