import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi, EmployeeSummaryDto } from '@/services/api';
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

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:               '#22C55E',
  PENDING_VERIFICATION: '#F59E0B',
  PENDING_APPROVAL:     '#F59E0B',
  SUSPENDED:            '#EF4444',
  REJECTED:             '#6b7280',
};

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE:            'موظف',
  DEPARTMENT_MANAGER:  'مدير قسم',
  MAIN_MANAGER:        'المدير العام',
  SYSTEM_ADMIN:        'مشرف النظام',
};

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'employees', 'all'],
    queryFn:  () => adminApi.listAllEmployees(),
  });

  const all: EmployeeSummaryDto[] = data?.data ?? [];

  const filtered = search.trim()
    ? all.filter(e =>
        `${e.firstNameAr} ${e.lastNameAr} ${e.nationalId}`.includes(search.trim()))
    : all;

  const renderItem = ({ item }: { item: EmployeeSummaryDto }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.78}
      onPress={() => router.push({
        pathname: '/(admin)/edit-employee' as any,
        params: {
          id:           item.id,
          firstNameAr:  item.firstNameAr,
          lastNameAr:   item.lastNameAr,
          phone:        item.maskedPhone ?? '',
          role:         item.role,
          status:       item.status ?? 'ACTIVE',
          vacationDays: String(item.vacationDaysPerYear ?? 21),
        },
      })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.firstNameAr?.[0] ?? '?'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.firstNameAr} {item.lastNameAr}</Text>
        <Text style={styles.meta}>{ROLE_LABEL[item.role] ?? item.role}</Text>
        {item.departmentNameAr ? (
          <Text style={styles.meta}>{item.departmentNameAr}</Text>
        ) : null}
        {item.maskedPhone ? (
          <Text style={styles.phone}>{item.maskedPhone}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status ?? ''] ?? '#6b7280') + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status ?? ''] ?? '#6b7280' }]}>
            {(item.status ?? '').replace('_', ' ')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={MUTED} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header — navyDark bg */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>All Employees</Text>
          <Text style={styles.titleAr}>جميع الموظفين</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(admin)/add-employee' as any)}
        >
          <Ionicons name="person-add-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search — BORDER search bar on cream bg */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID…"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={MUTED} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Count */}
      {!isLoading && (
        <Text style={styles.count}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN_MID} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load employees</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch}
              colors={[GREEN_MID]} tintColor={GREEN_MID} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={MUTED} />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: CREAM },

  // Header — navyDark
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingVertical: 16,
                 backgroundColor: GREEN_DARK },
  backBtn:     { padding: 4 },
  title:       { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  titleAr:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  addBtn:      { padding: 4 },

  // Search bar — white with BORDER
  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12,
                 backgroundColor: WHITE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                 borderWidth: 1.5, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: TEXT },

  count:       { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginLeft: 16, marginBottom: 4 },
  list:        { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },

  // White cards with green avatar
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
                 borderRadius: 16, padding: 14,
                 borderWidth: 1, borderColor: BORDER,
                 shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
                 shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  avatar:      { width: 44, height: 44, borderRadius: 99,
                 backgroundColor: GREEN_MID,
                 alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: TEXT },
  meta:        { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 1 },
  phone:       { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED, marginTop: 1, letterSpacing: 1 },
  badge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  badgeText:   { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  center:      { alignItems: 'center', marginTop: 60 },
  errorText:   { color: light.destructive, marginBottom: 12, fontFamily: 'Inter_400Regular' },
  retryBtn:    { backgroundColor: GREEN_MID, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:   { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  emptyText:   { color: MUTED, marginTop: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
});
