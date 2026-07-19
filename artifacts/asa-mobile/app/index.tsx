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

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; en: string; ar: string }[] = [
  { icon: 'calendar-outline', en: 'Weekly Work Schedules', ar: 'الجداول الأسبوعية' },
  { icon: 'checkmark-circle-outline', en: 'Attendance Check-In', ar: 'تسجيل الحضور' },
  { icon: 'umbrella-outline', en: 'Vacation Requests', ar: 'طلبات الإجازة' },
  { icon: 'shield-checkmark-outline', en: 'Secure & Audited', ar: 'آمن ومدقق' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 16 }]}>
      <StatusBar barStyle="light-content" backgroundColor={government.navy} />

      {/* Branding */}
      <View style={styles.brand}>
        <View style={styles.emblem}>
          <Ionicons name="shield-checkmark" size={40} color={government.gold} />
        </View>
        <Text style={styles.appName}>ASA Workforce</Text>
        <Text style={styles.subtitleAr}>نظام إدارة حضور القوى العاملة</Text>
        <Text style={styles.subtitleEn}>Secure Workforce Management System</Text>
      </View>

      {/* Feature highlights */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.en} style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <Ionicons name={f.icon} size={22} color={government.gold} />
            </View>
            <View style={styles.featureLabels}>
              <Text style={styles.featureEn}>{f.en}</Text>
              <Text style={styles.featureAr}>{f.ar}</Text>
            </View>
          </View>
        ))}
      </View>

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
    backgroundColor: government.navy,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    paddingTop: 32,
  },
  emblem: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(200, 168, 75, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(200, 168, 75, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitleAr: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: government.subtextOnNavy,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleEn: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: government.subtextOnNavy,
    textAlign: 'center',
  },
  features: {
    gap: 10,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: government.surfaceOverlay,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(200, 168, 75, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabels: {
    flex: 1,
  },
  featureEn: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  featureAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: government.subtextOnNavy,
    marginTop: 2,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: government.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: government.navy,
  },
  primaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: government.navyDark,
    marginTop: 2,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  secondaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: government.subtextOnNavy,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.35)',
    paddingTop: 12,
  },
});
