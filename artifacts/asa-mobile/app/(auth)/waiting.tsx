import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';

const { light, government } = colors;

const STEPS = [
  { icon: 'checkmark-circle', label: 'Registration submitted', labelAr: 'تم تقديم الطلب', done: true },
  { icon: 'checkmark-circle', label: 'Email verified', labelAr: 'تم التحقق من البريد', done: true },
  { icon: 'time', label: 'Pending admin review', labelAr: 'في انتظار مراجعة المسؤول', done: false },
  { icon: 'ellipse-outline', label: 'Account activation', labelAr: 'تفعيل الحساب', done: false },
];

export default function WaitingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

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
                color={step.done ? government.success ?? '#1A7A3E' : light.mutedForeground}
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

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.checkStatusBtn}
          onPress={() => {}}
          activeOpacity={0.82}
        >
          <Ionicons name="refresh-outline" size={18} color={government.navy} />
          <Text style={styles.checkStatusText}>Check Status — تحقق من الحالة</Text>
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
