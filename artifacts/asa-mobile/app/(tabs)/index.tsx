/**
 * ASA Workforce — Employee Home Screen
 * Clock-in / clock-out with GPS, live work timer, today's status.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl,
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

const { light, government } = colors;
const NAVY = government.navy as string;
const GREEN = '#1A7A3E';
const AMBER = '#B07800';
const RED   = '#C0392B';

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
  const config: Record<string, { label: string; labelAr: string; color: string; bg: string }> = {
    PRESENT: { label: 'Present',  labelAr: 'حاضر',   color: GREEN, bg: 'rgba(26,122,62,0.12)' },
    LATE:    { label: 'Late',     labelAr: 'متأخر',   color: AMBER, bg: 'rgba(176,120,0,0.12)' },
    ABSENT:  { label: 'Absent',   labelAr: 'غائب',   color: RED,   bg: 'rgba(192,57,43,0.12)' },
    EXCUSED: { label: 'Excused',  labelAr: 'معذور',  color: NAVY,  bg: 'rgba(27,58,107,0.12)' },
    HOLIDAY: { label: 'Holiday',  labelAr: 'إجازة',  color: '#555', bg: 'rgba(0,0,0,0.07)' },
  };
  const c = config[status] ?? config.ABSENT;
  return (
    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusPillText, { color: c.color }]}>{c.label}</Text>
      <Text style={[styles.statusPillAr,   { color: c.color }]}>{c.labelAr}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    loadSession().then((s) => {
      if (!s) { router.replace('/'); return; }
      setSession(s);
    });
  }, []);

  // Route management roles to admin panel
  useEffect(() => {
    if (!session) return;
    if (['SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER'].includes(session.role)) {
      router.replace('/(admin)');
    }
  }, [session]);

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
                : 'Check-in failed. Please try again.';
      Alert.alert('Check-in Failed', msg);
    },
  });


  const handleCheckIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirm Check-in',
      'Your GPS location will be recorded.\n\nتأكيد تسجيل الحضور',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Check In', onPress: () => checkInMutation.mutate() },
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
        <ActivityIndicator color={NAVY} />
      </View>
    );
  }

  const isBusy  = locating || checkInMutation.isPending;
  const todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session.nameAr?.[0] ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>صباح الخير — Good morning</Text>
            <Text style={styles.name}>{session.nameAr}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Date */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={light.mutedForeground} />
        <Text style={styles.dateText}>{todayDate}</Text>
      </View>

      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusCardTop}>
          <Text style={styles.statusCardLabel}>Today's Status — حالة اليوم</Text>
          {today && <StatusPill status={today.status} />}
        </View>

        {/* Shift info */}
        {today?.shiftStart && (
          <View style={styles.shiftRow}>
            <Ionicons name="time-outline" size={14} color={light.mutedForeground} />
            <Text style={styles.shiftText}>
              Shift: {today.shiftStart} – {today.shiftEnd}
            </Text>
            {today.minutesLate > 0 && (
              <Text style={styles.lateChip}>{today.minutesLate}min late</Text>
            )}
          </View>
        )}

        {/* Times row */}
        <View style={styles.timesRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeBlockLabel}>Check-in</Text>
            <Text style={styles.timeBlockValue}>
              {today?.checkInTime
                ? new Date(today.checkInTime).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeBlockLabel}>Duration</Text>
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
              <Text style={styles.clockBtnText}>Check In</Text>
              <Text style={styles.clockBtnTextAr}>تسجيل الحضور</Text>
            </>
          )}
        </TouchableOpacity>
      )}


      {today?.checkInTime && !today?.canCheckIn && (
        <View style={[styles.clockBtn, styles.clockBtnDone]}>
          <Ionicons name="checkmark-circle-outline" size={28} color={GREEN} />
          <Text style={[styles.clockBtnText, { color: GREEN }]}>Attendance Recorded</Text>
          <Text style={[styles.clockBtnTextAr, { color: GREEN }]}>تم تسجيل الحضور</Text>
        </View>
      )}

      {locating && (
        <View style={styles.locatingRow}>
          <ActivityIndicator size="small" color={NAVY} />
          <Text style={styles.locatingText}>Getting your location…</Text>
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
        <Ionicons name="time-outline" size={16} color={NAVY} />
        <Text style={styles.historyLinkText}>View Attendance History</Text>
        <Ionicons name="chevron-forward" size={16} color={NAVY} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: light.background },
  content:  { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 20, paddingBottom: 16,
                backgroundColor: light.card, borderBottomWidth: 1, borderBottomColor: light.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY,
                alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  greeting:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  name:       { fontSize: 15, fontFamily: 'Inter_700Bold', color: light.text },
  signOutBtn: { padding: 6 },

  dateRow:    { flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 20, paddingVertical: 12 },
  dateText:   { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground },

  statusCard: { marginHorizontal: 16, backgroundColor: light.card, borderRadius: 16,
                padding: 20, borderWidth: 1, borderColor: light.border,
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 20 },
  statusCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   marginBottom: 14 },
  statusCardLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: light.mutedForeground },

  statusPill: { flexDirection: 'row', gap: 6, borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 5, alignItems: 'center' },
  statusPillText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  statusPillAr:   { fontSize: 12, fontFamily: 'Inter_400Regular' },

  shiftRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  shiftText:  { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  lateChip:   { backgroundColor: 'rgba(176,120,0,0.12)', borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4,
                fontSize: 11, fontFamily: 'Inter_600SemiBold', color: AMBER } as any,

  timesRow:   { flexDirection: 'row', alignItems: 'center' },
  timeBlock:  { flex: 1, alignItems: 'center', gap: 4 },
  timeDivider:{ width: 1, height: 36, backgroundColor: light.border, marginHorizontal: 8 },
  timeBlockLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  timeBlockValue: { fontSize: 17, fontFamily: 'Inter_700Bold', color: light.text },
  timerText:  { fontFamily: 'Inter_400Regular', fontSize: 15 },

  clockBtn:   { marginHorizontal: 16, borderRadius: 18, paddingVertical: 22,
                alignItems: 'center', gap: 6, marginBottom: 12 },
  clockBtnIn: { backgroundColor: NAVY },
  clockBtnOut:{ backgroundColor: RED },
  clockBtnDone: { backgroundColor: 'rgba(26,122,62,0.08)',
                  borderWidth: 2, borderColor: GREEN },
  clockBtnDisabled: { opacity: 0.55 },
  clockBtnText:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  clockBtnTextAr: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },

  locatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 8, marginTop: 8 },
  locatingText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground },

  devNotice:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 marginTop: 12, opacity: 0.6 },
  devNoticeText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: AMBER },

  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 8,
                 marginHorizontal: 16, marginTop: 16, marginBottom: 8,
                 backgroundColor: 'rgba(26,35,50,0.06)', borderRadius: 12,
                 padding: 14 },
  historyLinkText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: NAVY },
});
