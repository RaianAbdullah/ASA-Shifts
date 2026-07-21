import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput,
  Platform, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi, vacationApi, PendingEmployee, ApiError } from '@/services/api';
import { loadSession, clearSession } from '@/services/auth';
import colors from '@/constants/colors';

const { light, government } = colors;

export default function AdminPendingScreen() {
  const insets       = useSafeAreaInsets();
  const qc           = useQueryClient();
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; employee: PendingEmployee | null }>({
    visible: false, employee: null,
  });
  const [rejectReason, setRejectReason] = useState('');

  // Guard: redirect to root if session was cleared (e.g. token expired while admin was on-screen)
  useEffect(() => {
    loadSession().then(session => {
      if (!session) router.replace('/');
    });
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn:  () => adminApi.listPending(0, 50),
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const pending: PendingEmployee[] = data?.data?.content ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approve(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Approval failed';
      Alert.alert('Error', msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.reject(id, reason),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRejectModal({ visible: false, employee: null });
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Rejection failed';
      Alert.alert('Error', msg);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = useCallback((emp: PendingEmployee) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirm Approval',
      `Approve ${emp.firstNameAr} ${emp.lastNameAr}?\n\nThis will activate their account immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default',
          onPress: () => approveMutation.mutate(emp.id) },
      ]
    );
  }, [approveMutation]);

  const handleRejectOpen = useCallback((emp: PendingEmployee) => {
    setRejectReason('');
    setRejectModal({ visible: true, employee: emp });
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (!rejectModal.employee) return;
    rejectMutation.mutate({ id: rejectModal.employee.id, reason: rejectReason });
  }, [rejectModal.employee, rejectReason, rejectMutation]);

  const handleSignOut = useCallback(async () => {
    const current = await loadSession();
    try { await authApi.logout(current?.refreshToken); } catch { /* ignore */ }
    await clearSession();
    router.replace('/');
  }, []);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: PendingEmployee }) => {
    const isBusy = approveMutation.isPending && approveMutation.variables === item.id;
    const regDate = item.registeredAt
      ? new Date(item.registeredAt).toLocaleDateString('ar-SA')
      : '—';

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.firstNameAr?.[0] ?? '?'}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.firstNameAr} {item.lastNameAr}</Text>
            <Text style={styles.cardId}>{item.nationalId}</Text>
            <Text style={styles.cardMeta}>{item.maskedPhone} · {regDate}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>

        {/* Action row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.rejectBtn, isBusy && styles.btnDisabled]}
            onPress={() => handleRejectOpen(item)}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color={light.destructive} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveBtn, isBusy && styles.btnDisabled]}
            onPress={() => handleApprove(item)}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Screen ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pending Registrations</Text>
          <Text style={styles.headerSubtitle}>طلبات التسجيل المعلّقة</Text>
        </View>
        <View style={styles.headerRight}>
          {pending.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.length}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/vacations')}
            style={styles.vacationBtn}
          >
            <Ionicons name="sunny-outline" size={22} color={government.navy} />
          </TouchableOpacity>
          <TouchableOpacity testID="btn-sign-out" onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={22} color={government.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick nav row */}
      <View style={styles.quickNav}>
        <TouchableOpacity style={styles.quickNavBtn} onPress={() => router.push('/(admin)/departments')}>
          <Ionicons name="business-outline" size={20} color={government.navy} />
          <Text style={styles.quickNavText}>Departments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickNavBtn} onPress={() => router.push('/(admin)/schedules')}>
          <Ionicons name="calendar-outline" size={20} color={government.navy} />
          <Text style={styles.quickNavText}>Schedules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickNavBtn} onPress={() => router.push('/(admin)/notifications')}>
          <Ionicons name="notifications-outline" size={20} color={government.navy} />
          <Text style={styles.quickNavText}>Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={government.navy} />
          <Text style={styles.loadingText}>Loading registrations…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={light.destructive} />
          <Text style={styles.errorText}>Failed to load registrations</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            pending.length === 0 && styles.emptyList,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={government.navy}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color={government.navy} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No pending registrations at this time.</Text>
              <Text style={styles.emptySubtitleAr}>لا توجد طلبات تسجيل معلّقة حالياً</Text>
            </View>
          }
        />
      )}

      {/* Reject modal */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal({ visible: false, employee: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Registration</Text>
            <Text style={styles.modalSubtitle}>
              {rejectModal.employee?.firstNameAr} {rejectModal.employee?.lastNameAr}
            </Text>

            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason / سبب الرفض"
              placeholderTextColor={light.mutedForeground}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal({ visible: false, employee: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, rejectMutation.isPending && styles.btnDisabled]}
                onPress={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalRejectText}>Confirm Reject</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: light.background },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 20, paddingVertical: 16,
                borderBottomWidth: 1, borderBottomColor: light.border,
                backgroundColor: light.card },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: government.navy },
  headerSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge:       { backgroundColor: light.destructive, borderRadius: 12, minWidth: 24,
                 height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:   { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' },
  vacationBtn: { padding: 4, marginRight: 4 },
 signOutBtn:  { padding: 4 },
  list:        { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  emptyList:   { flex: 1 },
  card:        { backgroundColor: light.card, borderRadius: 14, padding: 16,
                 borderWidth: 1, borderColor: light.border,
                 shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                 shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: government.navy,
                 alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  cardInfo:    { flex: 1 },
  cardName:    { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: light.text },
  cardId:      { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },
  cardMeta:    { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },
  statusBadge: { backgroundColor: 'rgba(234,170,0,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#B07800' },
  cardActions: { flexDirection: 'row', gap: 10 },
  rejectBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 6, borderWidth: 1.5, borderColor: light.destructive,
                 borderRadius: 10, paddingVertical: 11 },
  rejectBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: light.destructive },
  approveBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 6, backgroundColor: '#1A7A3E', borderRadius: 10, paddingVertical: 11 },
  approveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  errorText:   { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: light.destructive },
  retryBtn:    { backgroundColor: government.navy, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  emptyTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold', color: light.text, marginTop: 12 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: light.mutedForeground, textAlign: 'center' },
  emptySubtitleAr: { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground, textAlign: 'center' },
  quickNav:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
                  backgroundColor: light.card, borderBottomWidth: 1, borderBottomColor: light.border },
  quickNavBtn:  { flex: 1, alignItems: 'center', gap: 4, backgroundColor: light.background,
                  borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: light.border },
  quickNavText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: government.navy },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: light.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                 padding: 24, gap: 14 },
  modalTitle:  { fontSize: 18, fontFamily: 'Inter_700Bold', color: light.text },
  modalSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: -8 },
  modalLabel:  { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: light.text },
  modalInput:  { borderWidth: 1.5, borderColor: light.border, borderRadius: 10,
                 paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
                 fontFamily: 'Inter_400Regular', color: light.text, minHeight: 80,
                 textAlignVertical: 'top', ...Platform.select({ web: { outlineWidth: 0 } as any }) },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: light.border, borderRadius: 10,
                    paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: light.text },
  modalRejectBtn: { flex: 1, backgroundColor: light.destructive, borderRadius: 10,
                    paddingVertical: 14, alignItems: 'center' },
  modalRejectText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
