import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ThemedScreen from '../../components/ThemedScreen';
import { authAPI } from '../../services/api';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const email = route?.params?.email ?? '';
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim() || !newPassword.trim()) {
      return Alert.alert('Error', 'Please fill in both fields');
    }
    if (newPassword.trim().length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, code: code.trim(), newPassword: newPassword.trim() });
      Alert.alert('Success', 'Your password has been reset. Please sign in with your new password.');
      navigation.navigate('RoleSelection');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid or expired code');
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

          <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter the code sent to {email} and choose a new password.
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Reset Code</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="6-digit code"
            placeholderTextColor={theme.textTertiary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
          <View style={[styles.passwordRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <TextInput
              style={[styles.input, styles.passwordInput, { color: theme.text }]}
              placeholder="••••••••"
              placeholderTextColor={theme.textTertiary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  passwordInput: { flex: 1, borderWidth: 0, marginBottom: 0, paddingHorizontal: 2 },
  passwordIcon: { marginLeft: 8 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});