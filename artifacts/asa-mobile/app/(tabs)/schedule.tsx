/**
 * Schedule screen — shows the employee's current weekly work schedule.
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { scheduleApi, ScheduleDto } from '@/services/api';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const GREEN  = '#10B981';
const RED    = '#EF4444';

const ALL_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = {
  SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed',
  THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
};
const DAY_LABELS_AR: Record<string, string> = {
  SUN: 'الأحد', MON: 'الإثنين', TUE: 'الثلاثاء', WED: 'الأربعاء',
  THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت',
};

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
      {/* Shift times */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Shift Start</Text>
          <Text style={styles.timeValue}>{formatTime(schedule.shiftStart)}</Text>
        </View>
        <View style={styles.timeSep}><Text style={styles.timeSepText}>→</Text></View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Shift End</Text>
          <Text style={styles.timeValue}>{formatTime(schedule.shiftEnd)}</Text>
        </View>
      </View>

      {/* Work-day grid */}
      <Text style={styles.sectionLabel}>Work Days</Text>
      <View style={styles.dayGrid}>
        {ALL_DAYS.map(day => {
          const isWork = workSet.has(day);
          return (
            <View
              key={day}
              style={[styles.dayChip, isWork ? styles.dayChipWork : styles.dayChipOff]}
            >
              <Text style={[styles.dayChipText, isWork ? styles.dayChipTextWork : styles.dayChipTextOff]}>
                {DAY_LABELS[day]}
              </Text>
              <Text style={[styles.dayChipAr, isWork ? styles.dayChipTextWork : styles.dayChipTextOff]}>
                {DAY_LABELS_AR[day]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Status badges */}
      <View style={styles.badgeRow}>
        {schedule.todayIsWorkDay && (
          <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.badgeText, { color: GREEN }]}>✓ Today is a work day</Text>
          </View>
        )}
        {!schedule.todayIsWorkDay && (
          <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.badgeText, { color: GRAY }]}>Today is off</Text>
          </View>
        )}
        {schedule.isWeekendDuty && (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: '#92400E' }]}>Weekend Duty</Text>
          </View>
        )}
      </View>

      {schedule.notes && (
        <Text style={styles.notes}>📝 {schedule.notes}</Text>
      )}

      <Text style={styles.weekLabel}>
        Week of {schedule.weekStart}
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Schedule</Text>
          <Text style={styles.titleAr}>جدول العمل</Text>
        </View>

        {isLoading && (
          <ActivityIndicator color={NAVY} style={{ marginTop: 60 }} />
        )}

        {!isLoading && !schedule && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Schedule Yet</Text>
            <Text style={styles.emptyBody}>
              Your work schedule has not been assigned yet.{'\n'}
              Please contact your department manager.
            </Text>
            <Text style={styles.emptyBodyAr}>لم يتم تعيين جدول عمل بعد. يرجى التواصل مع مدير القسم.</Text>
          </View>
        )}

        {schedule && <ScheduleCard schedule={schedule} />}

        {!!error && (
          <Text style={styles.errorText}>Failed to load schedule. Pull down to retry.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  scroll:      { padding: 20, paddingBottom: 60 },
  header:      { marginBottom: 20 },
  title:       { fontSize: 26, fontFamily: 'Inter_700Bold', color: NAVY },
  titleAr:     { fontSize: 18, color: GRAY, marginTop: 2 },

  card:        { backgroundColor: CARD, borderRadius: 18, padding: 24,
                 shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14,
                 shadowOffset: { width: 0, height: 4 }, elevation: 4 },

  timeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  timeBlock:   { flex: 1, alignItems: 'center' },
  timeLabel:   { fontSize: 12, color: GRAY, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  timeValue:   { fontSize: 22, fontFamily: 'Inter_700Bold', color: NAVY },
  timeSep:     { paddingHorizontal: 16 },
  timeSepText: { fontSize: 22, color: GOLD },

  sectionLabel:{ fontSize: 12, color: GRAY, fontFamily: 'Inter_600SemiBold',
                 letterSpacing: 0.8, marginBottom: 12 },
  dayGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  dayChip:     { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                 alignItems: 'center', minWidth: 46 },
  dayChipWork: { backgroundColor: NAVY },
  dayChipOff:  { backgroundColor: '#F3F4F6' },
  dayChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  dayChipAr:   { fontSize: 10, marginTop: 2 },
  dayChipTextWork: { color: '#FFFFFF' },
  dayChipTextOff:  { color: GRAY },

  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText:   { fontSize: 13, fontFamily: 'Inter_500Medium' },

  notes:       { fontSize: 14, color: GRAY, lineHeight: 20, marginBottom: 12 },
  weekLabel:   { fontSize: 12, color: GRAY, textAlign: 'right' },

  emptyCard:   { backgroundColor: CARD, borderRadius: 18, padding: 32, alignItems: 'center',
                 shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
                 shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 10 },
  emptyBody:   { fontSize: 15, color: GRAY, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  emptyBodyAr: { fontSize: 13, color: GRAY, textAlign: 'center', lineHeight: 20 },
  errorText:   { textAlign: 'center', color: RED, marginTop: 24, fontSize: 14 },
});
