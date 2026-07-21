/**
 * Profile & Settings screen — Emerald Authority theme
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, ApiError, SessionDto } from '@/services/api';
import { loadSession, clearSession } from '@/services/auth';
import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

const { light, government } = colors;

const GREEN_DARK  = government.navyDark;  // "#0A4D2E"
const GREEN_MID   = government.navy;      // "#0D6B3F"
const GOLD        = government.gold;      // "#C9963F"
const CREAM       = light.background;    // "#F9FAF7"
const WHITE       = light.card;          // "#FFFFFF"
const TEXT        = light.text;          // "#1A1F1C"
const MUTED       = light.mutedForeground; // "#6B7A72"
const BORDER      = light.border;        // "#E4EBE7"

const MANAGEMENT_ROLES = ['SYSTEM_ADMIN', 'MAIN_MANAGER', 'DEPARTMENT_MANAGER', 'WEEKEND_MANAGER'];

export default function ProfileScreen() {
  const qc           = useQueryClient();
  const { t, locale, setLocale } = useLanguage();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadSession().then(s => {
      if (s) { setUserRole(s.role); setUserName(s.nameAr); }
    });
  }, []);

  // ── Sessions ───────────────────────────────────────────────────────────────
  const { data: sessions, isLoading: sessLoading } = useQuery<SessionDto[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await authApi.getSessions();
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => {
      Alert.alert(t('error'), err instanceof ApiError ? err.message : t('revokeSessionFailed'));
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await authApi.logoutAll();
      await clearSession();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    },
    onError: async () => {
      await clearSession();
      router.replace('/');
    },
  });

  const handleSignOut = useCallback(async () => {
    const current = await loadSession();
    try { await authApi.logout(current?.refreshToken); } catch { /* ignore */ }
    await clearSession();
    router.replace('/');
  }, []);

  const confirmLogoutAll = () => {
    Alert.alert(
      t('signOutAllDevices'),
      t('signOutAllConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOut'), style: 'destructive', onPress: () => logoutAllMutation.mutate() },
      ],
    );
  };

  const confirmRevokeSession = (sessionId: string, deviceInfo?: string) => {
    Alert.alert(
      t('revokeSession'),
      `${t('revokeSessionFor')}: ${deviceInfo ?? '—'}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('revoke'), style: 'destructive', onPress: () => revokeMutation.mutate(sessionId) },
      ],
    );
  };

  const handleLanguageToggle = async () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    await setLocale(next);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* Header — navyDark bg, large gold avatar, white name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName?.[0] ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName ?? '—'}</Text>
          <Text style={styles.userRole}>{userRole ?? ''}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Admin Panel — management only */}
        {userRole && MANAGEMENT_ROLES.includes(userRole) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('administration')}</Text>
            <TouchableOpacity
              style={styles.adminRow}
              onPress={() => router.push('/(admin)' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.adminIcon}>
                <Ionicons name="shield-checkmark" size={22} color={GREEN_MID} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminTitle}>{t('adminPanel')}</Text>
                <Text style={styles.adminSub}>{t('adminPanelDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={GOLD} />
            </TouchableOpacity>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          <RowItem
            icon="lock-closed-outline"
            title={t('changePassword')}
            subtitle={t('changePasswordSubtitle')}
            onPress={() => router.push('/(tabs)/change-password')}
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <TouchableOpacity style={styles.langRow} onPress={handleLanguageToggle} activeOpacity={0.8}>
            <Ionicons name="language-outline" size={22} color={GREEN_MID} style={styles.rowIconLeft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{locale === 'ar' ? t('languageAr') : t('languageEn')}</Text>
              <Text style={styles.rowSub}>
                {locale === 'ar' ? `Switch to ${t('languageEn')}` : `التبديل إلى ${t('languageAr')}`}
              </Text>
            </View>
            {/* Green active pill */}
            <View style={[styles.langBadge, locale === 'ar' ? styles.langBadgeActive : styles.langBadgeInactive]}>
              <Text style={[styles.langBadgeText, locale === 'ar' ? styles.langBadgeTextActive : styles.langBadgeTextInactive]}>
                {locale.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('activeSessions')}</Text>
          {sessLoading && <ActivityIndicator color={GREEN_MID} style={{ marginVertical: 14 }} />}
          {!sessLoading && (!sessions || sessions.length === 0) && (
            <Text style={styles.emptyText}>{t('noActiveSessions')}</Text>
          )}
          {sessions?.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <Ionicons name="phone-portrait-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDevice} numberOfLines={1}>
                  {s.deviceInfo ?? '—'}
                </Text>
                <Text style={styles.sessionDate}>
                  {t('issuedAt')}: {new Date(s.issuedAt).toLocaleDateString()}
                  {s.lastUsedAt ? `  ·  ${t('lastUsed')}: ${new Date(s.lastUsedAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmRevokeSession(s.id, s.deviceInfo ?? undefined)}
                disabled={revokeMutation.isPending}
                style={styles.revokeBtn}
              >
                <Text style={styles.revokeBtnText}>{t('revoke')}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {(sessions?.length ?? 0) > 0 && (
            <TouchableOpacity
              style={styles.logoutAllBtn}
              onPress={confirmLogoutAll}
              disabled={logoutAllMutation.isPending}
            >
              <Ionicons name="log-out-outline" size={16} color={light.destructive} />
              <Text style={styles.logoutAllText}>
                {logoutAllMutation.isPending ? t('signingOut') : t('signOutAllDevices')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out — red button at bottom */}
        <TouchableOpacity testID="btn-sign-out" style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Row helper ────────────────────────────────────────────────────────────────
function RowItem({
  icon, title, subtitle, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={22} color={GREEN_MID} style={styles.rowIconLeft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: CREAM },
  scroll:     { padding: 16, paddingBottom: 60 },

  // Header — navyDark bg, large gold avatar, white name
  header:     { flexDirection: 'row', alignItems: 'center', gap: 16,
                backgroundColor: GREEN_DARK, paddingHorizontal: 20,
                paddingTop: 16, paddingBottom: 24 },
  avatar:     { width: 64, height: 64, borderRadius: 99, backgroundColor: GOLD,
                alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff' },
  userName:   { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  userRole:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  // Sections — white cards with BORDER
  section:    { backgroundColor: WHITE, borderRadius: 16, marginBottom: 14,
                borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
                shadowColor: '#0A4D2E', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: MUTED,
                  letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
                  textTransform: 'uppercase' },

  adminRow:   { flexDirection: 'row', alignItems: 'center', padding: 16,
                backgroundColor: GREEN_MID + '10', gap: 12,
                borderTopWidth: 1, borderTopColor: BORDER },
  adminIcon:  { width: 42, height: 42, borderRadius: 12, backgroundColor: GREEN_MID + '18',
                alignItems: 'center', justifyContent: 'center' },
  adminTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: TEXT },
  adminSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 2 },

  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
                borderTopWidth: 1, borderTopColor: BORDER },
  rowIconLeft: { marginRight: 2 },
  rowTitle:   { fontSize: 15, fontFamily: 'Inter_500Medium', color: TEXT },
  rowSub:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 2 },

  langRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
                borderTopWidth: 1, borderTopColor: BORDER },
  // Language toggle: green active pill
  langBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  langBadgeActive: { backgroundColor: GREEN_MID },
  langBadgeInactive: { backgroundColor: BORDER },
  langBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  langBadgeTextActive: { color: '#FFFFFF' },
  langBadgeTextInactive: { color: MUTED },

  emptyText:  { textAlign: 'center', color: MUTED, padding: 16, fontSize: 14 },

  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: 14,
                 borderTopWidth: 1, borderTopColor: BORDER },
  sessionDevice: { fontSize: 14, color: TEXT, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  sessionDate:   { fontSize: 12, color: MUTED },
  revokeBtn:  { backgroundColor: light.destructive + '18', borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 6 },
  revokeBtnText: { color: light.destructive, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  logoutAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, margin: 12, borderRadius: 10, borderWidth: 1,
                  borderColor: light.destructive + '60', padding: 12 },
  logoutAllText: { color: light.destructive, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // Sign out — solid red button at bottom
  signOutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 8, backgroundColor: light.destructive, borderRadius: 14,
                 padding: 16, marginTop: 4 },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
