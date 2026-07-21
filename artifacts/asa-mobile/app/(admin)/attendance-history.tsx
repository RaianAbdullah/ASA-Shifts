import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi, DepartmentDto } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function displayDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT: '#22c55e',
  LATE:    '#f59e0b',
  ABSENT:  '#ef4444',
  EXCUSED: '#6366f1',
};

export default function AttendanceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [date, setDate]       = useState(formatDate(new Date()));
  const [deptId, setDeptId]   = useState<string | undefined>(undefined);
  const [showDepts, setShowDepts] = useState(false);

  const { data: deptRes } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => adminApi.listDepartments(),
    staleTime: 5 * 60_000,
  });
  const departments: DepartmentDto[] = deptRes?.data ?? [];

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'attendance', date, deptId],
    queryFn:  () => adminApi.getAttendanceSummary(date, deptId),
    staleTime: 60_000,
  });
  const summary = data?.data;

  const prevDay = () => setDate(d => formatDate(addDays(new Date(d), -1)));
  const nextDay = () => {
    const next = addDays(new Date(date), 1);
    if (next <= new Date()) setDate(formatDate(next));
  };
  const isToday = date === formatDate(new Date());

  const selectedDept = departments.find(d => d.id === deptId);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Attendance History</Text>
          <Text style={styles.titleAr}>سجل الحضور</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Date navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={prevDay} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={government.navy} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{displayDate(date)}</Text>
          {isToday && <Text style={styles.todayBadge}>Today</Text>}
        </View>
        <TouchableOpacity onPress={nextDay} style={[styles.navBtn, isToday && styles.navBtnDisabled]} disabled={isToday}>
          <Ionicons name="chevron-forward" size={22} color={isToday ? light.mutedForeground : government.navy} />
        </TouchableOpacity>
      </View>

      {/* Department filter */}
      <TouchableOpacity style={styles.deptFilter} onPress={() => setShowDepts(v => !v)}>
        <Ionicons name="filter-outline" size={16} color={government.navy} />
        <Text style={styles.deptFilterText}>{selectedDept ? selectedDept.nameAr : 'All Departments — جميع الأقسام'}</Text>
        <Ionicons name={showDepts ? 'chevron-up' : 'chevron-down'} size={16} color={government.navy} />
      </TouchableOpacity>
      {showDepts && (
        <View style={styles.deptDropdown}>
          <TouchableOpacity style={styles.deptOption} onPress={() => { setDeptId(undefined); setShowDepts(false); }}>
            <Text style={[styles.deptOptionText, !deptId && styles.deptOptionSelected]}>All Departments</Text>
          </TouchableOpacity>
          {departments.map(d => (
            <TouchableOpacity key={d.id} style={styles.deptOption} onPress={() => { setDeptId(d.id); setShowDepts(false); }}>
              <Text style={[styles.deptOptionText, deptId === d.id && styles.deptOptionSelected]}>{d.nameAr}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={government.navy} />}
      >
        {isLoading ? (
          <ActivityIndicator color={government.navy} style={{ marginTop: 40 }} />
        ) : isError ? (
          <View style={styles.centered}>
            <Ionicons name="warning-outline" size={40} color={light.destructive} />
            <Text style={styles.errorText}>Failed to load attendance</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : summary ? (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total',     value: summary.totalActive,  color: government.navy },
                { label: 'Present',   value: summary.checkedIn,    color: '#22c55e' },
                { label: 'Late',      value: summary.late,         color: '#f59e0b' },
                { label: 'Absent',    value: summary.absent,       color: '#ef4444' },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Records */}
            {summary.records.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="calendar-outline" size={48} color={light.mutedForeground} />
                <Text style={styles.emptyText}>No records for this day</Text>
              </View>
            ) : (
              summary.records.map((rec: any) => (
                <View key={rec.id ?? rec.employeeId} style={styles.recordCard}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[rec.status] ?? '#6b7280' }]} />
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>{rec.firstNameAr} {rec.lastNameAr}</Text>
                    <Text style={styles.recordDept}>{rec.departmentNameAr}</Text>
                  </View>
                  <View style={styles.recordTimes}>
                    <Text style={styles.recordTime}>
                      {rec.checkInTime ? `In: ${rec.checkInTime}` : 'Absent'}
                    </Text>
                    {rec.minutesLate > 0 && (
                      <Text style={styles.lateLabel}>{rec.minutesLate}m late</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: light.background },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderBottomWidth: 1, borderBottomColor: light.border },
  backBtn:            { padding: 4 },
  title:              { fontSize: 17, fontWeight: '700', color: light.text },
  titleAr:            { fontSize: 12, color: light.mutedForeground, textAlign: 'center' },
  dateNav:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
                        backgroundColor: light.card, borderBottomWidth: 1, borderBottomColor: light.border },
  navBtn:             { padding: 6 },
  navBtnDisabled:     { opacity: 0.3 },
  dateCenter:         { flex: 1, alignItems: 'center' },
  dateText:           { fontSize: 14, fontWeight: '600', color: light.text },
  todayBadge:         { fontSize: 11, color: government.navy, fontWeight: '700', marginTop: 2 },
  deptFilter:         { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16,
                        backgroundColor: government.navy + '10',
                        borderBottomWidth: 1, borderBottomColor: light.border },
  deptFilterText:     { flex: 1, marginHorizontal: 8, fontSize: 13, color: government.navy, fontWeight: '600' },
  deptDropdown:       { backgroundColor: light.card, borderBottomWidth: 1, borderBottomColor: light.border },
  deptOption:         { padding: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: light.border },
  deptOptionText:     { fontSize: 14, color: light.foreground },
  deptOptionSelected: { color: government.navy, fontWeight: '700' },
  scroll:             { padding: 12, paddingBottom: 32 },
  statsRow:           { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:           { flex: 1, backgroundColor: light.card, borderRadius: 12,
                        padding: 12, alignItems: 'center',
                        borderWidth: 1, borderColor: light.border },
  statValue:          { fontSize: 22, fontWeight: '800' },
  statLabel:          { fontSize: 11, color: light.mutedForeground, marginTop: 2 },
  recordCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: light.card,
                        borderRadius: 12, padding: 12, marginBottom: 8,
                        borderWidth: 1, borderColor: light.border },
  statusDot:          { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recordInfo:         { flex: 1 },
  recordName:         { fontSize: 14, fontWeight: '600', color: light.text },
  recordDept:         { fontSize: 12, color: light.mutedForeground },
  recordTimes:        { alignItems: 'flex-end' },
  recordTime:         { fontSize: 13, fontWeight: '600', color: light.text },
  lateLabel:          { fontSize: 11, color: '#f59e0b', marginTop: 2 },
  centered:           { alignItems: 'center', marginTop: 60 },
  errorText:          { color: light.destructive, marginBottom: 12 },
  retryBtn:           { backgroundColor: government.navy, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText:          { color: '#fff', fontWeight: '600' },
  emptyText:          { color: light.mutedForeground, marginTop: 12 },
});
