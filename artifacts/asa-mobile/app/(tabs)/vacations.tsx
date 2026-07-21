/**
 * Vacations screen — employee can submit requests and view history.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationApi, VacationRequestDto, ApiError } from '@/services/api';
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

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_DEPT_MANAGER:  { bg: AMBER + '22', text: '#92400E', label: 'Awaiting Dept. Manager' },
  PENDING_MAIN_MANAGER:  { bg: GREEN_MID + '22', text: GREEN_DARK, label: 'Awaiting Manager Approval' },
  APPROVED:              { bg: GREEN + '22', text: '#065F46', label: 'Approved' },
  REJECTED:              { bg: RED + '22', text: '#991B1B', label: 'Rejected' },
  CANCELLED:             { bg: BORDER, text: MUTED, label: 'Cancelled' },
};

function RequestCard({
  req,
  onCancel,
}: {
  req: VacationRequestDto;
  onCancel: (id: string) => void;
}) {
  const meta = STATUS_META[req.status] ?? STATUS_META.PENDING_DEPT_MANAGER;
  const canCancel = req.status === 'PENDING_DEPT_MANAGER';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.requestDates}>
            {req.startDate} → {req.endDate}
          </Text>
          <Text style={styles.requestDays}>{req.totalDays} day{req.totalDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      {req.reason ? <Text style={styles.requestReason}>{req.reason}</Text> : null}

      {/* Stage 1 notes */}
      {req.deptReviewNotes ? (
        <Text style={styles.reviewNotes}>
          🏢 {req.deptReviewNotes}
          {req.deptReviewerNameAr ? ` — ${req.deptReviewerNameAr}` : ''}
        </Text>
      ) : null}

      {/* Stage 2 notes */}
      {req.reviewNotes ? (
        <Text style={styles.reviewNotes}>
          💬 {req.reviewNotes}
          {req.reviewerNameAr ? ` — ${req.reviewerNameAr}` : ''}
        </Text>
      ) : null}

      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel(req.id)}
        >
          <Text style={styles.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function VacationsScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: balanceRes } = useQuery({
    queryKey: ['vacation-balance'],
    queryFn:  () => vacationApi.getBalance(),
    staleTime: 60_000,
  });
  const balance = balanceRes?.data;
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [reason,    setReason]    = useState('');
  const [formError, setFormError] = useState('');

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-vacations'],
    queryFn: async () => {
      const res = await vacationApi.getMyRequests();
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: () => vacationApi.submit(startDate.trim(), endDate.trim(), reason.trim() || undefined),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['my-vacations'] });
      setShowForm(false);
      setStartDate(''); setEndDate(''); setReason(''); setFormError('');
      Alert.alert('Submitted', 'Your vacation request has been sent to your department manager for review.');
    },
    onError: (err) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFormError(err instanceof ApiError ? err.message : 'Submission failed. Please try again.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => vacationApi.cancel(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['my-vacations'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to cancel'),
  });

  const confirmCancel = (id: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this vacation request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  };

  const handleSubmit = () => {
    setFormError('');
    if (!startDate || !endDate) {
      setFormError('Start and end dates are required (YYYY-MM-DD)');
      return;
    }
    if (startDate > endDate) {
      setFormError('End date must be on or after the start date');
      return;
    }
    submitMutation.mutate();
  };

  const pending  = requests.filter(r =>
    r.status === 'PENDING_DEPT_MANAGER' || r.status === 'PENDING_MAIN_MANAGER');
  const approved = requests.filter(r => r.status === 'APPROVED');
  const past     = requests.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* Green page header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Vacations</Text>
          <Text style={styles.screenTitleAr}>طلبات الإجازة</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowForm(v => !v)}
        >
          <Text style={styles.newBtnText}>{showForm ? '✕ Close' : '+ New Request'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={GREEN_MID} />}
      >
        {/* Balance card */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>Vacation Balance {balance.year} — رصيد الإجازة</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: GREEN_DARK }]}>{balance.daysAllowed}</Text>
                <Text style={styles.balanceLabel}>Allowed</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: AMBER }]}>{balance.daysUsed}</Text>
                <Text style={styles.balanceLabel}>Used</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: GREEN }]}>{balance.daysRemaining}</Text>
                <Text style={styles.balanceLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submit form — white form card */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Vacation Request</Text>
            {!!formError && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{formError}</Text></View>
            )}
            <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="e.g. 2026-08-01"
              placeholderTextColor={MUTED}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="e.g. 2026-08-07"
              placeholderTextColor={MUTED}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Brief explanation"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            {/* Green submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitMutation.isPending && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
            >
              <Text style={styles.submitBtnText}>
                {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && <ActivityIndicator color={GREEN_MID} style={{ marginTop: 40 }} />}

        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
            {pending.map(r => (
              <RequestCard key={r.id} req={r} onCancel={confirmCancel} />
            ))}
          </>
        )}

        {approved.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Approved</Text>
            {approved.map(r => (
              <RequestCard key={r.id} req={r} onCancel={confirmCancel} />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Requests</Text>
            {past.map(r => (
              <RequestCard key={r.id} req={r} onCancel={confirmCancel} />
            ))}
          </>
        )}

        {!isLoading && requests.length === 0 && !showForm && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyTitle}>No Vacation Requests</Text>
            <Text style={styles.emptyBody}>Tap "New Request" to submit a vacation request.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: CREAM },
  scroll:       { padding: 20, paddingBottom: 80 },

  // Green page header
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
                  backgroundColor: GREEN_DARK, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  screenTitle:  { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  screenTitleAr:{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // New Request button — secondary style on header
  newBtn:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
                  paddingHorizontal: 16, paddingVertical: 10, marginTop: 4,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  newBtnText:   { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  // Balance card — white floating
  balanceCard:    { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 20,
                    borderWidth: 1, borderColor: BORDER,
                    shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                    shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  balanceTitle:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: MUTED, marginBottom: 12, textAlign: 'center' },
  balanceRow:     { flexDirection: 'row', alignItems: 'center' },
  balanceStat:    { flex: 1, alignItems: 'center' },
  balanceNum:     { fontSize: 28, fontFamily: 'Inter_700Bold' },
  balanceLabel:   { fontSize: 12, color: MUTED, marginTop: 2 },
  balanceDivider: { width: 1, height: 40, backgroundColor: BORDER },

  // Form card — white
  formCard:     { backgroundColor: WHITE, borderRadius: 16, padding: 20, marginBottom: 20,
                  borderWidth: 1, borderColor: BORDER,
                  shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  formTitle:    { fontSize: 18, fontFamily: 'Inter_700Bold', color: TEXT, marginBottom: 14 },
  errorBox:     { backgroundColor: RED + '18', borderRadius: 8, padding: 10, marginBottom: 12,
                  borderWidth: 1, borderColor: RED + '40' },
  errorText:    { color: RED, fontSize: 13 },
  fieldLabel:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: GREEN_DARK, marginBottom: 6 },
  input:        { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 15,
                  color: TEXT, backgroundColor: WHITE, marginBottom: 14, height: 54 },
  textArea:     { height: 90, textAlignVertical: 'top' },
  // Green submit button
  submitBtn:    { backgroundColor: GREEN_MID, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnText:{ color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  disabledBtn:  { opacity: 0.5 },

  sectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: MUTED,
                  letterSpacing: 0.6, marginBottom: 10, marginTop: 8, textTransform: 'uppercase' },

  // Request cards — white with status chips
  requestCard:  { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 1, borderColor: BORDER,
                  shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  requestHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  requestDates: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: TEXT },
  requestDays:  { fontSize: 13, color: MUTED, marginTop: 2 },
  // Status chips — green/amber/red
  statusBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160 },
  statusText:   { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  requestReason:{ fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 8 },
  reviewNotes:  { fontSize: 13, color: MUTED, backgroundColor: CREAM, borderRadius: 8,
                  padding: 10, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  cancelBtn:    { borderWidth: 1.5, borderColor: RED, borderRadius: 10, padding: 10,
                  alignItems: 'center', marginTop: 4 },
  cancelBtnText:{ color: RED, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  emptyCard:    { backgroundColor: WHITE, borderRadius: 18, padding: 32, alignItems: 'center', marginTop: 12,
                  borderWidth: 1, borderColor: BORDER,
                  shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  emptyIcon:    { fontSize: 56, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontFamily: 'Inter_700Bold', color: TEXT, marginBottom: 10 },
  emptyBody:    { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },
});
