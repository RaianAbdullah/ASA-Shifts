import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

const { government } = colors;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 16 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />

      {/* Branding */}
      <View style={styles.brand}>
        <View style={styles.emblem}>
          <Ionicons name="shield-checkmark" size={40} color={government.gold} />
        </View>
        <Text style={styles.appName}>Agency of Security Affairs</Text>
        <Text style={styles.subtitleAr}>جهاز الشؤون الأمنية</Text>
        <Text style={styles.subtitleEn}>Workforce Management System</Text>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.82}
        >
          <Text style={styles.primaryBtnText}>Sign In</Text>
          <Text style={styles.primaryBtnTextAr}>تسجيل الدخول</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.82}
        >
          <Text style={styles.secondaryBtnText}>New Employee — Register</Text>
          <Text style={styles.secondaryBtnTextAr}>موظف جديد — تسجيل</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Government Internal System · للاستخدام الداخلي فقط</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emblem: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: government.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: government.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#1A2332',
    letterSpacing: 0.2,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitleAr: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#5B6B7E',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleEn: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#8A9BB0',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: government.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  primaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#D0D9E4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#1A2332',
  },
  secondaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#5B6B7E',
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#B0BEC5',
    paddingTop: 16,
  },
});
