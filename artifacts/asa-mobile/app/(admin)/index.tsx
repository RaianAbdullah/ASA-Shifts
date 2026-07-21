import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput,
  Platform, Modal, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi, PendingEmployee, ApiError } from '@/services/api';
import { loadSession, clearSession } from '@/services/auth';
import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

const { light, government } = colors;
const GREEN_DARK = government.navyDark;  // "#0A4D2E"
const GREEN_MID  = government.navy;      // "#0D6B3F"
const GOLD       = government.gold;      // "#C9963F"
const CREAM      = light.background;    // "#F9FAF7"
const WHITE      = light.card;          // "#FFFFFF"
const TEXT       = light.text;          // "#1A1F1C"
const MUTED      = light.mutedForeground; // "#6B7A72"
const BORDER     = light.border;        // "#E4EBE7"

// ── Nav tile definitions ──────────────────────────────────────────────────────

type NavTile = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: 'employees' | 'departments' | 'schedules' | 'onDuty' | 'attendance' | 'vacations' | 'notifications' | 'announcementsTitle';
  route: string;
  color: string;
};

const NAV_TILES: NavTile[] = [
  { icon: 'people',          labelKey: 'employees',        route: '/(admin)/employees',         color: '#4A7FD4' },
  { icon: 'business',        labelKey: 'departments',      route: '/(admin)/departments',        color: '#7C5AC7' },
  { icon: 'calendar',        labelKey: 'schedules',        route: '/(admin)/schedules',          color: '#22A39F' },
  { icon: 'radio',           labelKey: 'onDuty',           route: '/(admin)/on-duty',            color: '#22C55E' },
  { icon: 'bar-chart',       labelKey: 'attendance',       route: '/(admin)/attendance-history', color: '#F59E0B' },
  { icon: 'sunny',           labelKey: 'vacations',        route: '/(admin)/vacations',          color: '#EF7C40' },
  { icon: 'notifications',   labelKey: 'notifications',    route: '/(admin)/notifications',      color: '#EF4444' },
  { icon: 'megaphone',       labelKey: 'announcementsTitle', route: '/(tabs)/announcements',     color: '#A855F7' },
];

// ── Nav Tile Component ────────────────────────────────────────────────────────

