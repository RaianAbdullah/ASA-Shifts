import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { authApi, ApiError } from '@/services/api';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const BORDER = '#E5E7EB';
const RED    = '#EF4444';

export default function ResetPasswordScreen() {
  const [resetToken,    setResetToken]    = useState('');
  const [newPassword,   setNewPassword]   = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const passwordMatch = newPassword === confirmPass;
  const passwordLong  = newPassword.length >= 8;
  const canSubmit     = resetToken.trim().length > 0 && passwordLong && passwordMatch;

  const handleReset = async () => {
    if (!canSubmit) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(resetToken.trim(), newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof ApiError ? err.message : 'Reset failed. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.cardBody}>
            Enter the reset code provided by your IT administrator and your new password.
          </Text>

          {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.field}>
            <Text style={styles.label}>Reset Code</Text>
            <TextInput
              style={styles.input}
              value={resetToken}
              onChangeText={setResetToken}
              placeholder="Paste your reset code"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPass}
                placeholder="At least 8 characters"
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && !passwordLong &&
              <Text style={styles.hintError}>Password must be at least 8 characters</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry={!showPass}
              placeholder="Repeat new password"
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
            {confirmPass.length > 0 && !passwordMatch &&
              <Text style={styles.hintError}>Passwords do not match</Text>}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!canSubmit || loading) && styles.disabledBtn]}
            onPress={handleReset}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Resetting…' : 'Set New Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Request a new code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F8F9FA' },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: CARD, borderRadius: 16, padding: 28, alignItems: 'center',
                shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  icon:       { fontSize: 48, marginBottom: 16 },
  cardTitle:  { fontSize: 22, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 10, textAlign: 'center' },
  cardBody:   { fontSize: 15, color: GRAY, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  errorBox:   { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, width: '100%', marginBottom: 16 },
  errorText:  { color: RED, fontSize: 14 },
  field:      { width: '100%', marginBottom: 16 },
  label:      { fontSize: 13, color: NAVY, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14, fontSize: 16,
                color: NAVY, backgroundColor: BG },
  passRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:     { padding: 10 },
  eyeIcon:    { fontSize: 20 },
  hintError:  { color: RED, fontSize: 12, marginTop: 4 },
  primaryBtn: { width: '100%', backgroundColor: NAVY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  disabledBtn:{ opacity: 0.5 },
  linkBtn:    { marginTop: 16, padding: 8 },
  linkText:   { color: GOLD, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
