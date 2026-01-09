export const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  card2: "#111827",
  text: "#FFFFFF",
  muted: "#94A3B8",
  muted2: "#CBD5F5",
  primary: '#7C3AED',        // Violet (QR active, CTA)
  danger: "#DC2626",
  userBubble: "#22C55E",
  botBubble: "#1F2937",
  purple: "#7c3aed",
  primarySoft: 'rgba(124,58,237,0.18)',
  primaryBorder: 'rgba(124,58,237,0.30)',

  /* Backgrounds */
  appBackground: '#0A0A0A',
  screenBackground: '#0F0F10',
  cardBackground: '#111111',
  surface: '#18181B',

  /* Borders */
  border: '#232323',
  divider: '#27272A',

  /* Text */
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#111827',

  /* Status */
  success: '#22C55E',
  warning: '#FB923C',
  error: '#EF4444',
  info: '#38BDF8',

  /* Neutral */
  white: '#FFFFFF',
  black: '#000000',

  /* QR / Scanner */
  scanFrame: 'rgba(255,255,255,0.75)',
  scanOverlay: 'rgba(255,255,255,0.04)',

  /* Buttons */
  buttonPrimary: '#7C3AED',
  buttonPrimaryHover: '#6D28D9',
  buttonDisabled: 'rgba(124,58,237,0.45)',

  /* Bottom Nav */
  navBackground: 'rgba(228,228,231,0.95)',
  navInactiveText: '#111111',
} as const;

export type ColorKeys = keyof typeof COLORS;