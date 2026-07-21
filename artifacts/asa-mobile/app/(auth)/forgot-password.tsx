import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { authApi, ApiError } from '@/services/api';

const NAVY  = '#1A2332';
const GOLD  = '#C9A84C';
const GRAY  = '#6B7280';
const BG    = '#F8F9FA';
const CARD  = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function ForgotPasswordScreen() {
  const [nationalId, setNationalId] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sent,       setSent]       = useState(false);

  const valid = nationalId.trim().length === 10;

  const handleSubmit = async () => {
    if (!valid) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(nationalId.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err) {
      // Still show success — don't enumerate accounts
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.icon}>📬</Text>
          <Text style={styles.cardTitle}>Reset Code Sent</Text>
          <Text style={styles.cardBody}>
            If an active account exists for that ID, a reset code has been generated.{'\n\n'}
            Please contact your IT administrator or HR department to obtain the code, then tap below to continue.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/reset-password')}
            testID="btn-enter-reset-code"
          >
            <Text style={styles.primaryBtnText}>Enter Reset Code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.cardTitle}>Forgot Password</Text>
          <Text style={styles.cardBody}>
            Enter your National ID. Your IT administrator can then provide you with a reset code.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>National ID</Text>
            <TextInput
              style={styles.input}
              value={nationalId}
              onChangeText={setNationalId}
              placeholder="10-digit National ID"
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              testID="input-nationalId"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!valid || loading) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!valid || loading}
            testID="btn-submit"
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Sending…' : 'Request Reset Code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkBtn}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card:         { backgroundColor: CARD, borderRadius: 16, padding: 28, alignItems: 'center',
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                  elevation: 3 },
  icon:         { fontSize: 48, marginBottom: 16 },
  cardTitle:    { fontSize: 22, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 10, textAlign: 'center' },
  cardBody:     { fontSize: 15, color: GRAY, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  field:        { width: '100%', marginBottom: 16 },
  label:        { fontSize: 13, color: NAVY, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14, fontSize: 16,
                  color: NAVY, backgroundColor: BG },
  primaryBtn:   { width: '100%', backgroundColor: NAVY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText:{ color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  disabledBtn:  { opacity: 0.5 },
  linkBtn:      { marginTop: 16, padding: 8 },
  linkText:     { color: GOLD, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
