import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"        options={{ headerShown: false }} />
      <Stack.Screen name="vacations"    options={{ headerShown: false }} />
      <Stack.Screen name="employees"    options={{ headerShown: false }} />
      <Stack.Screen name="add-employee" options={{ headerShown: false }} />
    </Stack>
  );
}
