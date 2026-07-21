/**
 * ASA Workforce — Employee Home Screen (EmeraldV2 design)
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
const GREEN_LIGHT = '#128A50';
const GOLD        = government.gold;      // "#C9963F"
const GOLD_LIGHT  = '#E8B86D';
const CREAM       = light.background;    // "#F9FAF7"
const WHITE       = light.card;          // "#FFFFFF"
const TEXT        = light.text;          // "#1A1F1C"
const MUTED       = light.mutedForeground; // "#6B7A72"
const BORDER      = light.border;        // "#E4EBE7"
const GREEN_PILL  = '#22C55E';
const AMBER       = '#F59E0B';
const RED         = '#EF4444';

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
        <ActivityIndicator color={GREEN_MID} size="large" />
      </View>
    );
  }

  const isBusy = locating || checkInMutation.isPending;

  // Dates
  const now = new Date();
  const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
  const miladiDate = now.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });

  // Role label
  const roleLabel: Record<string, string> = {
    SYSTEM_ADMIN: 'مدير النظام',
    MAIN_MANAGER: 'المدير العام',
    DEPARTMENT_MANAGER: 'مدير القسم',
    EMPLOYEE: 'موظف',
  };

  const checkInFormatted = today?.checkInTime
    ? new Date(today.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GOLD} />}
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={[GREEN_DARK, GREEN_MID, GREEN_LIGHT]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          {/* Decorative circles */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          {/* Top row — avatar + name + actions */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {/* Gold gradient avatar */}
              <LinearGradient
                colors={[GOLD, GOLD_LIGHT]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{session.nameAr?.[0] ?? '?'}</Text>
              </LinearGradient>

              <View>
                <Text style={styles.greeting}>أهلاً بك 👋</Text>
                <Text style={styles.name}>{session.nameAr}</Text>
                {(session.role in roleLabel) && (
                  <Text style={styles.roleBadge}>
                    {roleLabel[session.role] ?? session.role}
                  </Text>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.headerActions}>
              {isAdmin && (
                <TouchableOpacity onPress={() => router.replace('/(admin)')} style={styles.iconBtn}>
                  <Ionicons name="shield-outline" size={22} color={GOLD} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
                <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.70)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date strip — glass inside header */}
          <View style={styles.dateStrip}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>هجري</Text>
              <Text style={styles.dateValue}>{hijriDate}</Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>ميلادي</Text>
              <Text style={styles.dateValue}>{miladiDate}</Text>
            </View>
            <View style={styles.dayBadge}>
              <View style={styles.dayDot} />
              <Text style={styles.dayBadgeText}>يوم عمل</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Floating Status Card ── */}
        <View style={styles.floatingCard}>
          {/* Card header */}
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>{t('todaysStatus')}</Text>
            {today && (() => {
              const cfg = {
                PRESENT: { label: t('present'), color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
                LATE:    { label: t('late'),    color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
                ABSENT:  { label: t('absent'),  color: RED,       bg: '#FEF2F2', border: '#FECACA' },
                EXCUSED: { label: t('excused'), color: GREEN_MID, bg: '#F0FDF4', border: '#BBF7D0' },
                HOLIDAY: { label: t('holiday'), color: MUTED,     bg: light.muted, border: BORDER },
              }[today.status] ?? { label: today.status, color: RED, bg: '#FEF2F2', border: '#FECACA' };
              return (
                <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              );
            })()}
          </View>

          {/* 3-column stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>{t('checkInTime')}</Text>
              <Text style={[styles.statValue, { color: GREEN_MID, fontSize: 22 }]}>{checkInFormatted}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>{t('duration')}</Text>
              <Text style={styles.statValue}>{today?.checkInTime ? timer : '—'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>الوردية</Text>
              <Text style={styles.statValue}>
                {today?.shiftStart ? `${today.shiftStart.slice(0,5)}–${today.shiftEnd?.slice(0,5) ?? ''}` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Check-in / Confirmed banner ── */}
        {today?.canCheckIn && (
          <TouchableOpacity
            testID="btn-check-in"
            onPress={handleCheckIn}
            disabled={isBusy}
            activeOpacity={0.88}
            style={styles.bannerWrap}
          >
            <LinearGradient
              colors={[GREEN_DARK, GREEN_MID]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.banner, isBusy && { opacity: 0.6 }]}
            >
              <View style={styles.bannerGlow} />
              <View style={styles.bannerIcon}>
                {isBusy
                  ? <ActivityIndicator color="#fff" />
                  : <Ionicons name="finger-print-outline" size={26} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{t('checkIn')}</Text>
                <Text style={styles.bannerSub}>{t('gpsWillBeRecorded')}</Text>
              </View>
              <LinearGradient colors={[GOLD, GOLD_LIGHT]} style={styles.bannerBadge}>
                <Ionicons name="location-outline" size={16} color={GREEN_DARK} />
              </LinearGradient>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Shift not started yet */}
        {!today?.canCheckIn && !today?.checkInTime && today?.shiftStart && (
          <View style={[styles.bannerWrap]}>
            <View style={[styles.banner, { backgroundColor: AMBER + '14', borderWidth: 1.5, borderColor: AMBER + '44' }]}>
              <View style={styles.bannerIcon}>
                <Ionicons name="time-outline" size={26} color={AMBER} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: AMBER }]}>{t('shiftStartsAt')} {today.shiftStart.slice(0,5)}</Text>
                <Text style={[styles.bannerSub, { color: AMBER + 'AA' }]}>{t('checkInOpens')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Already checked in */}
        {today?.checkInTime && !today?.canCheckIn && (
          <View style={styles.bannerWrap}>
            <LinearGradient
              colors={[GREEN_DARK, GREEN_MID]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <View style={styles.bannerGlow} />
              <View style={styles.bannerIcon}>
                <Ionicons name="checkmark-circle-outline" size={26} color={GREEN_PILL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{t('attendanceRecorded')}</Text>
                <Text style={styles.bannerSub}>
                  {miladiDate} · {checkInFormatted}
                </Text>
              </View>
              <LinearGradient colors={[GOLD, GOLD_LIGHT]} style={styles.bannerBadge}>
                <Ionicons name="checkmark" size={16} color={GREEN_DARK} />
              </LinearGradient>
            </LinearGradient>
          </View>
        )}

        {locating && (
          <View style={styles.locatingRow}>
            <ActivityIndicator size="small" color={GREEN_MID} />
            <Text style={styles.locatingText}>{t('gettingLocation')}</Text>
          </View>
        )}

        {/* ── Quick access tiles ── */}
        <View style={styles.tiles}>
          {[
            { icon: 'bar-chart-outline', label: 'سجل الحضور', bg: '#F0FDF7', border: '#A7F3D0', color: GREEN_MID,    route: '/(tabs)/attendance-history' },
            { icon: 'airplane-outline',  label: 'إجازاتي',    bg: '#FFFBEB', border: '#FDE68A', color: '#92400E',    route: '/(tabs)/vacations' },
            { icon: 'chatbubbles-outline', label: 'الرسائل',   bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF',    route: '/(tabs)/messages' },
          ].map(tile => (
            <TouchableOpacity
              key={tile.label}
              style={[styles.tile, { backgroundColor: tile.bg, borderColor: tile.border }]}
              onPress={() => router.push(tile.route as any)}
              activeOpacity={0.78}
            >
              <Ionicons name={tile.icon as any} size={28} color={tile.color} />
              <Text style={[styles.tileLabel, { color: tile.color }]}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Attendance history link ── */}
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/(tabs)/attendance-history')}
        >
          <Ionicons name="time-outline" size={16} color={GREEN_MID} />
          <Text style={styles.historyLinkText}>{t('viewAttendanceHistory')}</Text>
          <Ionicons name="chevron-forward" size={16} color={GREEN_MID} />
        </TouchableOpacity>

        {/* ── Dev geofence notice ── */}
        {today?.geofenceOverride && (
          <View style={styles.devNotice}>
            <Ionicons name="warning-outline" size={14} color={AMBER} />
            <Text style={styles.devNoticeText}>  Dev mode: geofence bypassed</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: CREAM },
  content:  { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },

  // Decorative circles
  deco1: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)' },
  deco2: { position: 'absolute', bottom: -40, right: 80, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(201,150,63,0.08)' },
  deco3: { position: 'absolute', top: 10, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.03)' },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn:      { padding: 6 },

  avatar:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
                shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold', color: GREEN_DARK },
  greeting:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginBottom: 3, letterSpacing: 0.3 },
  name:       { fontSize: 18, fontFamily: 'Inter_700Bold', color: WHITE, letterSpacing: -0.3 },
  roleBadge:  { fontSize: 11, fontFamily: 'Inter_500Medium', color: GOLD, marginTop: 3 },

  // Date strip
  dateStrip:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)',
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  dateBlock:  { flex: 1, alignItems: 'center' },
  dateLabel:  { fontSize: 9, color: 'rgba(255,255,255,0.50)', letterSpacing: 0.4, marginBottom: 2 },
  dateValue:  { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.88)' },
  dateDivider:{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  dayBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN_PILL },
  dayBadgeText:{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: GREEN_PILL },

  // ── Floating status card ──
  floatingCard: {
    marginHorizontal: 16, marginTop: -20, zIndex: 2,
    backgroundColor: WHITE, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14, shadowRadius: 40, elevation: 8,
    marginBottom: 14,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardLabel:  { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: MUTED },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6,
                borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  statsRow:   { flexDirection: 'row', alignItems: 'center' },
  statBlock:  { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:{ width: 1, height: 36, backgroundColor: BORDER, marginHorizontal: 4 },
  statLabel:  { fontSize: 10, fontFamily: 'Inter_400Regular', color: MUTED, letterSpacing: 0.3 },
  statValue:  { fontSize: 17, fontFamily: 'Inter_700Bold', color: TEXT },

  // ── Banner ──
  bannerWrap: { marginHorizontal: 16, marginBottom: 14 },
  banner:     { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center',
                gap: 14, overflow: 'hidden', position: 'relative' },
  bannerGlow: { position: 'absolute', top: -20, left: 40, width: 80, height: 80,
                borderRadius: 40, backgroundColor: 'rgba(201,150,63,0.15)' },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0 },
  bannerTitle:{ fontSize: 16, fontFamily: 'Inter_700Bold', color: WHITE, marginBottom: 3 },
  bannerSub:  { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)' },
  bannerBadge:{ borderRadius: 10, padding: 8, flexShrink: 0 },

  // ── Quick tiles ──
  tiles: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 14 },
  tile:  { flex: 1, borderRadius: 16, borderWidth: 1.5, paddingVertical: 14,
           alignItems: 'center', gap: 8 },
  tileLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  // ── History link ──
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 8,
                 marginHorizontal: 16, marginBottom: 8,
                 backgroundColor: WHITE, borderRadius: 14, borderWidth: 1,
                 borderColor: BORDER, padding: 16,
                 shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  historyLinkText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: GREEN_MID },

  locatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 8, marginBottom: 12 },
  locatingText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: MUTED },

  devNotice:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 marginTop: 4, opacity: 0.6 },
  devNoticeText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: AMBER },
});
