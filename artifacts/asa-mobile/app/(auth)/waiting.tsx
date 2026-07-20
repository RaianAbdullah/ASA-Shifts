import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { authApi, ApiError } from '@/services/api';

const { light, government } = colors;

const STEPS = [
  { icon: 'checkmark-circle', label: 'Registration submitted', labelAr: 'تم تقديم الطلب', done: true },
  { icon: 'checkmark-circle', label: 'OTP verified', labelAr: 'تم التحقق من الرمز', done: true },
  { icon: 'time', label: 'Pending admin review', labelAr: 'في انتظار مراجعة المسؤول', done: false },
  { icon: 'ellipse-outline', label: 'Account activation', labelAr: 'تفعيل الحساب', done: false },
];

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export default function WaitingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const { nationalId } = useLocalSearchParams<{ nationalId?: string }>();
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = async (silent = false) => {
    if (!nationalId) return;
    if (!silent) setChecking(true);
    try {
      const res = await authApi.getStatus(nationalId);
      const status = res.data?.status;
      if (status === 'ACTIVE') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Stop polling
        if (intervalRef.current) clearInterval(intervalRef.current);
        Alert.alert(
          '✅ Account Approved! — تم قبول حسابك',
          'Your account has been approved. Please sign in.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }],
          { cancelable: false }
        );
      } else if (status === 'REJECTED') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        Alert.alert(
          'Registration Rejected — تم رفض الطلب',
          'Your registration was rejected. Please contact your HR administrator.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      }
    } catch (err) {
      if (!silent) {
        const msg = err instanceof ApiError ? err.message : 'Could not check status.';
        Alert.alert('Status Check Failed', msg);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Auto-poll every 10 seconds
  useEffect(() => {
    if (!nationalId) return;
    // Initial check on mount
    checkStatus(true);
    intervalRef.current = setInterval(() => checkStatus(true), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nationalId]);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <StatusBar barStyle="dark-content" backgroundColor={light.background} />

      {/* Status illustration */}
      <View style={styles.illustrationArea}>
        <View style={styles.outerRing}>
          <View style={styles.innerCircle}>
            <Ionicons name="hourglass-outline" size={48} color={government.gold} />
          </View>
        </View>
      </View>

      {/* Heading */}
      <Text style={styles.title}>Application Received</Text>
      <Text style={styles.titleAr}>تم استلام طلبك</Text>
      <Text style={styles.description}>
        Your registration is under review by our administrators.
        You will receive a notification once your account is approved.
        {'\n\n'}
        طلبك قيد المراجعة من قِبل المسؤولين.
        ستتلقى إشعاراً عند الموافقة على حسابك.
      </Text>

      {/* Progress steps */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>Registration Progress — تقدم التسجيل</Text>
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Ionicons
                name={step.icon as any}
                size={20}
                color={step.done ? '#1A7A3E' : light.mutedForeground}
              />
              <View style={styles.stepLabels}>
                <Text style={[styles.stepLabel, !step.done && styles.stepLabelPending]}>
                  {step.label}
                </Text>
                <Text style={styles.stepLabelAr}>{step.labelAr}</Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.connector, step.done && styles.connectorDone]} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Auto-poll notice */}
      <View style={styles.pollNotice}>
        <Ionicons name="sync-outline" size={13} color={light.mutedForeground} />
        <Text style={styles.pollNoticeText}>
          {'  '}Checking for updates every 10 seconds · يتحقق كل 10 ثوانٍ
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.checkStatusBtn, checking && styles.btnDisabled]}
          onPress={() => checkStatus(false)}
          disabled={checking}
          activeOpacity={0.82}
        >
          <Ionicons
            name={checking ? 'hourglass-outline' : 'refresh-outline'}
            size={18}
            color={government.navy}
          />
          <Text style={styles.checkStatusText}>
            {checking ? 'Checking…' : 'Check Status — تحقق من الحالة'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.82}
        >
          <Text style={styles.backBtnText}>Back to Welcome — العودة للبداية</Text>
        </TouchableOpacity>
      </View>

      {/* Support note */}
      <Text style={styles.supportNote}>
        Need help? Contact your HR administrator.{'\n'}
        تحتاج مساعدة؟ تواصل مع مسؤول الموارد البشرية.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: light.background,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  illustrationArea: {
    marginTop: 24,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(27,58,107,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: government.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: light.text,
    textAlign: 'center',
  },
  titleAr: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  stepsCard: {
    backgroundColor: light.card,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: light.border,
  },
  stepsTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: government.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 14,
  },
  steps: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepLabels: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: light.text,
  },
  stepLabelPending: {
    color: light.mutedForeground,
    fontFamily: 'Inter_400Regular',
  },
  stepLabelAr: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
  connector: {
    position: 'absolute',
    left: 9,
    top: 22,
    width: 2,
    height: 14,
    backgroundColor: light.border,
  },
  connectorDone: {
    backgroundColor: '#1A7A3E',
  },
  pollNotice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pollNoticeText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  checkStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: government.navy,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  checkStatusText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: government.navy,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
  },
  supportNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: light.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
});
