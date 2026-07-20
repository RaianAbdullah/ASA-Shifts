/**
 * Admin/Manager — Vacation Request Management
 *
 * Two-stage approval chain:
 *   - DEPARTMENT_MANAGER sees PENDING_DEPT_MANAGER requests for their dept.
 *     Approve → advances to PENDING_MAIN_MANAGER. Reject → REJECTED.
 *   - MAIN_MANAGER / SYSTEM_ADMIN sees PENDING_MAIN_MANAGER requests.
 *     Approve → APPROVED. Reject → REJECTED.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationApi, VacationRequestDto, ApiError } from '@/services/api';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const GREEN  = '#10B981';
const BLUE   = '#3B82F6';
const RED    = '#EF4444';
const BORDER = '#E5E7EB';

type TabKey = 'pending' | 'all';

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_DEPT_MANAGER:  { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Dept. Manager' },
  PENDING_MAIN_MANAGER:  { bg: '#DBEAFE', text: '#1E40AF', label: 'Awaiting Main Manager' },
  APPROVED:              { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  REJECTED:              { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
  CANCELLED:             { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
};

function stageBadgeColor(status: string) {
  if (status === 'PENDING_DEPT_MANAGER') return { bg: '#FEF3C7', text: '#92400E' };
  if (status === 'PENDING_MAIN_MANAGER') return { bg: '#DBEAFE', text: '#1E40AF' };
  return { bg: '#F3F4F6', text: GRAY };
}

export default function AdminVacationsScreen() {
  const qc = useQueryClient();
  const [tab, setTab]   = useState<TabKey>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: pending = [], isLoading: loadingPending, refetch: refetchPending, isFetching: fetchingPending } = useQuery({
    queryKey: ['admin', 'vacations', 'pending'],
    queryFn:  async () => { const r = await vacationApi.getPending(); return r.data ?? []; },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: all = [], isLoading: loadingAll, refetch: refetchAll, isFetching: fetchingAll } = useQuery({
    queryKey: ['admin', 'vacations', 'all'],
    queryFn:  async () => { const r = await vacationApi.getAll(); return r.data ?? []; },
    staleTime: 30_000,
    enabled: tab === 'all',
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => vacationApi.approve(id, note),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'vacations'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => vacationApi.reject(id, note),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'vacations'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to reject'),
  });

  const approveLabel = (status: string) =>
    status === 'PENDING_DEPT_MANAGER' ? '✓ Forward to Manager' : '✓ Final Approve';

  const confirmApprove = (req: VacationRequestDto) => {
    const action = req.status === 'PENDING_DEPT_MANAGER'
      ? 'forward this request to the main manager'
      : 'give final approval for this vacation';
    Alert.alert(
      'Approve Vacation',
      `${req.employeeNameAr} · ${req.totalDays} day(s)\n${req.startDate} → ${req.endDate}\n\nThis will ${action}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate({ id: req.id, note: notes[req.id] }) },
      ]
    );
  };

  const confirmReject = (req: VacationRequestDto) => {
    Alert.alert(
      'Reject Vacation',
      `Reject vacation request for ${req.employeeNameAr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive',
          onPress: () => rejectMutation.mutate({ id: req.id, note: notes[req.id] }) },
      ]
    );
  };

  const displayList = tab === 'pending' ? pending : all;
  const isLoading   = tab === 'pending' ? loadingPending : loadingAll;
  const isFetching  = tab === 'pending' ? fetchingPending : fetchingAll;
  const doRefetch   = tab === 'pending' ? refetchPending : refetchAll;

  const isActionable = (req: VacationRequestDto) =>
    req.status === 'PENDING_DEPT_MANAGER' || req.status === 'PENDING_MAIN_MANAGER';

  const renderCard = (req: VacationRequestDto) => {
    const meta = STATUS_META[req.status] ?? { bg: '#F3F4F6', text: GRAY, label: req.status };
    const actionable = isActionable(req);

    return (
      <View key={req.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName}>{req.employeeNameAr}</Text>
            {req.departmentNameAr && (
              <Text style={styles.deptName}>{req.departmentNameAr}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>📅 {req.startDate} → {req.endDate}</Text>
          <Text style={styles.daysText}>{req.totalDays} day{req.totalDays !== 1 ? 's' : ''}</Text>
        </View>

        {req.reason && <Text style={styles.reason}>"{req.reason}"</Text>}

        {/* Stage 1 review trail */}
        {req.deptReviewedAt && (
          <Text style={styles.reviewMeta}>
            🏢 Dept. Manager: {req.deptReviewerNameAr ?? '—'}
            {req.deptReviewNotes ? ` · "${req.deptReviewNotes}"` : ''}
          </Text>
        )}

        {actionable && (
          <>
            <TextInput
              style={styles.noteInput}
              value={notes[req.id] ?? ''}
              onChangeText={v => setNotes(prev => ({ ...prev, [req.id]: v }))}
              placeholder="Review notes (optional)"
              maxLength={300}
              multiline
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => confirmReject(req)}
                disabled={rejectMutation.isPending}
              >
                <Text style={styles.rejectBtnText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn,
                  req.status === 'PENDING_MAIN_MANAGER' && { backgroundColor: GREEN }]}
                onPress={() => confirmApprove(req)}
                disabled={approveMutation.isPending}
              >
                <Text style={styles.approveBtnText}>{approveLabel(req.status)}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!actionable && req.reviewedAt && (
          <Text style={styles.reviewMeta}>
            ✅ Final: {req.reviewerNameAr ?? 'manager'} · {new Date(req.reviewedAt).toLocaleDateString()}
            {req.reviewNotes ? `\n"${req.reviewNotes}"` : ''}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Vacation Requests</Text>
          <Text style={styles.titleAr}>طلبات الإجازة</Text>
        </View>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {(['pending', 'all'] as TabKey[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pending' ? `Pending (${pending.length})` : 'All Requests'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={doRefetch} />}
      >
        {isLoading && <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />}

        {!isLoading && displayList.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'pending' ? 'No Pending Requests' : 'No Requests Yet'}
            </Text>
          </View>
        )}

        {displayList.map(renderCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 16, paddingBottom: 12, backgroundColor: CARD,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:      { padding: 4 },
  backText:     { color: GOLD, fontSize: 15, fontFamily: 'Inter_500Medium' },
  title:        { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY },
  titleAr:      { fontSize: 13, color: GRAY },
  badge:        { backgroundColor: RED, borderRadius: 12, paddingHorizontal: 8,
                  paddingVertical: 3 },
  badgeText:    { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 13 },

  tabs:         { flexDirection: 'row', backgroundColor: CARD,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: NAVY },
  tabText:      { fontSize: 14, color: GRAY, fontFamily: 'Inter_500Medium' },
  tabTextActive:{ color: NAVY, fontFamily: 'Inter_600SemiBold' },

  scroll:       { padding: 16, paddingBottom: 60 },

  card:         { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  empName:      { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: NAVY },
  deptName:     { fontSize: 13, color: GRAY, marginTop: 2 },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusText:   { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  dateRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateText:     { fontSize: 14, color: NAVY },
  daysText:     { fontSize: 14, color: GRAY, fontFamily: 'Inter_500Medium' },
  reason:       { fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 10 },
  noteInput:    { borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, fontSize: 14,
                  color: NAVY, backgroundColor: BG, marginBottom: 12, minHeight: 44 },
  actionRow:    { flexDirection: 'row', gap: 10 },
  rejectBtn:    { flex: 1, borderWidth: 1, borderColor: RED, borderRadius: 10,
                  padding: 12, alignItems: 'center' },
  rejectBtnText:{ color: RED, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  approveBtn:   { flex: 1, backgroundColor: BLUE, borderRadius: 10, padding: 12, alignItems: 'center' },
  approveBtnText:{ color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  reviewMeta:   { fontSize: 12, color: GRAY, marginTop: 8, lineHeight: 18 },

  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyIcon:    { fontSize: 56, marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: GRAY },
});
