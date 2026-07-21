import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, Platform, Image, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';
import { authApi, ApiError } from '@/services/api';
import { saveSession, Session } from '@/services/auth';
import { useLanguage } from '@/contexts/LanguageContext';

const { light, government } = colors;

const GREEN_DARK = government.navyDark;
const GREEN_MID  = government.navy;
const GOLD       = government.gold;
const CREAM      = light.background;
const WHITE      = light.card;
const TEXT       = light.text;
const MUTED      = light.mutedForeground;
const BORDER     = light.border;

export default function LoginScreen() {
  const insets    = useSafeAreaInsets();
  const { t }     = useLanguage();
  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<{ employeeNumber?: string; password?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!/^\d{10}$/.test(employeeNumber)) next.employeeNumber = t('idRequired');
    if (!password)                         next.password       = t('passwordRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ nationalId: employeeNumber, password });
      const data = res.data!;

      await saveSession({
        token:        data.accessToken,
        refreshToken: data.refreshToken,
        role:         data.role as Session['role'],
        nameAr:       data.nameAr,
        employeeId:   data.employeeId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Admin-created accounts must set a personal password before entering the app
      if (data.mustChangePassword) {
        router.replace({ pathname: '/(auth)/change-password', params: { role: data.role } } as any);
        return;
      }

      // All roles go to the employee tabs; admins get an Admin Panel shortcut in profile
      router.replace('/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof ApiError ? err.message : t('loginFailed');
      Alert.alert(t('signInFailed'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* ── Green top section ── */}
      <View style={[styles.topSection, { paddingTop: topPad + 28 }]}>
        <Image
          source={require('../../assets/images/asa-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>{t('welcomeBack')}</Text>
      </View>

      {/* ── White form card ── */}
      <View style={[styles.formCard, { paddingBottom: bottomPad + 24 }]}>
        {/* Employee Number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('nationalId')}</Text>
          <View style={[styles.inputRow, errors.employeeNumber ? styles.inputError : null]}>
            <Ionicons name="card-outline" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('nationalIdPlaceholder')}
              placeholderTextColor={MUTED}
              value={employeeNumber}
              onChangeText={(t) => {
                setEmployeeNumber(t.replace(/\D/g, '').slice(0, 10));
                setErrors((e) => ({ ...e, employeeNumber: undefined }));
              }}
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
          <Text style={styles.label}>{t('password')}</Text>
          <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="input-password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={MUTED}
              />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.82}
          testID="btn-login"
        >
          <Text style={styles.loginBtnText}>{loading ? t('signingIn') : t('signIn')}</Text>
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
          <Text style={styles.registerBtnText}>{t('noAccount')}</Text>
        </TouchableOpacity>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={11} color={MUTED} />
          <Text style={styles.securityNoteText}>  HS512 JWT · BCrypt · Rate-limited</Text>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GREEN_DARK,
  },
  content: {
    flexGrow: 1,
  },
  topSection: {
    backgroundColor: GREEN_DARK,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: WHITE,
  },
  formCard: {
    flex: 1,
    backgroundColor: CREAM,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: TEXT,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
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
    color: TEXT,
    ...Platform.select({ web: { outlineWidth: 0 } as any }),
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
    color: GOLD,
  },
  loginBtn: {
    backgroundColor: GREEN_MID,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: WHITE,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: MUTED,
  },
  registerBtn: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: WHITE,
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: TEXT,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  securityNoteText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: MUTED,
  },
});
