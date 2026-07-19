import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';

const { light, government } = colors;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ employeeNumber?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!employeeNumber.trim()) next.employeeNumber = 'Employee number is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // TODO: Stage 4 — JWT login implementation
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Coming Soon',
        'Authentication will be implemented in Stage 4.\n\nThe backend endpoint POST /api/v1/auth/login is designed and ready.',
        [{ text: 'OK' }]
      );
    }, 800);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo mark */}
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={32} color={government.gold} />
        </View>
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.headingAr}>أهلاً بعودتك</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Employee Number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>ID Number <Text style={styles.labelAr}>رقم الهوية</Text></Text>
          <View style={[styles.inputRow, errors.employeeNumber ? styles.inputError : null]}>
            <Ionicons name="card-outline" size={18} color={light.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="10-digit national ID"
              placeholderTextColor={light.mutedForeground}
              value={employeeNumber}
              onChangeText={(t) => { setEmployeeNumber(t.replace(/\D/g, '').slice(0, 10)); setErrors((e) => ({ ...e, employeeNumber: undefined })); }}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              testID="input-employee-number"
            />
          </View>
          {errors.employeeNumber ? <Text style={styles.errorText}>{errors.employeeNumber}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password <Text style={styles.labelAr}>كلمة المرور</Text></Text>
          <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={light.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={light.mutedForeground}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="input-password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              testID="btn-toggle-password"
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={light.mutedForeground}
              />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => Alert.alert('Password Reset', 'Password reset will be available in Stage 4.')}
        >
          <Text style={styles.forgotText}>Forgot password? / نسيت كلمة المرور؟</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.82}
          testID="btn-login"
        >
          {loading ? (
            <Text style={styles.loginBtnText}>Signing in...</Text>
          ) : (
            <>
              <Text style={styles.loginBtnText}>Sign In</Text>
              <Text style={styles.loginBtnTextAr}>دخول</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register */}
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.82}
          testID="btn-go-register"
        >
          <Text style={styles.registerBtnText}>New Employee? Register — موظف جديد؟ سجّل</Text>
        </TouchableOpacity>
      </View>

      {/* Security note */}
      <View style={styles.securityNote}>
        <Ionicons name="lock-closed" size={11} color={light.mutedForeground} />
        <Text style={styles.securityNoteText}>  End-to-end encrypted · JWT authentication</Text>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: light.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: government.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: light.text,
  },
  headingAr: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
    marginTop: 4,
  },
  form: {
    flex: 1,
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: light.text,
  },
  labelAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light.card,
    borderWidth: 1.5,
    borderColor: light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: light.destructive,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: light.text,
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.destructive,
    marginTop: 2,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: government.navyLight,
  },
  loginBtn: {
    backgroundColor: government.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  loginBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: light.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
  registerBtn: {
    borderWidth: 1.5,
    borderColor: light.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: light.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  securityNoteText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
});
