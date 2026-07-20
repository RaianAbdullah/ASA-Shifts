/**
 * Profile & Settings screen
 * Accessible from the Home tab via the profile button.
 * Provides: change password, active sessions, sign out.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, ApiError, SessionDto } from '@/services/api';
import { loadSession, clearSession } from '@/services/auth';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const BORDER = '#E5E7EB';
const RED    = '#EF4444';

export default function ProfileScreen() {
  const qc = useQueryClient();

  // ── Sessions list ─────────────────────────────────────────────────────────
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
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to revoke session');
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const session = await loadSession();
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
      'Sign Out of All Devices',
      'This will end all active sessions on every device. You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out All', style: 'destructive',
          onPress: () => logoutAllMutation.mutate() },
      ]
    );
  };

  const confirmRevokeSession = (sessionId: string, deviceInfo?: string) => {
    Alert.alert(
      'Revoke Session',
      `End session for: ${deviceInfo ?? 'Unknown device'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive',
          onPress: () => revokeMutation.mutate(sessionId) },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile &amp; Settings</Text>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(tabs)/change-password')}
          >
            <Text style={styles.rowIcon}>🔐</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Change Password</Text>
              <Text style={styles.rowSub}>Update your login password</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE SESSIONS</Text>
          {sessLoading && <ActivityIndicator color={NAVY} style={{ marginVertical: 12 }} />}
          {!sessLoading && (!sessions || sessions.length === 0) && (
            <Text style={styles.emptyText}>No active sessions</Text>
          )}
          {sessions?.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDevice} numberOfLines={1}>
                  {s.deviceInfo ?? 'Unknown device'}
                </Text>
                <Text style={styles.sessionDate}>
                  Issued: {new Date(s.issuedAt).toLocaleDateString()}
                  {s.lastUsedAt ? `  ·  Last used: ${new Date(s.lastUsedAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmRevokeSession(s.id, s.deviceInfo ?? undefined)}
                disabled={revokeMutation.isPending}
                style={styles.revokeBtn}
              >
                <Text style={styles.revokeBtnText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          ))}
          {(sessions?.length ?? 0) > 0 && (
            <TouchableOpacity
              style={styles.logoutAllBtn}
              onPress={confirmLogoutAll}
              disabled={logoutAllMutation.isPending}
            >
              <Text style={styles.logoutAllText}>
                {logoutAllMutation.isPending ? 'Signing out…' : 'Sign Out of All Devices'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  scroll:        { padding: 20, paddingBottom: 60 },
  header:        { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 16 },
  backBtn:       { padding: 4 },
  backText:      { color: GOLD, fontSize: 16, fontFamily: 'Inter_500Medium' },
  title:         { fontSize: 22, fontFamily: 'Inter_700Bold', color: NAVY },

  section:       { backgroundColor: CARD, borderRadius: 14, marginBottom: 16,
                   shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionTitle:  { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: GRAY,
                   letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  row:           { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  rowIcon:       { fontSize: 22, marginRight: 14 },
  rowBody:       { flex: 1 },
  rowTitle:      { fontSize: 16, color: NAVY, fontFamily: 'Inter_500Medium' },
  rowSub:        { fontSize: 13, color: GRAY, marginTop: 2 },
  rowArrow:      { fontSize: 20, color: GRAY },

  emptyText:     { textAlign: 'center', color: GRAY, padding: 16, fontSize: 14 },
  sessionCard:   { flexDirection: 'row', alignItems: 'center', padding: 14,
                   borderTopWidth: 1, borderTopColor: BORDER },
  sessionDevice: { fontSize: 14, color: NAVY, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  sessionDate:   { fontSize: 12, color: GRAY },
  revokeBtn:     { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  revokeBtnText: { color: RED, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  logoutAllBtn:  { margin: 14, borderRadius: 10, borderWidth: 1, borderColor: RED,
                   padding: 12, alignItems: 'center' },
  logoutAllText: { color: RED, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  signOutBtn:    { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  signOutText:   { color: RED, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
