/**
 * Profile & Settings screen — dark theme, bilingual
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
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
const NAVY = government.navy;
const GOLD = government.gold;

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
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName?.[0] ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName ?? '—'}</Text>
            <Text style={styles.userRole}>{userRole ?? ''}</Text>
          </View>
        </View>

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
                <Ionicons name="shield-checkmark" size={22} color={NAVY} />
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
            <Ionicons name="language-outline" size={22} color={NAVY} style={styles.rowIconLeft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{locale === 'ar' ? t('languageAr') : t('languageEn')}</Text>
              <Text style={styles.rowSub}>
                {locale === 'ar' ? `Switch to ${t('languageEn')}` : `التبديل إلى ${t('languageAr')}`}
              </Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{locale.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('activeSessions')}</Text>
          {sessLoading && <ActivityIndicator color={NAVY} style={{ marginVertical: 14 }} />}
          {!sessLoading && (!sessions || sessions.length === 0) && (
            <Text style={styles.emptyText}>{t('noActiveSessions')}</Text>
          )}
          {sessions?.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <Ionicons name="phone-portrait-outline" size={18} color={light.mutedForeground} style={{ marginRight: 10 }} />
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

        {/* Sign out */}
        <TouchableOpacity testID="btn-sign-out" style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={light.destructive} />
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
      <Ionicons name={icon} size={22} color={NAVY} style={styles.rowIconLeft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={light.mutedForeground} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: light.background },
  scroll:     { padding: 16, paddingBottom: 60 },

  header:     { flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: light.card, borderRadius: 16, padding: 16,
                marginBottom: 16, borderWidth: 1, borderColor: light.border },
  avatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: NAVY,
                alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  userName:   { fontSize: 17, fontFamily: 'Inter_700Bold', color: light.text },
  userRole:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },

  section:    { backgroundColor: light.card, borderRadius: 14, marginBottom: 14,
                borderWidth: 1, borderColor: light.border, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: light.mutedForeground,
                  letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
                  textTransform: 'uppercase' },

  adminRow:   { flexDirection: 'row', alignItems: 'center', padding: 16,
                backgroundColor: NAVY + '18', gap: 12,
                borderTopWidth: 1, borderTopColor: light.border },
  adminIcon:  { width: 42, height: 42, borderRadius: 12, backgroundColor: NAVY + '22',
                alignItems: 'center', justifyContent: 'center' },
  adminTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: light.text },
  adminSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },

  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
                borderTopWidth: 1, borderTopColor: light.border },
  rowIconLeft: { marginRight: 2 },
  rowTitle:   { fontSize: 15, fontFamily: 'Inter_500Medium', color: light.text },
  rowSub:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 2 },

  langRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
                borderTopWidth: 1, borderTopColor: light.border },
  langBadge:  { backgroundColor: NAVY + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  langBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: NAVY },

  emptyText:  { textAlign: 'center', color: light.mutedForeground, padding: 16, fontSize: 14 },

  sessionCard: { flexDirection: 'row', alignItems: 'center', padding: 14,
                 borderTopWidth: 1, borderTopColor: light.border },
  sessionDevice: { fontSize: 14, color: light.text, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  sessionDate:   { fontSize: 12, color: light.mutedForeground },
  revokeBtn:  { backgroundColor: light.destructive + '18', borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 6 },
  revokeBtnText: { color: light.destructive, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  logoutAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, margin: 12, borderRadius: 10, borderWidth: 1,
                  borderColor: light.destructive + '60', padding: 12 },
  logoutAllText: { color: light.destructive, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  signOutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 8, backgroundColor: light.destructive + '14', borderRadius: 14,
                 padding: 16, marginTop: 4 },
  signOutText: { color: light.destructive, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
