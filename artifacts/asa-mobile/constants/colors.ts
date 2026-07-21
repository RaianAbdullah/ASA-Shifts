/**
 * ASA Workforce — Design Tokens (Dark Theme)
 *
 * Deep navy/slate dark palette — professional, easy on the eyes,
 * government-grade authority without the brightness fatigue.
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#E4E8F2',
    tint: '#4A7FD4',

    // Core surfaces
    background: '#0D0F18',
    foreground: '#E4E8F2',

    // Cards / elevated surfaces
    card: '#161923',
    cardForeground: '#E4E8F2',

    // Primary action — brighter navy for dark bg
    primary: '#4A7FD4',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#1C2035',
    secondaryForeground: '#E4E8F2',

    // Muted / subdued
    muted: '#1C2035',
    mutedForeground: '#8892A4',

    // Accent — Gold
    accent: '#D4A832',
    accentForeground: '#0D0F18',

    // Destructive / error
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    // Borders and inputs
    border: '#252838',
    input: '#252838',

    // Success / warning
    success: '#22C55E',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
  },

  government: {
    navyDark: '#1A2E6B',
    navy: '#4A7FD4',
    navyLight: '#6A9FE4',
    navyMuted: '#2A4070',
    gold: '#D4A832',
    goldDark: '#A8831E',
    surfaceOverlay: 'rgba(255, 255, 255, 0.06)',
    textOnNavy: '#FFFFFF',
    subtextOnNavy: '#A8C4E0',
  },

  radius: 10,
};

export default colors;
