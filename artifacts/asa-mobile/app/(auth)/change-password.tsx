/**
 * Mandatory change-password screen shown when an admin-created account logs in
 * for the first time (mustChangePassword = true on the login response).
 *
 * The employee enters their current temporary password and a new password.
 * On success they are routed to their home screen (tabs or admin) based on role.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { authApi, ApiError } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  // role is passed as a query param so we can route correctly after success
  const { role } = useLocalSearchParams<{ role: string }>();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showC,    setShowC]    = useState(false);
  const [showN,    setShowN]    = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!current)                         e.current = 'Enter your temporary password';
    if (next.length < 8)                  e.next    = 'New password must be at least 8 characters';
    if (next !== confirm)                 e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const mgmtRoles = ['SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER'];
      router.replace(mgmtRoles.includes(role ?? '') ? '/(admin)' : '/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof ApiError ? err.message : 'Failed to change password. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Icon */}
      <View style={styles.iconWrap}>
        <Ionicons name="lock-open-outline" size={56} color={government.navy} />
      </View>

      <Text style={styles.heading}>Set Your Password</Text>
      <Text style={styles.headingAr}>تعيين كلمة المرور</Text>
      <Text style={styles.subtitle}>
        Your account was created by an admin. Please set a personal password to continue.
      </Text>

      {/* Current (temp) password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Temporary Password  كلمة المرور المؤقتة</Text>
        <View style={[styles.inputRow, errors.current ? styles.inputError : null]}>
          <Ionicons name="lock-closed-outline" size={18} color={light.mutedForeground} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter temporary password"
            placeholderTextColor={light.mutedForeground}
            value={current}
            onChangeText={t => { setCurrent(t); setErrors(e => ({ ...e, current: '' })); }}
            secureTextEntry={!showC}
          />
          <TouchableOpacity onPress={() => setShowC(!showC)}>
            <Ionicons name={showC ? 'eye-off-outline' : 'eye-outline'} size={18} color={light.mutedForeground} />
          </TouchableOpacity>
        </View>
        {errors.current ? <Text style={styles.errorText}>{errors.current}</Text> : null}
      </View>

      {/* New password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>New Password  كلمة المرور الجديدة</Text>
        <View style={[styles.inputRow, errors.next ? styles.inputError : null]}>
          <Ionicons name="key-outline" size={18} color={light.mutedForeground} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Minimum 8 characters"
            placeholderTextColor={light.mutedForeground}
            value={next}
            onChangeText={t => { setNext(t); setErrors(e => ({ ...e, next: '' })); }}
            secureTextEntry={!showN}
          />
          <TouchableOpacity onPress={() => setShowN(!showN)}>
            <Ionicons name={showN ? 'eye-off-outline' : 'eye-outline'} size={18} color={light.mutedForeground} />
          </TouchableOpacity>
        </View>
        {errors.next ? <Text style={styles.errorText}>{errors.next}</Text> : null}
      </View>

      {/* Confirm */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm Password  تأكيد كلمة المرور</Text>
        <View style={[styles.inputRow, errors.confirm ? styles.inputError : null]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={light.mutedForeground} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Repeat new password"
            placeholderTextColor={light.mutedForeground}
            value={confirm}
            onChangeText={t => { setConfirm(t); setErrors(e => ({ ...e, confirm: '' })); }}
            secureTextEntry={!showConf}
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity onPress={() => setShowConf(!showConf)}>
            <Ionicons name={showConf ? 'eye-off-outline' : 'eye-outline'} size={18} color={light.mutedForeground} />
          </TouchableOpacity>
        </View>
        {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.82}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Set Password  حفظ كلمة المرور</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: light.background },
  content:      { padding: 24, paddingTop: 60 },
  iconWrap:     { alignItems: 'center', marginBottom: 16 },
  heading:      { fontSize: 22, fontWeight: '700', color: light.text, textAlign: 'center' },
  headingAr:    { fontSize: 16, color: light.mutedForeground, textAlign: 'center', marginBottom: 12 },
  subtitle:     { fontSize: 14, color: light.mutedForeground, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  fieldGroup:   { marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: light.text, marginBottom: 6 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: light.card,
                  borderRadius: 10, borderWidth: 1, borderColor: light.border,
                  paddingHorizontal: 12, paddingVertical: 10 },
  inputError:   { borderColor: light.destructive },
  icon:         { marginRight: 8 },
  input:        { flex: 1, fontSize: 15, color: light.foreground },
  errorText:    { color: light.destructive, fontSize: 12, marginTop: 4 },
  btn:          { backgroundColor: government.navy, borderRadius: 12,
                  paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
