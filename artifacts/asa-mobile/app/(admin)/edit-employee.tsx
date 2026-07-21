import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, ApiError } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;
const GREEN_DARK = government.navyDark;  // "#0A4D2E"
const GREEN_MID  = government.navy;      // "#0D6B3F"
const GOLD       = government.gold;      // "#C9963F"
const CREAM      = light.background;    // "#F9FAF7"
const WHITE      = light.card;          // "#FFFFFF"
const TEXT       = light.text;          // "#1A1F1C"
const MUTED      = light.mutedForeground; // "#6B7A72"
const BORDER     = light.border;        // "#E4EBE7"

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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header — navyDark bg */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Edit Employee</Text>
          <Text style={styles.titleAr}>تعديل بيانات الموظف</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status banner */}
        {isSuspended && (
          <View style={styles.suspendedBanner}>
            <Ionicons name="ban-outline" size={16} color="#991B1B" />
            <Text style={styles.suspendedText}>  This account is currently suspended</Text>
          </View>
        )}

        {/* Name + Phone + Vacation card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Name — الاسم</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>First Name</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName}
                placeholder="الاسم الأول" placeholderTextColor={MUTED} textAlign="right" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName}
                placeholder="اسم العائلة" placeholderTextColor={MUTED} textAlign="right" />
            </View>
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone}
            placeholder="05xxxxxxxx" placeholderTextColor={MUTED} keyboardType="phone-pad" />

          <Text style={styles.label}>Vacation Days / Year — أيام الإجازة السنوية</Text>
          <TextInput style={styles.input} value={vacationDays} onChangeText={setVacationDays}
            keyboardType="number-pad" placeholder="21" placeholderTextColor={MUTED} maxLength={3} />
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
              {role === r.value && <Ionicons name="checkmark-circle" size={18} color={GREEN_MID} />}
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
                  color={s.value === 'SUSPENDED' ? light.destructive : GREEN_MID}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button — green */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: CREAM },

  // Header — navyDark
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingBottom: 16,
                        backgroundColor: GREEN_DARK },
  backBtn:            { padding: 4 },
  title:              { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  titleAr:            { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  content:            { paddingHorizontal: 16, paddingTop: 16 },

  suspendedBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
                        borderRadius: 12, padding: 12, marginBottom: 16,
                        borderWidth: 1, borderColor: '#FECACA' },
  suspendedText:      { color: '#991B1B', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // White cards
  card:               { backgroundColor: WHITE, borderRadius: 18, padding: 18,
                        borderWidth: 1, borderColor: BORDER, marginBottom: 16,
                        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  sectionLabel:       { fontSize: 13, fontFamily: 'Inter_700Bold', color: GREEN_MID,
                        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:                { flexDirection: 'row' },
  label:              { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginBottom: 4, marginTop: 8 },

  // Labeled inputs
  input:              { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
                        paddingHorizontal: 14, height: 54, fontSize: 15,
                        fontFamily: 'Inter_400Regular', color: TEXT,
                        backgroundColor: WHITE },

  optionRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 12, paddingHorizontal: 4,
                        borderBottomWidth: 1, borderBottomColor: BORDER },
  optionRowSelected:  { backgroundColor: GREEN_MID + '10', borderRadius: 10, paddingHorizontal: 8 },
  optionRowDanger:    { backgroundColor: '#FEE2E2' },
  optionText:         { fontSize: 14, fontFamily: 'Inter_400Regular', color: TEXT },
  optionTextSelected: { fontFamily: 'Inter_700Bold', color: GREEN_MID },

  // Green save button
  saveBtn:            { backgroundColor: GREEN_MID, borderRadius: 14, paddingVertical: 16,
                        alignItems: 'center', marginTop: 8 },
  saveBtnDisabled:    { opacity: 0.6 },
  saveBtnText:        { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
