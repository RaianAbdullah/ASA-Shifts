/**
 * Admin — Notification Inbox
 * Shows push notifications received on this device, stored locally via AsyncStorage.
 * A listener saves incoming notifications automatically while the app is open.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = '@asa_notification_log';
const MAX_STORED  = 100;

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const RED    = '#EF4444';
const BORDER = '#E5E7EB';

interface StoredNotification {
  id:        string;
  title:     string;
  body:      string;
  receivedAt:string;
  data?:     Record<string, unknown>;
}

async function loadNotifications(): Promise<StoredNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveNotification(n: StoredNotification): Promise<void> {
  const existing = await loadNotifications();
  const updated  = [n, ...existing].slice(0, MAX_STORED);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

async function clearNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const [items, setItems]       = useState<StoredNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setItems(await loadNotifications());
  }, []);

  useEffect(() => {
    reload();

    // Listen for notifications received while screen is mounted
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      const n: StoredNotification = {
        id:         notification.request.identifier,
        title:      notification.request.content.title ?? 'Notification',
        body:       notification.request.content.body  ?? '',
        receivedAt: new Date().toISOString(),
        data:       (notification.request.content.data as Record<string, unknown>) ?? {},
      };
      await saveNotification(n);
      setItems(prev => [n, ...prev].slice(0, MAX_STORED));
    });

    return () => sub.remove();
  }, [reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const confirmClear = () => {
    Alert.alert('Clear All', 'Delete all stored notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          await clearNotifications();
          setItems([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: StoredNotification }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
        </View>
        <Text style={styles.timeAgo}>{timeAgo(item.receivedAt)}</Text>
      </View>
      {item.data && Object.keys(item.data).length > 0 && (
        <Text style={styles.cardData}>
          {Object.entries(item.data)
            .map(([k, v]) => `${k}: ${v}`)
            .join('  ·  ')}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.titleAr}>الإشعارات</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={confirmClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyBody}>
              Notifications you receive while the app is open will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 16, paddingBottom: 12, backgroundColor: CARD,
                borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:    { padding: 4 },
  backText:   { color: GOLD, fontSize: 15, fontFamily: 'Inter_500Medium' },
  title:      { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY },
  titleAr:    { fontSize: 13, color: GRAY },
  clearBtn:   { borderWidth: 1, borderColor: RED, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 6 },
  clearBtnText: { color: RED, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  list:       { padding: 16, paddingBottom: 60 },

  card:       { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 10,
                shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle:  { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: NAVY, marginBottom: 4 },
  cardBody:   { fontSize: 14, color: GRAY, lineHeight: 20 },
  timeAgo:    { fontSize: 11, color: GRAY, minWidth: 60, textAlign: 'right', marginTop: 2 },
  cardData:   { fontSize: 11, color: GRAY, backgroundColor: BG, borderRadius: 6,
                padding: 8, marginTop: 10 },

  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: GRAY, marginBottom: 8 },
  emptyBody:  { fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },
});
