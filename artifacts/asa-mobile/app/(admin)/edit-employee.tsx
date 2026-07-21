import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, ApiError } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

const ROLES = [
  { value: 'EMPLOYEE',           label: 'موظف — Employee' },
  { value: 'DEPARTMENT_MANAGER', label: 'مدير قسم — Dept. Manager' },
  { value: 'MAIN_MANAGER',       label: 'المدير العام — Main Manager' },
  { value: 'SYSTEM_ADMIN',       label: 'مشرف النظام — System Admin' },
];

const STATUSES = [
  { value: 'ACTIVE',    label: 'Active — نشط' },
  { value: 'SUSPENDED', label: 'Suspended — موقوف' },
];

export default function EditEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    id: string; firstNameAr: string; lastNameAr: string;
    phone: string; role: string; status: string; vacationDays: string;
  }>();

  const [firstName,     setFirstName]     = useState(params.firstNameAr ?? '');
  const [lastName,      setLastName]      = useState(params.lastNameAr ?? '');
  const [phone,         setPhone]         = useState(params.phone ?? '');
  const [role,          setRole]          = useState(params.role ?? 'EMPLOYEE');
  const [status,        setStatus]        = useState(params.status ?? 'ACTIVE');
  const [vacationDays,  setVacationDays]  = useState(params.vacationDays ?? '21');

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateEmployee(params.id, {
        firstNameAr:        firstName.trim() || undefined,
        lastNameAr:         lastName.trim() || undefined,
        phoneNumber:        phone.trim() || undefined,
        role,
        status,
        vacationDaysPerYear: parseInt(vacationDays, 10) || 21,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'employees'] });
      Alert.alert('Saved', 'Employee updated successfully.');
      router.back();
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Update failed. Please try again.');
    },
  });

  const isSuspended = status === 'SUSPENDED';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Edit Employee</Text>
          <Text style={styles.titleAr}>تعديل بيانات الموظف</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Status banner */}
      {isSuspended && (
        <View style={styles.suspendedBanner}>
          <Ionicons name="ban-outline" size={16} color="#991B1B" />
          <Text style={styles.suspendedText}>  This account is currently suspended</Text>
        </View>
      )}

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Name — الاسم</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName}
              placeholder="الاسم الأول" textAlign="right" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName}
              placeholder="اسم العائلة" textAlign="right" />
          </View>
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
          placeholder="05xxxxxxxx" keyboardType="phone-pad" />

        <Text style={styles.label}>Vacation Days / Year — أيام الإجازة السنوية</Text>
        <TextInput style={styles.input} value={vacationDays} onChangeText={setVacationDays}
          keyboardType="number-pad" placeholder="21" maxLength={3} />
      </View>

      {/* Role picker */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Role — الصلاحية</Text>
        {ROLES.map(r => (
          <TouchableOpacity
            key={r.value}
            style={[styles.optionRow, role === r.value && styles.optionRowSelected]}
            onPress={() => setRole(r.value)}
          >
            <Text style={[styles.optionText, role === r.value && styles.optionTextSelected]}>
              {r.label}
            </Text>
            {role === r.value && <Ionicons name="checkmark-circle" size={18} color={government.navy} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Status picker */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Account Status — حالة الحساب</Text>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.optionRow, status === s.value && styles.optionRowSelected,
              s.value === 'SUSPENDED' && status === s.value && styles.optionRowDanger]}
            onPress={() => setStatus(s.value)}
          >
            <Text style={[styles.optionText, status === s.value && styles.optionTextSelected]}>
              {s.label}
            </Text>
            {status === s.value && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={s.value === 'SUSPENDED' ? '#DC2626' : government.navy}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, mutation.isPending && styles.saveBtnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Changes — حفظ التغييرات</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: light.background },
  content:            { paddingHorizontal: 16 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn:            { padding: 4 },
  title:              { fontSize: 18, fontWeight: '700', color: light.text, textAlign: 'center' },
  titleAr:            { fontSize: 12, color: light.mutedForeground, textAlign: 'center' },
  suspendedBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
                        borderRadius: 10, padding: 12, marginBottom: 16 },
  suspendedText:      { color: '#991B1B', fontSize: 13, fontWeight: '600' },
  card:               { backgroundColor: light.card, borderRadius: 14, padding: 16,
                        borderWidth: 1, borderColor: light.border, marginBottom: 16 },
  sectionLabel:       { fontSize: 13, fontWeight: '700', color: government.navy,
                        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:                { flexDirection: 'row' },
  label:              { fontSize: 12, color: light.mutedForeground, marginBottom: 4, marginTop: 8 },
  input:              { borderWidth: 1, borderColor: light.border, borderRadius: 10,
                        padding: 12, fontSize: 15, color: light.foreground,
                        backgroundColor: light.background },
  optionRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 12, paddingHorizontal: 4,
                        borderBottomWidth: 1, borderBottomColor: light.border },
  optionRowSelected:  { backgroundColor: government.navy + '10', borderRadius: 8, paddingHorizontal: 8 },
  optionRowDanger:    { backgroundColor: '#FEE2E2' },
  optionText:         { fontSize: 14, color: light.foreground },
  optionTextSelected: { fontWeight: '700', color: government.navy },
  saveBtn:            { backgroundColor: government.navy, borderRadius: 14, padding: 16,
                        alignItems: 'center', marginTop: 8 },
  saveBtnDisabled:    { opacity: 0.6 },
  saveBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
});
