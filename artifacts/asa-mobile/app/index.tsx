import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

const { light, government } = colors;

const GREEN_DARK = government.navyDark;  // "#0A4D2E"
const GREEN_MID  = government.navy;      // "#0D6B3F"
const GOLD       = government.gold;      // "#C9963F"
const CREAM      = light.background;     // "#F9FAF7"
const WHITE      = light.card;           // "#FFFFFF"
const TEXT       = light.text;           // "#1A1F1C"
const MUTED      = light.mutedForeground; // "#6B7A72"
const BORDER     = light.border;          // "#E4EBE7"

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const topPad    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* ── Green header area ── */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Image
          source={require('../assets/images/asa-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.line1}>المملكة العربية السعودية</Text>
        <Text style={styles.line2}>وكالة وزارة الداخلية للشؤون الأمنية،</Text>
        <Text style={styles.line3}>إدارة العمليات الأمنية</Text>
      </View>

      {/* ── Cream lower area ── */}
      <View style={[styles.lower, { paddingBottom: bottomPad + 24 }]}>
        <View style={{ flex: 1 }} />

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.82}
          >
            <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.82}
          >
            <Text style={styles.secondaryBtnText}>موظف جديد — تسجيل</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <Text style={styles.footer}>للاستخدام الداخلي فقط</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREEN_DARK,
  },
  header: {
    backgroundColor: GREEN_DARK,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  logo: {
    width: 190,
    height: 190,
    borderRadius: 95,
    marginBottom: 24,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: WHITE,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 10,
  },
  basmala: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: GOLD,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  line1: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: WHITE,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  line2: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
    marginBottom: 3,
  },
  line3: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },
  lower: {
    flex: 1,
    backgroundColor: CREAM,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: GREEN_MID,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: WHITE,
  },
  primaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: WHITE,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: TEXT,
  },
  secondaryBtnTextAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: MUTED,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: MUTED,
    paddingTop: 16,
  },
});
