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

type FormData = {
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email: string;
  phoneNumber: string;
  department: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    employeeNumber: '',
    email: '',
    phoneNumber: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const update = (key: keyof FormData) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.firstName.trim()) next.firstName = 'Required / مطلوب';
    if (!form.lastName.trim()) next.lastName = 'Required / مطلوب';
    if (!form.employeeNumber.trim()) next.employeeNumber = 'Required / مطلوب';
    if (!form.email.trim() || !form.email.includes('@')) next.email = 'Valid work email required';
    if (!form.phoneNumber.trim()) next.phoneNumber = 'Required / مطلوب';
    if (form.password.length < 12) next.password = 'Minimum 12 characters / 12 أحرف على الأقل';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    // TODO: Stage 3 — Registration implementation
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Coming Soon',
        'Registration will be implemented in Stage 3.\n\nPOST /api/v1/auth/register is designed and ready.',
        [{ text: 'OK' }]
      );
    }, 800);
  };

  const renderField = (
    key: keyof FormData,
    label: string,
    labelAr: string,
    options: {
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'words' | 'characters';
      secureTextEntry?: boolean;
      toggleSecure?: () => void;
      showSecure?: boolean;
      autoCorrect?: boolean;
    } = {}
  ) => (
    <View style={styles.fieldGroup} key={key}>
      <Text style={styles.label}>
        {label} <Text style={styles.labelAr}>{labelAr}</Text>
      </Text>
      <View style={[styles.inputRow, errors[key] ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholder={options.placeholder ?? label}
          placeholderTextColor={light.mutedForeground}
          value={form[key]}
          onChangeText={update(key)}
          keyboardType={options.keyboardType ?? 'default'}
          autoCapitalize={options.autoCapitalize ?? 'words'}
          autoCorrect={options.autoCorrect ?? false}
          secureTextEntry={options.secureTextEntry && !options.showSecure}
          testID={`input-${key}`}
        />
        {options.toggleSecure ? (
          <TouchableOpacity onPress={options.toggleSecure} style={styles.eyeBtn}>
            <Ionicons
              name={options.showSecure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={light.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Personal Information / المعلومات الشخصية</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {renderField('firstName', 'First Name', 'الاسم الأول', { autoCapitalize: 'words' })}
        </View>
        <View style={{ flex: 1 }}>
          {renderField('lastName', 'Last Name', 'اسم العائلة', { autoCapitalize: 'words' })}
        </View>
      </View>

      {renderField('employeeNumber', 'Employee Number', 'رقم الموظف', {
        placeholder: 'EMP-00123',
        autoCapitalize: 'characters',
      })}

      {renderField('email', 'Work Email', 'البريد الوظيفي', {
        placeholder: 'name@government.example',
        keyboardType: 'email-address',
        autoCapitalize: 'none',
      })}

      {renderField('phoneNumber', 'Phone Number', 'رقم الهاتف', {
        placeholder: '+966 5X XXX XXXX',
        keyboardType: 'phone-pad',
        autoCapitalize: 'none',
      })}

      {renderField('department', 'Department (optional)', 'القسم (اختياري)', {
        placeholder: 'e.g. Human Resources',
      })}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        Set Password / إنشاء كلمة مرور
      </Text>

      {renderField('password', 'Password', 'كلمة المرور', {
        placeholder: 'Minimum 12 characters',
        secureTextEntry: true,
        showSecure: showPassword,
        toggleSecure: () => setShowPassword(!showPassword),
        autoCapitalize: 'none',
      })}

      {renderField('confirmPassword', 'Confirm Password', 'تأكيد كلمة المرور', {
        placeholder: 'Re-enter password',
        secureTextEntry: true,
        showSecure: showConfirm,
        toggleSecure: () => setShowConfirm(!showConfirm),
        autoCapitalize: 'none',
      })}

      {/* Password requirements */}
      <View style={styles.passwordHints}>
        <Ionicons name="information-circle-outline" size={14} color={light.mutedForeground} />
        <Text style={styles.hintText}>
          {'  '}Minimum 12 characters. Include uppercase, lowercase, numbers, and symbols.
        </Text>
      </View>

      {/* Privacy notice */}
      <View style={styles.notice}>
        <Ionicons name="shield-outline" size={14} color={government.navy} />
        <Text style={styles.noticeText}>
          {'  '}Your data is protected and used only for workforce management purposes.
          {'\n  '}بياناتك محمية وتُستخدم فقط لأغراض إدارة القوى العاملة.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.82}
        testID="btn-register"
      >
        <Text style={styles.submitBtnText}>
          {loading ? 'Submitting...' : 'Submit Registration — تقديم الطلب'}
        </Text>
      </TouchableOpacity>

      {/* Sign in link */}
      <TouchableOpacity
        style={styles.signinLink}
        onPress={() => router.back()}
      >
        <Text style={styles.signinLinkText}>
          Already registered? Sign In / لديك حساب؟ تسجيل الدخول
        </Text>
      </TouchableOpacity>
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
    paddingTop: 24,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: government.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: light.border,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    fontWeight: '400',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light.card,
    borderWidth: 1.5,
    borderColor: light.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
  },
  inputError: {
    borderColor: light.destructive,
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
  },
  passwordHints: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: light.muted,
    borderRadius: 8,
    padding: 10,
    marginTop: -4,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(27, 58, 107, 0.06)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: government.navy,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.text,
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: government.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  signinLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signinLinkText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: government.navyLight,
  },
});
