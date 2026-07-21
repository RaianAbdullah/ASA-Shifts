/**
 * Vacations screen — fully Arabic, safe-area-aware, FAB for new request.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl, StatusBar,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationApi, VacationRequestDto, ApiError } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

const GREEN_DARK  = government.navyDark;
const GREEN_MID   = government.navy;
const GOLD        = government.gold;
const CREAM       = light.background;
const WHITE       = light.card;
const TEXT        = light.text;
const MUTED       = light.mutedForeground;
const BORDER      = light.border;
const GREEN       = '#22C55E';
const RED         = '#EF4444';
const AMBER       = '#F59E0B';

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_DEPT_MANAGER:  { bg: AMBER + '22',    text: '#92400E', label: 'بانتظار مدير القسم' },
  PENDING_MAIN_MANAGER:  { bg: GREEN_MID + '22', text: GREEN_DARK, label: 'بانتظار المدير العام' },
  APPROVED:              { bg: GREEN + '22',     text: '#065F46', label: 'موافق عليها' },
  REJECTED:              { bg: RED + '22',       text: '#991B1B', label: 'مرفوضة' },
  CANCELLED:             { bg: BORDER,           text: MUTED,     label: 'ملغاة' },
};

function RequestCard({ req, onCancel }: { req: VacationRequestDto; onCancel: (id: string) => void }) {
  const meta     = STATUS_META[req.status] ?? STATUS_META.PENDING_DEPT_MANAGER;
  const canCancel = req.status === 'PENDING_DEPT_MANAGER';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.requestDates}>{req.startDate} ← {req.endDate}</Text>
          <Text style={styles.requestDays}>{req.totalDays} يوم</Text>
        </View>
      </View>

      {req.reason ? <Text style={styles.requestReason}>{req.reason}</Text> : null}

      {req.deptReviewNotes ? (
        <Text style={styles.reviewNotes}>
          🏢 {req.deptReviewNotes}{req.deptReviewerNameAr ? ` — ${req.deptReviewerNameAr}` : ''}
        </Text>
      ) : null}

      {req.reviewNotes ? (
        <Text style={styles.reviewNotes}>
          💬 {req.reviewNotes}{req.reviewerNameAr ? ` — ${req.reviewerNameAr}` : ''}
        </Text>
      ) : null}

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(req.id)}>
          <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────

function RequestForm({
  visible,
  onClose,
  onSubmit,
  isPending,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (startDate: string, endDate: string, reason: string) => void;
  isPending: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [reason,    setReason]    = useState('');
  const [formError, setFormError] = useState('');

  function handleSubmit() {
    setFormError('');
    if (!startDate || !endDate) { setFormError('يرجى إدخال تاريخ البداية والنهاية.'); return; }
    onSubmit(startDate, endDate, reason);
    setStartDate(''); setEndDate(''); setReason('');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top', 'bottom']}>
          {/* Modal header */}
          <LinearGradient colors={[GREEN_DARK, GREEN_MID]} style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>طلب إجازة جديدة</Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {!!formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>تاريخ البداية (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="مثال: 2026-08-01"
              placeholderTextColor={MUTED}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              textAlign="right"
            />

            <Text style={styles.fieldLabel}>تاريخ النهاية (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="مثال: 2026-08-07"
              placeholderTextColor={MUTED}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              textAlign="right"
            />

            <Text style={styles.fieldLabel}>السبب (اختياري)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="تفسير مختصر"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlign="right"
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, isPending && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>إرسال الطلب</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function VacationsScreen() {
  const qc      = useQueryClient();
  const insets  = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);

  const { data: balanceRes } = useQuery({
    queryKey: ['vacation-balance'],
    queryFn:  () => vacationApi.getBalance(),
    staleTime: 60_000,
  });
  const balance = balanceRes?.data;

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['vacation-requests'],
    queryFn:  async () => { const r = await vacationApi.list(); return r.data ?? []; },
    staleTime: 30_000,
  });

  const submitMutation = useMutation({
    mutationFn: ({ startDate, endDate, reason }: { startDate: string; endDate: string; reason: string }) =>
      vacationApi.submit({ startDate, endDate, reason }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['vacation-requests'] });
      qc.invalidateQueries({ queryKey: ['vacation-balance'] });
      setShowForm(false);
      Alert.alert('تم الإرسال', 'تم إرسال طلب إجازتك إلى مدير القسم للمراجعة.');
    },
    onError: (e: ApiError) => Alert.alert('خطأ', e.message ?? 'فشل الإرسال'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => vacationApi.cancel(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['vacation-requests'] });
      qc.invalidateQueries({ queryKey: ['vacation-balance'] });
    },
    onError: (e: ApiError) => Alert.alert('خطأ', e.message ?? 'فشل الإلغاء'),
  });

  function confirmCancel(id: string) {
    Alert.alert('إلغاء الطلب', 'هل أنت متأكد أنك تريد إلغاء هذا الطلب؟', [
      { text: 'لا', style: 'cancel' },
      { text: 'نعم، إلغاء', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  const pending  = (requests as VacationRequestDto[]).filter(r =>
    r.status === 'PENDING_DEPT_MANAGER' || r.status === 'PENDING_MAIN_MANAGER');
  const approved = (requests as VacationRequestDto[]).filter(r => r.status === 'APPROVED');
  const past     = (requests as VacationRequestDto[]).filter(r =>
    r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* Header */}
      <LinearGradient
        colors={[GREEN_DARK, GREEN_MID]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.screenHeader, { paddingTop: insets.top + 16 }]}
      >
        <View>
          <Text style={styles.screenTitle}>الإجازات</Text>
          <Text style={styles.screenSubtitle}>طلباتي ورصيدي</Text>
        </View>
        <Ionicons name="sunny-outline" size={28} color={GOLD} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={GREEN_MID} />
        }
      >
        {/* Balance card */}
        {balance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>رصيد الإجازة {balance.year}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: GREEN_DARK }]}>{balance.daysAllowed}</Text>
                <Text style={styles.balanceLabel}>المقرر</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: AMBER }]}>{balance.daysUsed}</Text>
                <Text style={styles.balanceLabel}>المستخدم</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={[styles.balanceNum, { color: GREEN }]}>{balance.daysRemaining}</Text>
                <Text style={styles.balanceLabel}>المتبقي</Text>
              </View>
            </View>
          </View>
        )}

        {isLoading && <ActivityIndicator color={GREEN_MID} style={{ marginTop: 40 }} />}

        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>قيد الانتظار ({pending.length})</Text>
            {pending.map(r => <RequestCard key={r.id} req={r} onCancel={confirmCancel} />)}
          </>
        )}

        {approved.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>موافق عليها</Text>
            {approved.map(r => <RequestCard key={r.id} req={r} onCancel={confirmCancel} />)}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>الطلبات السابقة</Text>
            {past.map(r => <RequestCard key={r.id} req={r} onCancel={confirmCancel} />)}
          </>
        )}

        {!isLoading && (requests as VacationRequestDto[]).length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات إجازة</Text>
            <Text style={styles.emptyBody}>اضغط على الزر + لتقديم طلب إجازة جديد</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB — floating action button at bottom right */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowForm(true); }}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[GREEN_MID, GREEN_DARK]} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* New request modal */}
      <RequestForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(startDate, endDate, reason) => submitMutation.mutate({ startDate, endDate, reason })}
        isPending={submitMutation.isPending}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: CREAM },
  scroll:{ padding: 20 },

  // Header
  screenHeader:   { paddingHorizontal: 20, paddingBottom: 20,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  screenTitle:    { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right' },
  screenSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, textAlign: 'right' },

  // Balance card
  balanceCard:    { backgroundColor: WHITE, borderRadius: 18, padding: 18, marginBottom: 20,
                    borderWidth: 1, borderColor: BORDER,
                    shadowColor: GREEN_DARK, shadowOpacity: 0.10, shadowRadius: 16,
                    shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  balanceTitle:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: MUTED,
                    marginBottom: 14, textAlign: 'center' },
  balanceRow:     { flexDirection: 'row', alignItems: 'center' },
  balanceStat:    { flex: 1, alignItems: 'center' },
  balanceNum:     { fontSize: 30, fontFamily: 'Inter_700Bold' },
  balanceLabel:   { fontSize: 12, color: MUTED, marginTop: 4, fontFamily: 'Inter_400Regular' },
  balanceDivider: { width: 1, height: 40, backgroundColor: BORDER },

  sectionTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: MUTED,
                  letterSpacing: 0.5, marginBottom: 10, marginTop: 6,
                  textAlign: 'right', textTransform: 'uppercase' },

  // Request cards
  requestCard:   { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12,
                   borderWidth: 1, borderColor: BORDER,
                   shadowColor: GREEN_DARK, shadowOpacity: 0.08, shadowRadius: 12,
                   shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'flex-start', marginBottom: 8 },
  requestDates:  { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: TEXT, textAlign: 'right' },
  requestDays:   { fontSize: 12, color: MUTED, marginTop: 2, textAlign: 'right' },
  statusBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 160 },
  statusText:    { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  requestReason: { fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 8, textAlign: 'right' },
  reviewNotes:   { fontSize: 13, color: MUTED, backgroundColor: CREAM, borderRadius: 8,
                   padding: 10, marginBottom: 8, borderWidth: 1, borderColor: BORDER,
                   textAlign: 'right' },
  cancelBtn:     { borderWidth: 1.5, borderColor: RED, borderRadius: 10, padding: 10,
                   alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: RED, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  emptyCard:  { backgroundColor: WHITE, borderRadius: 18, padding: 32,
                alignItems: 'center', marginTop: 12,
                borderWidth: 1, borderColor: BORDER,
                shadowColor: GREEN_DARK, shadowOpacity: 0.08, shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: TEXT, marginBottom: 10 },
  emptyBody:  { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },

  // FAB
  fab:         { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30,
                 shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
                 shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  fabGradient: { width: 60, height: 60, borderRadius: 30,
                 alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalHeader: { paddingHorizontal: 20, paddingVertical: 18,
                 flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle:  { flex: 1, fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff',
                 textAlign: 'right' },
  closeBtn:    { padding: 4 },
  modalScroll: { padding: 20, paddingBottom: 40 },

  errorBox:   { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16,
                borderWidth: 1, borderColor: '#FECACA' },
  errorText:  { color: '#991B1B', fontSize: 14, textAlign: 'right' },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: GREEN_DARK,
                marginBottom: 6, textAlign: 'right' },
  input:      { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 14,
                fontSize: 15, color: TEXT, backgroundColor: WHITE,
                marginBottom: 16, minHeight: 52 },
  textArea:   { minHeight: 90, textAlignVertical: 'top' },
  submitBtn:  { backgroundColor: GREEN_MID, borderRadius: 14, paddingVertical: 16,
                alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  disabledBtn:   { opacity: 0.5 },
});
