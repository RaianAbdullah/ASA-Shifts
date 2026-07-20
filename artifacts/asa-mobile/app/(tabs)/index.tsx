/**
 * Main authenticated screen — shown after login.
 * Admins see an Admin Panel shortcut; all users see their status.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loadSession, clearSession, Session } from '@/services/auth';
import colors from '@/constants/colors';

const { light, government } = colors;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession().then((s) => {
      if (!s) { router.replace('/'); return; }
      setSession(s);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await clearSession();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={government.navy} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{session?.nameAr?.[0] ?? '?'}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>مرحباً — Welcome</Text>
          <Text style={styles.name}>{session?.nameAr}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{session?.role}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={22} color={government.navy} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Admin panel shortcut */}
        {session?.role === 'ADMIN' && (
          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => router.push('/(admin)')}
            activeOpacity={0.85}
          >
            <View style={styles.adminCardIcon}>
              <Ionicons name="people-outline" size={28} color="#fff" />
            </View>
            <View style={styles.adminCardText}>
              <Text style={styles.adminCardTitle}>Admin Panel</Text>
              <Text style={styles.adminCardSubtitle}>Review pending registrations · الموافقة على الطلبات</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={government.navy} />
          </TouchableOpacity>
        )}

        {/* Placeholder for Stage 5+ features */}
        <View style={styles.comingSoon}>
          <Ionicons name="construct-outline" size={40} color={government.navy} style={{ opacity: 0.3 }} />
          <Text style={styles.comingSoonTitle}>More features coming soon</Text>
          <Text style={styles.comingSoonAr}>المزيد من الميزات قادمة قريباً</Text>
          <Text style={styles.comingSoonNote}>
            Attendance tracking, schedules, and vacation requests will be available in upcoming stages.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: light.background },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
                  paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: light.border,
                  backgroundColor: light.card, gap: 14 },
  avatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: government.navy,
                  alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerText:   { flex: 1, gap: 2 },
  greeting:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  name:         { fontSize: 16, fontFamily: 'Inter_700Bold', color: light.text },
  rolePill:     { alignSelf: 'flex-start', backgroundColor: 'rgba(27,58,107,0.10)',
                  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  roleText:     { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: government.navy },
  signOutBtn:   { padding: 6 },
  body:         { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  adminCard:    { flexDirection: 'row', alignItems: 'center', gap: 16,
                  backgroundColor: light.card, borderRadius: 16, padding: 18,
                  borderWidth: 1, borderColor: light.border,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  adminCardIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: government.navy,
                   alignItems: 'center', justifyContent: 'center' },
  adminCardText: { flex: 1 },
  adminCardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: light.text },
  adminCardSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: light.mutedForeground, marginTop: 3 },
  comingSoon:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  comingSoonTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: light.text, marginTop: 8 },
  comingSoonAr: { fontSize: 14, fontFamily: 'Inter_400Regular', color: light.mutedForeground },
  comingSoonNote: { fontSize: 13, fontFamily: 'Inter_400Regular', color: light.mutedForeground,
                    textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
