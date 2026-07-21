/**
 * Schedule screen — shows the employee's current weekly work schedule.
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { scheduleApi, ScheduleDto } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

const GREEN_DARK  = government.navyDark;  // "#0A4D2E"
const GREEN_MID   = government.navy;      // "#0D6B3F"
const GOLD        = government.gold;      // "#C9963F"
const CREAM       = light.background;    // "#F9FAF7"
const WHITE       = light.card;          // "#FFFFFF"
const TEXT        = light.text;          // "#1A1F1C"
const MUTED       = light.mutedForeground; // "#6B7A72"
const BORDER      = light.border;        // "#E4EBE7"
const GREEN       = '#22C55E';
const RED         = '#EF4444';
const AMBER       = '#F59E0B';

const ALL_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = {
  SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed',
  THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
};
const DAY_LABELS_AR: Record<string, string> = {
  SUN: 'الأحد', MON: 'الإثنين', TUE: 'الثلاثاء', WED: 'الأربعاء',
  THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت',
};

// Get today's day abbreviation
const TODAY_DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];

function formatTime(t: string): string {
  // "07:30:00" → "07:30 AM"
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function ScheduleCard({ schedule }: { schedule: ScheduleDto }) {
  const workSet = new Set(schedule.workDays.split(',').map(d => d.trim()));

  return (
    <View style={styles.card}>
      {/* Shift times — RTL: End on left, Start on right */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>انتهاء الوردية</Text>
          <Text style={styles.timeValue}>{formatTime(schedule.shiftEnd)}</Text>
        </View>
        <View style={styles.timeSep}><Text style={styles.timeSepText}>←</Text></View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>بداية الوردية</Text>
          <Text style={styles.timeValue}>{formatTime(schedule.shiftStart)}</Text>
        </View>
      </View>

      {/* Work-day grid — green for active day */}
      <Text style={styles.sectionLabel}>أيام العمل</Text>
      <View style={styles.dayGrid}>
        {ALL_DAYS.map(day => {
          const isWork    = workSet.has(day);
          const isToday   = day === TODAY_DAY;
          return (
            <View
              key={day}
              style={[
                styles.dayChip,
                isWork  ? styles.dayChipWork : styles.dayChipOff,
                isToday ? styles.dayChipToday : undefined,
              ]}
            >
              <Text style={[
                styles.dayChipText,
                isWork  ? styles.dayChipTextWork : styles.dayChipTextOff,
                isToday ? styles.dayChipTextToday : undefined,
              ]}>
                {DAY_LABELS[day]}
              </Text>
              <Text style={[
                styles.dayChipAr,
                isWork  ? styles.dayChipTextWork : styles.dayChipTextOff,
                isToday ? styles.dayChipTextToday : undefined,
              ]}>
                {DAY_LABELS_AR[day]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Status badges */}
      <View style={styles.badgeRow}>
        {schedule.todayIsWorkDay && (
          <View style={[styles.badge, { backgroundColor: GREEN + '22', borderWidth: 1, borderColor: GREEN + '44' }]}>
            <Text style={[styles.badgeText, { color: '#065F46' }]}>✓ يوم عمل اليوم</Text>
          </View>
        )}
        {!schedule.todayIsWorkDay && (
          <View style={[styles.badge, { backgroundColor: BORDER }]}>
            <Text style={[styles.badgeText, { color: MUTED }]}>إجازة اليوم</Text>
          </View>
        )}
        {schedule.isWeekendDuty && (
          <View style={[styles.badge, { backgroundColor: GOLD + '22', borderWidth: 1, borderColor: GOLD + '44' }]}>
            <Text style={[styles.badgeText, { color: '#92400E' }]}>نوبة نهاية الأسبوع</Text>
          </View>
        )}
      </View>

      {schedule.notes && (
        <Text style={styles.notes}>📝 {schedule.notes}</Text>
      )}

      <Text style={styles.weekLabel}>
        أسبوع {schedule.weekStart}
      </Text>
    </View>
  );
}

export default function ScheduleScreen() {
  const { data: schedule, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: async () => {
      const res = await scheduleApi.getMySchedule();
      return res.data ?? null;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* navyDark header */}
      <View style={styles.header}>
        <Text style={styles.title}>جدول العمل</Text>
        <Text style={styles.titleAr}>جدول الوردية الأسبوعي</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={GREEN_MID} />}
      >
        {isLoading && (
          <ActivityIndicator color={GREEN_MID} style={{ marginTop: 60 }} />
        )}

        {!isLoading && !schedule && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>لا يوجد جدول بعد</Text>
            <Text style={styles.emptyBodyAr}>لم يتم تعيين جدول عمل بعد.{'\n'}يرجى التواصل مع مدير القسم.</Text>
          </View>
        )}

        {schedule && <ScheduleCard schedule={schedule} />}

        {!!error && (
          <Text style={styles.errorText}>فشل تحميل الجدول. اسحب للأسفل للمحاولة.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: CREAM },
  scroll:      { padding: 20, paddingBottom: 60 },

  // navyDark header
  header:      { backgroundColor: GREEN_DARK, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title:       { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  titleAr:     { fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 3, textAlign: 'right' },

  // White weekly grid card
  card:        { backgroundColor: WHITE, borderRadius: 18, padding: 24,
                 borderWidth: 1, borderColor: BORDER,
                 shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                 shadowOffset: { width: 0, height: 6 }, elevation: 4 },

  timeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  timeBlock:   { flex: 1, alignItems: 'center' },
  timeLabel:   { fontSize: 12, color: MUTED, fontFamily: 'Inter_500Medium', marginBottom: 4, textAlign: 'center' },
  timeValue:   { fontSize: 22, fontFamily: 'Inter_700Bold', color: TEXT, textAlign: 'center' },
  timeSep:     { paddingHorizontal: 16 },
  timeSepText: { fontSize: 22, color: GOLD },

  sectionLabel:{ fontSize: 12, color: MUTED, fontFamily: 'Inter_600SemiBold',
                 letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase', textAlign: 'right' },
  dayGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  dayChip:     { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                 alignItems: 'center', minWidth: 46 },
  // Green for work days, navyDark outline/highlight for active (today)
  dayChipWork:  { backgroundColor: GREEN_MID },
  dayChipOff:   { backgroundColor: BORDER },
  dayChipToday: { backgroundColor: GREEN_DARK, borderWidth: 2, borderColor: GOLD },
  dayChipText:  { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dayChipAr:    { fontSize: 10, marginTop: 2 },
  dayChipTextWork:  { color: '#FFFFFF' },
  dayChipTextOff:   { color: MUTED },
  dayChipTextToday: { color: '#FFFFFF' },

  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText:   { fontSize: 13, fontFamily: 'Inter_500Medium' },

  notes:       { fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 12, textAlign: 'right' },
  weekLabel:   { fontSize: 12, color: MUTED, textAlign: 'right' },

  emptyCard:   { backgroundColor: WHITE, borderRadius: 18, padding: 32, alignItems: 'center',
                 borderWidth: 1, borderColor: BORDER,
                 shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                 shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold', color: TEXT, marginBottom: 10 },
  emptyBody:   { fontSize: 15, color: MUTED, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  emptyBodyAr: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  errorText:   { textAlign: 'center', color: RED, marginTop: 24, fontSize: 14 },
});
