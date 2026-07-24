import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import { authAPI } from '../../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Please enter your email');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: email.trim() });
      Alert.alert('If an account exists', 'If that email is registered, you will receive password reset instructions.');
      navigation.goBack();
    } catch (error: any) {
      // Show a generic success-like message so we don't leak account existence
      Alert.alert('If an account exists', 'If that email is registered, you will receive password reset instructions.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}> 
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Enter your account email and we'll send reset instructions.</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="your@email.com"
            placeholderTextColor={theme.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={send}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Email'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  label: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