function NavTileBtn({ tile, label }: { tile: NavTile; label: string }) {
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(tile.route as any);
      }}
      activeOpacity={0.75}
    >
      <View style={[styles.tileIcon, { backgroundColor: tile.color + '22' }]}>
        <Ionicons name={tile.icon} size={26} color={tile.color} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminPendingScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const { t }  = useLanguage();

  const [session, setSession] = useState<Awaited<ReturnType<typeof loadSession>>>(null);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; employee: PendingEmployee | null }>({
    visible: false, employee: null,
  });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadSession().then(s => {
      if (!s) { router.replace('/'); return; }
      setSession(s);
    });
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn:  () => adminApi.listPending(0, 50),
    refetchInterval: 30_000,
  });

  const pending: PendingEmployee[] = data?.data?.content ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approve(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (err) => {
      Alert.alert(t('error'), err instanceof ApiError ? err.message : t('approvalFailed'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.reject(id, reason),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRejectModal({ visible: false, employee: null });
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
    },
    onError: (err) => {
      Alert.alert(t('error'), err instanceof ApiError ? err.message : t('rejectionFailed'));
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = useCallback((emp: PendingEmployee) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('confirmApproval'),
      `${t('approve')} ${emp.firstNameAr} ${emp.lastNameAr}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('approve'), onPress: () => approveMutation.mutate(emp.id) },
      ],
    );
  }, [approveMutation, t]);

  const handleSignOut = useCallback(async () => {
    const current = await loadSession();
    try { await authApi.logout(current?.refreshToken); } catch { /* ignore */ }
    await clearSession();
    router.replace('/');
  }, []);

  // ── Pending item card ─────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: PendingEmployee }) => {
    const isBusy  = approveMutation.isPending && approveMutation.variables === item.id;
    const regDate = item.registeredAt
      ? new Date(item.registeredAt).toLocaleDateString('ar-SA')
      : '—';

    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.firstNameAr?.[0] ?? '?'}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.firstNameAr} {item.lastNameAr}</Text>
              <Text style={styles.cardId}>{item.nationalId}</Text>
              <Text style={styles.cardMeta}>{item.maskedPhone} · {regDate}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{t('pendingBadge')}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.rejectBtn, isBusy && styles.btnDisabled]}
              onPress={() => { setRejectReason(''); setRejectModal({ visible: true, employee: item }); }}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={light.destructive} />
              <Text style={styles.rejectBtnText}>{t('reject')}</Text>
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
                  <Text style={styles.approveBtnText}>{t('approve')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Screen ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header — RTL: icons LEFT, name+avatar RIGHT ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {/* Actions on LEFT */}
        <View style={styles.headerRight}>
          <TouchableOpacity testID="btn-sign-out" onPress={handleSignOut} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.iconBtn}>
            <Ionicons name="person-outline" size={22} color={GOLD} />
          </TouchableOpacity>
          {pending.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.length}</Text>
            </View>
          )}
        </View>
        {/* Name + avatar on RIGHT */}
        <View style={styles.headerLeft}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerRole}>لوحة الإدارة</Text>
            <Text style={styles.headerName}>{session?.nameAr ?? '...'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session?.nameAr?.[0] ?? '?'}</Text>
          </View>
        </View>
      </View>

      {/* ── Icon grid nav ── */}
      <View style={styles.grid}>
        {NAV_TILES.map((tile) => (
          <NavTileBtn key={tile.route} tile={tile} label={t(tile.labelKey as any)} />
        ))}
      </View>

      {/* ── Pending registrations ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('pendingRegistrations')}</Text>
        {pending.length > 0 && (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GREEN_MID} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={light.destructive} />
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('retry')}</Text>
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GREEN_MID} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color={GREEN_MID} style={{ opacity: 0.25 }} />
              <Text style={styles.emptyTitle}>{t('allCaughtUp')}</Text>
              <Text style={styles.emptySubtitle}>{t('noPendingRegistrations')}</Text>
            </View>
          }
        />
      )}

      {/* ── Reject modal ── */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal({ visible: false, employee: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('rejectRegistration')}</Text>
            <Text style={styles.modalSubtitle}>
              {rejectModal.employee?.firstNameAr} {rejectModal.employee?.lastNameAr}
            </Text>

            <Text style={styles.modalLabel}>{t('rejectionReason')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('rejectionReasonPlaceholder')}
              placeholderTextColor={MUTED}
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
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, rejectMutation.isPending && styles.btnDisabled]}
                onPress={() => {
                  if (!rejectModal.employee) return;
                  rejectMutation.mutate({ id: rejectModal.employee.id, reason: rejectReason });
                }}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalRejectText}>{t('confirmReject')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: CREAM },

  // Header — matches employee home style
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 20, paddingBottom: 20,
                  backgroundColor: GREEN_DARK },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 46, height: 46, borderRadius: 99, backgroundColor: GOLD,
                  alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerRole:   { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)' },
  headerName:   { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn:      { padding: 6 },
  badge:        { backgroundColor: light.destructive, borderRadius: 12, minWidth: 22,
                  height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:    { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },

  // Icon grid — white cards on cream bg
  grid:         { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10,
                  backgroundColor: CREAM },
  tile:         { width: '30.5%', alignItems: 'center', paddingVertical: 14,
                  backgroundColor: WHITE, borderRadius: 16,
                  borderWidth: 1, borderColor: BORDER, gap: 8,
                  shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  tileIcon:     { width: 52, height: 52, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center' },
  tileLabel:    { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: TEXT, textAlign: 'center' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8,
                   paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  sectionTitle:  { fontSize: 14, fontFamily: 'Inter_700Bold', color: MUTED,
                   textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBadge:  { backgroundColor: GOLD + '30', borderRadius: 10,
                   paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: GOLD },

  // Pending list
  list:         { paddingHorizontal: 16, gap: 12 },
  emptyList:    { flex: 1 },

  // Card with gold left border accent
  card:         { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 16,
                  borderWidth: 1, borderColor: BORDER,
                  shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.10, shadowRadius: 16, elevation: 4,
                  overflow: 'hidden' },
  cardAccent:   { width: 4, backgroundColor: GOLD },
  cardInner:    { flex: 1, padding: 16 },

  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  avatar:       { width: 44, height: 44, borderRadius: 99, backgroundColor: GOLD,
                  alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: TEXT },
  cardId:       { fontSize: 13, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 2 },
  cardMeta:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 2 },
  statusBadge:  { backgroundColor: GOLD + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:   { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: GOLD },
  cardActions:  { flexDirection: 'row', gap: 10 },

  // Reject: red-outlined
  rejectBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, borderWidth: 1.5, borderColor: light.destructive,
                  borderRadius: 14, paddingVertical: 11 },
  rejectBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: light.destructive },

  // Approve: green filled
  approveBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: GREEN_MID, borderRadius: 14, paddingVertical: 11 },
  approveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled:  { opacity: 0.5 },

  // States
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  retryBtn:     { backgroundColor: GREEN_MID, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingHorizontal: 40, paddingTop: 40 },
  emptyTitle:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: TEXT, marginTop: 12 },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: MUTED, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  padding: 24, gap: 14 },
  modalTitle:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: TEXT },
  modalSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: -8 },
  modalLabel:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: TEXT },
  modalInput:   { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
                  fontFamily: 'Inter_400Regular', color: TEXT, minHeight: 80,
                  textAlignVertical: 'top', backgroundColor: WHITE,
                  ...Platform.select({ web: { outlineWidth: 0 } as any }) },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14,
                    paddingVertical: 14, alignItems: 'center', backgroundColor: WHITE },
  modalCancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: TEXT },
  modalRejectBtn: { flex: 1, backgroundColor: light.destructive, borderRadius: 14,
                    paddingVertical: 14, alignItems: 'center' },
  modalRejectText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
