/**
 * Announcements — feed of manager announcements; any employee can reply.
 * Emojis and GIFs are blocked both client-side and server-side.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl, Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi, AnnouncementDto, ReplyDto, ApiError } from '@/services/api';
import { loadSession } from '@/services/auth';
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
const AMBER       = '#F59E0B';

const POSTER_ROLES = ['SYSTEM_ADMIN', 'MAIN_MANAGER'];

// Emoji detection (mirrors backend logic)
function containsEmoji(text: string): boolean {
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/u.test(text);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Thread modal ──────────────────────────────────────────────────────────────

function ThreadModal({
  announcement, visible, onClose, myRole,
}: {
  announcement: AnnouncementDto | null;
  visible: boolean;
  onClose: () => void;
  myRole: string;
}) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { data: thread, isLoading } = useQuery({
    queryKey: ['announcement-thread', announcement?.id],
    queryFn: () => announcementApi.getThread(announcement!.id),
    enabled: visible && !!announcement,
  });

  const replyMut = useMutation({
    mutationFn: (body: string) => announcementApi.reply(announcement!.id, body),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['announcement-thread', announcement?.id] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: ApiError) => Alert.alert('Error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => announcementApi.delete(announcement!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
    },
    onError: (e: ApiError) => Alert.alert('Error', e.message),
  });

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (containsEmoji(trimmed)) {
      Alert.alert('Not allowed', 'Emojis and special symbols are not permitted.');
      return;
    }
    replyMut.mutate(trimmed);
  }

  function handleDelete() {
    Alert.alert(
      'Delete Announcement',
      'This will permanently delete the announcement and all replies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate() },
      ],
    );
  }

  const canDelete = POSTER_ROLES.includes(myRole);
  const replies: ReplyDto[] = thread?.data?.replies ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: CREAM }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header — green strip */}
        <SafeAreaView style={styles.threadHeader} edges={['top']}>
          <TouchableOpacity onPress={onClose} style={styles.threadBack}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.threadHeaderTitle} numberOfLines={1}>Announcement</Text>
          {canDelete ? (
            <TouchableOpacity onPress={handleDelete} style={styles.threadBack}>
              <Feather name="trash-2" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </SafeAreaView>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          keyboardDismissMode="interactive"
        >
          {/* Announcement body */}
          {announcement && (
            <View style={styles.threadBody}>
              {announcement.pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={12} color={GOLD} />
                  <Text style={styles.pinnedText}>Pinned</Text>
                </View>
              )}
              <Text style={styles.threadTitle}>{announcement.title}</Text>
              <Text style={styles.threadBodyText}>{announcement.body}</Text>
              <Text style={styles.threadMeta}>
                {announcement.authorNameAr} · {timeAgo(announcement.createdAt)}
              </Text>
            </View>
          )}

          {/* Replies */}
          <Text style={styles.repliesLabel}>
            {replies.length === 0 ? 'No replies yet' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
          </Text>
          {isLoading && <ActivityIndicator color={GREEN_MID} style={{ marginTop: 12 }} />}
          {replies.map(r => (
            <View key={r.id} style={styles.replyCard}>
              <View style={styles.replyAvatar}>
                <Text style={styles.replyAvatarText}>
                  {r.authorNameAr.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.replyAuthor}>{r.authorNameAr}</Text>
                <Text style={styles.replyText}>{r.body}</Text>
                <Text style={styles.replyTime}>{timeAgo(r.createdAt)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Reply input */}
        <View style={[styles.replyInputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            ref={inputRef}
            style={styles.replyInput}
            placeholder="Write a reply…"
            placeholderTextColor={MUTED}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || replyMut.isPending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!text.trim() || replyMut.isPending}
          >
            {replyMut.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── New announcement form modal ───────────────────────────────────────────────

function NewAnnouncementModal({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');
  const [pinned, setPinned] = useState(false);

  const createMut = useMutation({
    mutationFn: () => announcementApi.create(title.trim(), body.trim(), pinned),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setTitle(''); setBody(''); setPinned(false);
      onClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: ApiError) => Alert.alert('Error', e.message),
  });

  function handlePost() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Title and body are required.');
      return;
    }
    if (containsEmoji(title) || containsEmoji(body)) {
      Alert.alert('Not allowed', 'Emojis and special symbols are not permitted.');
      return;
    }
    createMut.mutate();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: CREAM }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.threadHeader} edges={['top']}>
          <TouchableOpacity onPress={onClose} style={styles.threadBack}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.threadHeaderTitle}>New Announcement</Text>
          <TouchableOpacity
            style={[styles.postBtn, (!title.trim() || !body.trim() || createMut.isPending) && { opacity: 0.4 }]}
            onPress={handlePost}
            disabled={!title.trim() || !body.trim() || createMut.isPending}
          >
            {createMut.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.postBtnText}>Post</Text>}
          </TouchableOpacity>
        </SafeAreaView>

        <ScrollView style={{ flex: 1, padding: 16 }} keyboardDismissMode="interactive">
          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Announcement title…"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            returnKeyType="next"
          />

          <Text style={styles.formLabel}>Message</Text>
          <TextInput
            style={[styles.formInput, { height: 160, textAlignVertical: 'top' }]}
            placeholder="Write your announcement here…"
            placeholderTextColor={MUTED}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={5000}
          />

          <TouchableOpacity style={styles.pinnedToggle} onPress={() => setPinned(p => !p)}>
            <Ionicons
              name={pinned ? 'checkbox' : 'square-outline'}
              size={22}
              color={pinned ? GREEN_MID : MUTED}
            />
            <Text style={[styles.pinnedToggleText, pinned && { color: GREEN_MID }]}>
              Pin this announcement
            </Text>
          </TouchableOpacity>

          <Text style={styles.emojiNote}>
            ⚠️ Emojis and GIFs are not allowed in announcements or replies.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({
  item, onPress,
}: { item: AnnouncementDto; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          {item.pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={11} color={GOLD} />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        {/* Gold badge for new items (< 24h) */}
        {Date.now() - new Date(item.createdAt).getTime() < 86_400_000 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        <Feather name="chevron-right" size={18} color={MUTED} />
      </View>
      <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.authorNameAr} · {timeAgo(item.createdAt)}</Text>
        <View style={styles.replyCountBadge}>
          <Feather name="message-square" size={12} color={GREEN_MID} />
          <Text style={styles.replyCountText}>{item.replyCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const [myRole, setMyRole] = useState<string>('');
  React.useEffect(() => {
    loadSession().then(s => { if (s?.role) setMyRole(s.role); });
  }, []);
  const canPost = POSTER_ROLES.includes(myRole);

  const [selectedItem, setSelectedItem] = useState<AnnouncementDto | null>(null);
  const [showThread,   setShowThread]   = useState(false);
  const [showNew,      setShowNew]      = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementApi.list,
  });

  function openThread(item: AnnouncementDto) {
    setSelectedItem(item);
    setShowThread(true);
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* Green header strip */}
      <View style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.screenTitle}>Announcements</Text>
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GREEN_MID} />
        }
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator color={GREEN_MID} style={{ marginTop: 40 }} />
            : (
              <View style={styles.empty}>
                <Feather name="message-square" size={40} color={MUTED} />
                <Text style={styles.emptyText}>No announcements yet</Text>
              </View>
            )
        }
        renderItem={({ item }) => (
          <AnnouncementCard item={item} onPress={() => openThread(item)} />
        )}
      />

      {/* FAB — managers only */}
      {canPost && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowNew(true)}>
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <ThreadModal
        announcement={selectedItem}
        visible={showThread}
        onClose={() => setShowThread(false)}
        myRole={myRole}
      />
      <NewAnnouncementModal
        visible={showNew}
        onClose={() => setShowNew(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: CREAM },

  // Green header strip
  screenHeader: { backgroundColor: GREEN_DARK, paddingHorizontal: 20, paddingBottom: 16 },
  screenTitle:  { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },

  // Cards — white with shadow
  card:  { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12,
           borderWidth: 1, borderColor: BORDER,
           shadowColor: '#0A4D2E', shadowOpacity: 0.10, shadowRadius: 16,
           shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: GREEN_DARK, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  cardBody:   { fontSize: 13, color: TEXT, fontFamily: 'Inter_400Regular', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta:   { fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular' },

  // Gold badge for new items
  newBadge:     { backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  newBadgeText: { fontSize: 10, color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  replyCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4,
                     backgroundColor: GREEN_MID + '14', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  replyCountText:  { fontSize: 12, color: GREEN_MID, fontFamily: 'Inter_600SemiBold' },

  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  pinnedText:  { fontSize: 11, color: GOLD, fontFamily: 'Inter_600SemiBold' },

  // Empty
  empty:      { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:  { fontSize: 15, color: MUTED, fontFamily: 'Inter_400Regular' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56,
         borderRadius: 28, backgroundColor: GREEN_MID, alignItems: 'center', justifyContent: 'center',
         shadowColor: '#0A4D2E', shadowOpacity: 0.30, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
         elevation: 6 },

  // Thread modal header — green strip
  threadHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingVertical: 14,
                       backgroundColor: GREEN_DARK },
  threadBack:        { width: 40, alignItems: 'center' },
  threadHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700',
                       color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  threadBody:        { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 20,
                       borderWidth: 1, borderColor: BORDER,
                       shadowColor: '#0A4D2E', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  threadTitle:       { fontSize: 18, fontWeight: '700', color: GREEN_DARK, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  threadBodyText:    { fontSize: 14, color: TEXT, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  threadMeta:        { marginTop: 12, fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular' },

  repliesLabel: { fontSize: 13, fontWeight: '600', color: MUTED,
                  fontFamily: 'Inter_600SemiBold', marginBottom: 10 },

  replyCard:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  replyAvatar:     { width: 36, height: 36, borderRadius: 99, backgroundColor: GOLD + '30',
                     alignItems: 'center', justifyContent: 'center' },
  replyAvatarText: { fontSize: 14, fontWeight: '700', color: GREEN_DARK },
  replyAuthor:     { fontSize: 13, fontWeight: '600', color: TEXT, fontFamily: 'Inter_600SemiBold' },
  replyText:       { fontSize: 13, color: TEXT, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 2 },
  replyTime:       { fontSize: 11, color: MUTED, fontFamily: 'Inter_400Regular', marginTop: 4 },

  replyInputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8,
                   borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: WHITE, alignItems: 'flex-end' },
  replyInput:    { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: CREAM,
                   borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                   fontSize: 14, color: TEXT, fontFamily: 'Inter_400Regular',
                   borderWidth: 1.5, borderColor: BORDER },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN_MID,
                   alignItems: 'center', justifyContent: 'center' },

  // New form
  formLabel: { fontSize: 13, fontWeight: '600', color: GREEN_DARK, fontFamily: 'Inter_600SemiBold',
               marginBottom: 6, marginTop: 16 },
  formInput:  { backgroundColor: WHITE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, color: TEXT, fontFamily: 'Inter_400Regular',
                borderWidth: 1.5, borderColor: BORDER, height: 54 },

  pinnedToggle:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  pinnedToggleText: { fontSize: 14, color: MUTED, fontFamily: 'Inter_400Regular' },

  emojiNote: { marginTop: 16, fontSize: 12, color: MUTED, fontFamily: 'Inter_400Regular',
               backgroundColor: GOLD + '18', padding: 10, borderRadius: 8,
               borderWidth: 1, borderColor: GOLD + '40' },

  postBtn:     { backgroundColor: GREEN_MID, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
