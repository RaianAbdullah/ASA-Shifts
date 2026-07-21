import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi, EmployeeSummaryDto } from '@/services/api';
import colors from '@/constants/colors';

const { light, government } = colors;

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:               '#22c55e',
  PENDING_VERIFICATION: '#f59e0b',
  PENDING_APPROVAL:     '#f59e0b',
  SUSPENDED:            '#ef4444',
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
        <Ionicons name="chevron-forward" size={14} color={light.mutedForeground} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>All Employees</Text>
          <Text style={styles.titleAr}>جميع الموظفين</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(admin)/add-employee' as any)}
        >
          <Ionicons name="person-add-outline" size={22} color={government.navy} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={light.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID…"
          placeholderTextColor={light.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={light.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Count */}
      {!isLoading && (
        <Text style={styles.count}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={government.navy} />
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
              colors={[government.navy]} tintColor={government.navy} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={light.mutedForeground} />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: light.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingVertical: 12,
                 borderBottomWidth: 1, borderBottomColor: light.border },
  backBtn:     { padding: 4 },
  title:       { fontSize: 17, fontWeight: '700', color: light.text },
  titleAr:     { fontSize: 12, color: light.mutedForeground, textAlign: 'center' },
  addBtn:      { padding: 4 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12,
                 backgroundColor: light.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                 borderWidth: 1, borderColor: light.border },
  searchInput: { flex: 1, fontSize: 14, color: light.foreground },
  count:       { fontSize: 12, color: light.mutedForeground, marginLeft: 16, marginBottom: 4 },
  list:        { paddingHorizontal: 12, paddingBottom: 24 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: light.card,
                 borderRadius: 12, padding: 12, marginBottom: 8,
                 borderWidth: 1, borderColor: light.border },
  avatar:      { width: 42, height: 42, borderRadius: 21,
                 backgroundColor: government.navy + '22',
                 alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: government.navy },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontWeight: '600', color: light.text },
  meta:        { fontSize: 12, color: light.mutedForeground, marginTop: 1 },
  phone:       { fontSize: 12, color: light.mutedForeground, marginTop: 1, letterSpacing: 1 },
  badge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  badgeText:   { fontSize: 10, fontWeight: '600' },
  center:      { alignItems: 'center', marginTop: 60 },
  errorText:   { color: light.destructive, marginBottom: 12 },
  retryBtn:    { backgroundColor: government.navy, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText:   { color: '#fff', fontWeight: '600' },
  emptyText:   { color: light.mutedForeground, marginTop: 12, fontSize: 15 },
});
