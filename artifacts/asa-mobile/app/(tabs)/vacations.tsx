/**
 * Vacations screen — employee can submit requests and view history.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationApi, VacationRequestDto, ApiError } from '@/services/api';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const GREEN  = '#10B981';
const RED    = '#EF4444';
const BORDER = '#E5E7EB';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review' },
  APPROVED:  { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  REJECTED:  { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelled' },
};

function RequestCard({
  req,
  onCancel,
}: {
  req: VacationRequestDto;
  onCancel: (id: string) => void;
}) {
  const { bg, text, label } = STATUS_COLORS[req.status] ?? STATUS_COLORS.PENDING;
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View>
          <Text style={styles.requestDates}>
            {req.startDate} → {req.endDate}
          </Text>
          <Text style={styles.requestDays}>{req.totalDays} day{req.totalDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color: text }]}>{label}</Text>
        </View>
      </View>
      {req.reason ? <Text style={styles.requestReason}>{req.reason}</Text> : null}
      {req.reviewNotes ? (
        <Text style={styles.reviewNotes}>
          💬 {req.reviewNotes}
          {req.reviewerNameAr ? ` — ${req.reviewerNameAr}` : ''}
        </Text>
      ) : null}
      {req.status === 'PENDING' && (
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
      Alert.alert('Submitted', 'Your vacation request has been submitted for review.');
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

  const pending  = requests.filter(r => r.status === 'PENDING');
  const approved = requests.filter(r => r.status === 'APPROVED');
  const past     = requests.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vacations</Text>
            <Text style={styles.titleAr}>طلبات الإجازة</Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setShowForm(v => !v)}
          >
            <Text style={styles.newBtnText}>{showForm ? '✕ Close' : '+ New Request'}</Text>
          </TouchableOpacity>
        </View>

        {/* Submit form */}
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
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="e.g. 2026-08-07"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Brief explanation"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
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

        {/* Loading */}
        {isLoading && <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />}

        {/* Pending */}
        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
            {pending.map(r => (
              <RequestCard key={r.id} req={r} onCancel={confirmCancel} />
            ))}
          </>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Approved</Text>
            {approved.map(r => (
              <RequestCard key={r.id} req={r} onCancel={confirmCancel} />
            ))}
          </>
        )}

        {/* Past */}
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
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { padding: 20, paddingBottom: 80 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:        { fontSize: 26, fontFamily: 'Inter_700Bold', color: NAVY },
  titleAr:      { fontSize: 16, color: GRAY, marginTop: 2 },
  newBtn:       { backgroundColor: NAVY, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  newBtnText:   { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  formCard:     { backgroundColor: CARD, borderRadius: 16, padding: 20, marginBottom: 20,
                  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  formTitle:    { fontSize: 18, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 14 },
  errorBox:     { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText:    { color: RED, fontSize: 13 },
  fieldLabel:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: NAVY, marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 15,
                  color: NAVY, backgroundColor: BG, marginBottom: 14 },
  textArea:     { height: 80, textAlignVertical: 'top' },
  submitBtn:    { backgroundColor: NAVY, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText:{ color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  disabledBtn:  { opacity: 0.5 },

  sectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: GRAY,
                  letterSpacing: 0.6, marginBottom: 10, marginTop: 8 },

  requestCard:  { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  requestHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  requestDates: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: NAVY },
  requestDays:  { fontSize: 13, color: GRAY, marginTop: 2 },
  statusBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:   { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  requestReason:{ fontSize: 14, color: GRAY, lineHeight: 20, marginBottom: 8 },
  reviewNotes:  { fontSize: 13, color: GRAY, backgroundColor: '#F9FAFB', borderRadius: 8,
                  padding: 10, marginBottom: 8 },
  cancelBtn:    { borderWidth: 1, borderColor: RED, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  cancelBtnText:{ color: RED, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  emptyCard:    { backgroundColor: CARD, borderRadius: 18, padding: 32, alignItems: 'center', marginTop: 12,
                  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  emptyIcon:    { fontSize: 56, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 10 },
  emptyBody:    { fontSize: 15, color: GRAY, textAlign: 'center', lineHeight: 22 },
});
