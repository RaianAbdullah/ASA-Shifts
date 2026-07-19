/**
 * The (tabs) group is reserved for the authenticated main app (Stage 10+).
 * During Stage 1, redirect all traffic back to the welcome screen.
 */
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // TODO: Stage 10 — Replace with auth check; redirect to (auth)/login if not authenticated
  return <Redirect href="/" />;
}
