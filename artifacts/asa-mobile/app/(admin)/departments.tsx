/**
 * Admin — Department Management
 * Create, view, update and deactivate departments.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentApi, DepartmentDto, ApiError } from '@/services/api';

const NAVY   = '#1A2332';
const GOLD   = '#C9A84C';
const GRAY   = '#6B7280';
const BG     = '#F8F9FA';
const CARD   = '#FFFFFF';
const GREEN  = '#10B981';
const RED    = '#EF4444';
const BORDER = '#E5E7EB';

type FormMode = 'create' | 'edit';

interface DeptForm {
  nameEn: string;
  nameAr: string;
  code:   string;
}

const emptyForm = (): DeptForm => ({ nameEn: '', nameAr: '', code: '' });

export default function DepartmentsScreen() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ visible: boolean; mode: FormMode; dept?: DepartmentDto }>({
    visible: false, mode: 'create',
  });
  const [form, setForm]     = useState<DeptForm>(emptyForm());
  const [formErr, setFormErr] = useState('');

  const { data: departments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const r = await departmentApi.listAll();
      return r.data ?? [];
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => departmentApi.create(form.nameEn.trim(), form.nameAr.trim(), form.code.trim()),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      closeModal();
    },
    onError: (err) => setFormErr(err instanceof ApiError ? err.message : 'Failed to create department'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      departmentApi.update(id, { nameEn: form.nameEn.trim(), nameAr: form.nameAr.trim() }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
      closeModal();
    },
    onError: (err) => setFormErr(err instanceof ApiError ? err.message : 'Failed to update department'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => departmentApi.deactivate(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] });
    },
    onError: (err) => Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to deactivate'),
  });

  const openCreate = () => {
    setForm(emptyForm());
    setFormErr('');
    setModal({ visible: true, mode: 'create' });
  };

  const openEdit = (dept: DepartmentDto) => {
    setForm({ nameEn: dept.nameEn, nameAr: dept.nameAr, code: dept.code });
    setFormErr('');
    setModal({ visible: true, mode: 'edit', dept });
  };

  const closeModal = () => {
    setModal(m => ({ ...m, visible: false }));
    setForm(emptyForm());
    setFormErr('');
  };

  const handleSubmit = () => {
    setFormErr('');
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      setFormErr('Both department names are required');
      return;
    }
    if (modal.mode === 'create' && !form.code.trim()) {
      setFormErr('Department code is required');
      return;
    }
    if (modal.mode === 'create') {
      createMutation.mutate();
    } else if (modal.dept) {
      updateMutation.mutate({ id: modal.dept.id });
    }
  };

  const confirmDeactivate = (dept: DepartmentDto) => {
    Alert.alert(
      'Deactivate Department',
      `Deactivate "${dept.nameAr}"? Employees assigned to it will not be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMutation.mutate(dept.id) },
      ]
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Departments</Text>
          <Text style={styles.titleAr}>الأقسام</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
      >
        {isLoading && <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />}

        {!isLoading && departments.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No Departments Yet</Text>
            <Text style={styles.emptyBody}>Tap "+ New" to create the first department.</Text>
          </View>
        )}

        {departments.map(dept => (
          <View key={dept.id} style={[styles.card, !dept.isActive && styles.cardInactive]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nameAr}>{dept.nameAr}</Text>
                <Text style={styles.nameEn}>{dept.nameEn}</Text>
                <Text style={styles.code}>Code: {dept.code}</Text>
              </View>
              <View style={[styles.activeBadge, { backgroundColor: dept.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
                <Text style={[styles.activeBadgeText, { color: dept.isActive ? '#065F46' : GRAY }]}>
                  {dept.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>👥 {dept.employeeCount} employees</Text>
              {dept.managerName && <Text style={styles.metaText}>👤 {dept.managerName}</Text>}
            </View>

            {dept.isActive && (
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(dept)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deactivateBtn} onPress={() => confirmDeactivate(dept)}>
                  <Text style={styles.deactivateBtnText}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {modal.mode === 'create' ? 'New Department' : 'Edit Department'}
            </Text>

            {!!formErr && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{formErr}</Text></View>
            )}

            <Text style={styles.label}>Arabic Name *</Text>
            <TextInput
              style={styles.input}
              value={form.nameAr}
              onChangeText={v => setForm(f => ({ ...f, nameAr: v }))}
              placeholder="مثال: قسم تقنية المعلومات"
              textAlign="right"
            />

            <Text style={styles.label}>English Name *</Text>
            <TextInput
              style={styles.input}
              value={form.nameEn}
              onChangeText={v => setForm(f => ({ ...f, nameEn: v }))}
              placeholder="e.g. Information Technology"
            />

            {modal.mode === 'create' && (
              <>
                <Text style={styles.label}>Code *</Text>
                <TextInput
                  style={styles.input}
                  value={form.code}
                  onChangeText={v => setForm(f => ({ ...f, code: v.toUpperCase() }))}
                  placeholder="e.g. IT"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.5 }]} onPress={handleSubmit} disabled={isSaving}>
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 16, paddingBottom: 12, backgroundColor: CARD,
                    borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:        { padding: 4 },
  backText:       { color: GOLD, fontSize: 15, fontFamily: 'Inter_500Medium' },
  title:          { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY },
  titleAr:        { fontSize: 13, color: GRAY },
  addBtn:         { backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:     { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  scroll:         { padding: 16, paddingBottom: 60 },

  card:           { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 12,
                    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardInactive:   { opacity: 0.6 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  nameAr:         { fontSize: 17, fontFamily: 'Inter_700Bold', color: NAVY, textAlign: 'right' },
  nameEn:         { fontSize: 14, color: GRAY, marginTop: 2 },
  code:           { fontSize: 12, color: GRAY, marginTop: 4 },
  activeBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  activeBadgeText:{ fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardMeta:       { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaText:       { fontSize: 13, color: GRAY },
  cardActions:    { flexDirection: 'row', gap: 10 },
  editBtn:        { flex: 1, borderWidth: 1, borderColor: NAVY, borderRadius: 8,
                    padding: 10, alignItems: 'center' },
  editBtnText:    { color: NAVY, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  deactivateBtn:  { flex: 1, borderWidth: 1, borderColor: RED, borderRadius: 8,
                    padding: 10, alignItems: 'center' },
  deactivateBtnText: { color: RED, fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 56, marginBottom: 16 },
  emptyTitle:     { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: GRAY, marginBottom: 8 },
  emptyBody:      { fontSize: 14, color: GRAY, textAlign: 'center' },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:     { fontSize: 20, fontFamily: 'Inter_700Bold', color: NAVY, marginBottom: 16 },
  label:          { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: NAVY, marginBottom: 6 },
  input:          { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12,
                    fontSize: 15, color: NAVY, backgroundColor: BG, marginBottom: 14 },
  errorBox:       { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText:      { color: RED, fontSize: 13 },
  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn:      { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
                    padding: 14, alignItems: 'center' },
  cancelBtnText:  { color: GRAY, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  saveBtn:        { flex: 1, backgroundColor: NAVY, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText:    { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
