/**
 * ASA Workforce — Employee Home Screen
 * Clock-in / clock-out with GPS, live work timer, today's status.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadSession, clearSession, Session } from '@/services/auth';
import { attendanceApi, authApi, AttendanceResponse, ApiError } from '@/services/api';
import { getCurrentLocation } from '@/services/location';
import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

const { light, government } = colors;

const GREEN_DARK  = government.navyDark;  // "#0A4D2E"
const GREEN_MID   = government.navy;      // "#0D6B3F"
const GOLD        = government.gold;      // "#C9963F"
const CREAM       = light.background;    // "#F9FAF7"
const WHITE       = light.card;          // "#FFFFFF"
const TEXT        = light.text;          // "#1A1F1C"
const MUTED       = light.mutedForeground; // "#6B7A72"
const BORDER      = light.border;        // "#E4EBE7"

const GREEN  = '#22C55E';
const AMBER  = '#F59E0B';
const RED    = '#EF4444';

// ── Live timer ────────────────────────────────────────────────────────────────
function useWorkTimer(checkInTime: string | undefined, checkOutTime: string | undefined) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!checkInTime || checkOutTime) {
      if (ref.current) clearInterval(ref.current);
      if (checkInTime && checkOutTime) {
        const diff = Math.floor(
          (new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 1000
        );
        setElapsed(diff);
      }
      return;
    }
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [checkInTime, checkOutTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const config: Record<string, { label: string; color: string; bg: string }> = {
    PRESENT: { label: t('present'), color: GREEN,        bg: GREEN + '22' },
    LATE:    { label: t('late'),    color: AMBER,        bg: AMBER + '22' },
    ABSENT:  { label: t('absent'),  color: RED,          bg: RED   + '22' },
    EXCUSED: { label: t('excused'), color: GREEN_MID,    bg: GREEN_MID + '22' },
    HOLIDAY: { label: t('holiday'), color: MUTED,        bg: light.muted },
  };
  const c = config[status] ?? config.ABSENT;
  return (
    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusPillText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const { t }   = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    loadSession().then((s) => {
      if (!s) { router.replace('/'); return; }
      setSession(s);
    });
  }, []);

  const isAdmin = ['SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER'].includes(session?.role ?? '');

  // Today's attendance
  const { data: todayRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey:  ['attendance', 'today'],
    queryFn:   () => attendanceApi.getToday(),
    enabled:   !!session,
    refetchInterval: 60_000,
  });
  const today: AttendanceResponse | undefined = todayRes?.data;
  const timer = useWorkTimer(today?.checkInTime, today?.checkOutTime);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      setLocating(true);
      const coords = await getCurrentLocation().finally(() => setLocating(false));
      return attendanceApi.checkIn(coords.latitude, coords.longitude, false);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message
                : typeof err === 'string' ? err
                : t('checkInFailed');
      Alert.alert(t('error'), msg);
    },
  });


  const handleCheckIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('confirmCheckIn'),
      t('gpsWillBeRecorded'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('checkIn'), onPress: () => checkInMutation.mutate() },
      ]
    );
  }, [checkInMutation]);


  const handleSignOut = useCallback(async () => {
    const current = await loadSession();
    try { await authApi.logout(current?.refreshToken); } catch { /* ignore */ }
    await clearSession();
    router.replace('/');
  }, []);

  if (!session || isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={GREEN_MID} />
      </View>
    );
  }

  const isBusy  = locating || checkInMutation.isPending;
  const todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GREEN_MID} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{session.nameAr?.[0] ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>{t('goodMorning')}</Text>
              <Text style={styles.name}>{session.nameAr}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {isAdmin && (
              <TouchableOpacity onPress={() => router.replace('/(admin)')} style={styles.switchBtn}>
                <Ionicons name="shield-outline" size={20} color={GOLD} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date strip */}
        <View style={styles.dateStrip}>
          <Ionicons name="calendar-outline" size={14} color={MUTED} />
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardTop}>
            <Text style={styles.statusCardLabel}>{t('todaysStatus')}</Text>
            {today && <StatusPill status={today.status} />}
          </View>

          {/* Shift info */}
          {today?.shiftStart && (
            <View style={styles.shiftRow}>
              <Ionicons name="time-outline" size={14} color={MUTED} />
              <Text style={styles.shiftText}>
                {t('shift')}: {today.shiftStart} – {today.shiftEnd}
              </Text>
              {today.minutesLate > 0 && (
                <Text style={styles.lateChip}>{today.minutesLate} {t('minLate')}</Text>
              )}
            </View>
          )}

          {/* Times row */}
          <View style={styles.timesRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>{t('checkInTime')}</Text>
              <Text style={styles.timeBlockValue}>
                {today?.checkInTime
                  ? new Date(today.checkInTime).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>{t('duration')}</Text>
              <Text style={[styles.timeBlockValue, styles.timerText]}>
                {today?.checkInTime ? timer : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Clock-in / Clock-out button */}
        {today?.canCheckIn && (
          <TouchableOpacity
            testID="btn-check-in"
            style={[styles.clockBtn, styles.clockBtnIn, isBusy && styles.clockBtnDisabled]}
            onPress={handleCheckIn}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="finger-print-outline" size={28} color="#fff" />
                <Text style={styles.clockBtnText}>{t('checkIn')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}


        {/* Shift hasn't started yet — check-in window not open */}
        {!today?.canCheckIn && !today?.checkInTime && today?.shiftStart && (
          <View style={[styles.clockBtn, styles.clockBtnDone, { borderColor: AMBER + '44' }]}>
            <Ionicons name="time-outline" size={28} color={AMBER} />
            <Text style={[styles.clockBtnText, { color: AMBER }]}>
              {t('shiftStartsAt')} {today.shiftStart.slice(0, 5)}
            </Text>
            <Text style={[styles.clockBtnTextSub, { color: AMBER }]}>
              {t('checkInOpens')}
            </Text>
          </View>
        )}

        {today?.checkInTime && !today?.canCheckIn && (
          <View style={[styles.clockBtn, styles.clockBtnDone]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={GREEN} />
            <Text style={[styles.clockBtnText, { color: GREEN }]}>{t('attendanceRecorded')}</Text>
          </View>
        )}

        {locating && (
          <View style={styles.locatingRow}>
            <ActivityIndicator size="small" color={GREEN_MID} />
            <Text style={styles.locatingText}>{t('gettingLocation')}</Text>
          </View>
        )}

        {/* Geofence override notice (dev only) */}
        {today?.geofenceOverride && (
          <View style={styles.devNotice}>
            <Ionicons name="warning-outline" size={14} color={AMBER} />
            <Text style={styles.devNoticeText}>  Dev mode: geofence bypassed</Text>
          </View>
        )}

        {/* Attendance history link */}
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/(tabs)/attendance-history')}
        >
          <Ionicons name="time-outline" size={16} color={GREEN_MID} />
          <Text style={styles.historyLinkText}>{t('viewAttendanceHistory')}</Text>
          <Ionicons name="chevron-forward" size={16} color={GREEN_MID} />
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: CREAM },
  content:  { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },

  // Header — navyDark background, white text
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 20, paddingBottom: 20,
                backgroundColor: GREEN_DARK },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 46, height: 46, borderRadius: 99, backgroundColor: GOLD,
                alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  greeting:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)' },
  name:       { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  signOutBtn: { padding: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switchBtn: { padding: 6 },

  // Date strip
  dateStrip:  { flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 20, paddingVertical: 12, backgroundColor: CREAM },
  dateText:   { fontSize: 13, fontFamily: 'Inter_400Regular', color: MUTED },

  // Status card — white floating card
  statusCard: { marginHorizontal: 16, backgroundColor: WHITE, borderRadius: 18,
                padding: 20, borderWidth: 1, borderColor: BORDER,
                shadowColor: '#0A4D2E', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.10, shadowRadius: 16, elevation: 4, marginBottom: 20 },
  statusCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   marginBottom: 14 },
  statusCardLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: MUTED },

  statusPill: { flexDirection: 'row', gap: 6, borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 5, alignItems: 'center' },
  statusPillText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  shiftRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  shiftText:  { fontSize: 13, fontFamily: 'Inter_400Regular', color: MUTED },
  lateChip:   { backgroundColor: AMBER + '22', borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4,
                fontSize: 11, fontFamily: 'Inter_600SemiBold', color: AMBER } as any,

  timesRow:   { flexDirection: 'row', alignItems: 'center' },
  timeBlock:  { flex: 1, alignItems: 'center', gap: 4 },
  timeDivider:{ width: 1, height: 36, backgroundColor: BORDER, marginHorizontal: 8 },
  timeBlockLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: MUTED },
  timeBlockValue: { fontSize: 17, fontFamily: 'Inter_700Bold', color: TEXT },
  timerText:  { fontFamily: 'Inter_400Regular', fontSize: 15 },

  // Clock button — large green primary
  clockBtn:   { marginHorizontal: 16, borderRadius: 18, paddingVertical: 22,
                alignItems: 'center', gap: 6, marginBottom: 12 },
  clockBtnIn: { backgroundColor: GREEN_MID },
  clockBtnDone: { backgroundColor: GREEN + '14',
                  borderWidth: 2, borderColor: GREEN + '60' },
  clockBtnDisabled: { opacity: 0.55 },
  clockBtnText:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  clockBtnTextSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },

  locatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 8, marginTop: 8 },
  locatingText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: MUTED },

  devNotice:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 marginTop: 12, opacity: 0.6 },
  devNoticeText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: AMBER },

  // History link — cream tile
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 8,
                 marginHorizontal: 16, marginTop: 16, marginBottom: 8,
                 backgroundColor: WHITE, borderRadius: 14, borderWidth: 1,
                 borderColor: BORDER, padding: 16,
                 shadowColor: '#0A4D2E', shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  historyLinkText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: GREEN_MID },
});
