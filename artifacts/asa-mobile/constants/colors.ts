/**
 * ASA Workforce — Design Tokens
 *
 * Government-grade color palette:
 * - Primary: Navy blue — authority, trust, official
 * - Accent: Gold — official seals, importance, hierarchy
 * - Surfaces: Clean whites and light grays — clarity, professionalism
 *
 * These tokens are consumed via useColors() in hooks/useColors.ts.
 * The structure mirrors the monorepo web artifact conventions.
 */

const colors = {
  light: {
    // Legacy aliases (required by useColors hook)
    text: '#1A2332',
    tint: '#1B3A6B',

    // Core surfaces
    background: '#F5F7FA',
    foreground: '#1A2332',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1A2332',

    // Primary action — Navy blue
    primary: '#1B3A6B',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#EEF2F7',
    secondaryForeground: '#1A2332',

    // Muted / subdued
    muted: '#EEF2F7',
    mutedForeground: '#5B6B7E',

    // Accent — Gold
    accent: '#C8A84B',
    accentForeground: '#1B3A6B',

    // Destructive / error
    destructive: '#CC2936',
    destructiveForeground: '#FFFFFF',

    // Borders and inputs
    border: '#D0D9E4',
    input: '#D0D9E4',

    // Success / warning — attendance classifications
    success: '#1A7A3E',
    successForeground: '#FFFFFF',
    warning: '#B5760D',
    warningForeground: '#FFFFFF',
  },

  // Extra government-specific tokens (used directly, not via useColors)
  government: {
    navyDark: '#0F2547',
    navy: '#1B3A6B',
    navyLight: '#2D5A9E',
    navyMuted: '#A8C4E0',
    gold: '#C8A84B',
    goldDark: '#9A7A2E',
    surfaceOverlay: 'rgba(255, 255, 255, 0.08)',
    textOnNavy: '#FFFFFF',
    subtextOnNavy: '#A8C4E0',
  },

  // Border radius — slightly more authoritative/square than consumer apps
  radius: 10,
};

export default colors;
