/**
 * Announcements — feed of manager announcements; any employee can reply.
 * Emojis and GIFs are blocked both client-side and server-side.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi, AnnouncementDto, ReplyDto, ApiError } from '@/services/api';
import { loadSession } from '@/services/auth';
import colors from '@/constants/colors';

const { government } = colors;
const NAVY  = government.navy;
const GOLD  = government.gold;
const BG    = '#F8F9FA';
const CARD  = '#FFFFFF';
const GRAY  = '#6B7280';
const AMBER = '#D97706';

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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: BG }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <SafeAreaView style={styles.threadHeader} edges={['top']}>
          <TouchableOpacity onPress={onClose} style={styles.threadBack}>
            <Feather name="x" size={22} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.threadHeaderTitle} numberOfLines={1}>Announcement</Text>
          {canDelete ? (
            <TouchableOpacity onPress={handleDelete} style={styles.threadBack}>
              <Feather name="trash-2" size={20} color="#DC2626" />
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
          {isLoading && <ActivityIndicator color={NAVY} style={{ marginTop: 12 }} />}
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
            placeholderTextColor={GRAY}
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
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: BG }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.threadHeader} edges={['top']}>
          <TouchableOpacity onPress={onClose} style={styles.threadBack}>
            <Feather name="x" size={22} color={NAVY} />
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
            placeholderTextColor={GRAY}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            returnKeyType="next"
          />

          <Text style={styles.formLabel}>Message</Text>
          <TextInput
            style={[styles.formInput, { height: 160, textAlignVertical: 'top' }]}
            placeholder="Write your announcement here…"
            placeholderTextColor={GRAY}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={5000}
          />

          <TouchableOpacity style={styles.pinnedToggle} onPress={() => setPinned(p => !p)}>
            <Ionicons
              name={pinned ? 'checkbox' : 'square-outline'}
              size={22}
              color={pinned ? NAVY : GRAY}
            />
            <Text style={[styles.pinnedToggleText, pinned && { color: NAVY }]}>
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
        <Feather name="chevron-right" size={18} color={GRAY} />
      </View>
      <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.authorNameAr} · {timeAgo(item.createdAt)}</Text>
        <View style={styles.replyCountBadge}>
          <Feather name="message-square" size={12} color={NAVY} />
          <Text style={styles.replyCountText}>{item.replyCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AnnouncementsScreen() {
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
      <FlatList
        data={data?.data ?? []}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />
        }
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
            : (
              <View style={styles.empty}>
                <Feather name="message-square" size={40} color={GRAY} />
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
  root:  { flex: 1, backgroundColor: BG },

  // Cards
  card:  { backgroundColor: CARD, borderRadius: 12, padding: 16, marginBottom: 12,
           shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
           elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: NAVY, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  cardBody:   { fontSize: 13, color: '#374151', fontFamily: 'Inter_400Regular', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta:   { fontSize: 12, color: GRAY, fontFamily: 'Inter_400Regular' },

  replyCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4,
                     backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  replyCountText:  { fontSize: 12, color: NAVY, fontFamily: 'Inter_600SemiBold' },

  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  pinnedText:  { fontSize: 11, color: GOLD, fontFamily: 'Inter_600SemiBold' },

  // Empty
  empty:      { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:  { fontSize: 15, color: GRAY, fontFamily: 'Inter_400Regular' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56,
         borderRadius: 28, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
         shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
         elevation: 6 },

  // Thread modal
  threadHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingVertical: 12,
                       borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: CARD },
  threadBack:        { width: 40, alignItems: 'center' },
  threadHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700',
                       color: NAVY, fontFamily: 'Inter_700Bold' },
  threadBody:        { backgroundColor: CARD, borderRadius: 12, padding: 16, marginBottom: 20,
                       shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  threadTitle:       { fontSize: 18, fontWeight: '700', color: NAVY, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  threadBodyText:    { fontSize: 14, color: '#374151', fontFamily: 'Inter_400Regular', lineHeight: 22 },
  threadMeta:        { marginTop: 12, fontSize: 12, color: GRAY, fontFamily: 'Inter_400Regular' },

  repliesLabel: { fontSize: 13, fontWeight: '600', color: GRAY,
                  fontFamily: 'Inter_600SemiBold', marginBottom: 10 },

  replyCard:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  replyAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY + '20',
                     alignItems: 'center', justifyContent: 'center' },
  replyAvatarText: { fontSize: 14, fontWeight: '700', color: NAVY },
  replyAuthor:     { fontSize: 13, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold' },
  replyText:       { fontSize: 13, color: '#374151', fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 2 },
  replyTime:       { fontSize: 11, color: GRAY, fontFamily: 'Inter_400Regular', marginTop: 4 },

  replyInputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8,
                   borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: CARD, alignItems: 'flex-end' },
  replyInput:    { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#F3F4F6',
                   borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
                   fontSize: 14, color: '#111827', fontFamily: 'Inter_400Regular' },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY,
                   alignItems: 'center', justifyContent: 'center' },

  // New form
  formLabel: { fontSize: 13, fontWeight: '600', color: NAVY, fontFamily: 'Inter_600SemiBold',
               marginBottom: 6, marginTop: 16 },
  formInput:  { backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, color: '#111827', fontFamily: 'Inter_400Regular',
                borderWidth: 1, borderColor: '#E5E7EB' },

  pinnedToggle:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  pinnedToggleText: { fontSize: 14, color: GRAY, fontFamily: 'Inter_400Regular' },

  emojiNote: { marginTop: 16, fontSize: 12, color: GRAY, fontFamily: 'Inter_400Regular',
               backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8 },

  postBtn:     { backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
