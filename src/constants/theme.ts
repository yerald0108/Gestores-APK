export const COLORS = {
  // Backgrounds
  bg: {
    primary: '#0A0E1A',
    secondary: '#111827',
    card: '#161D2E',
    elevated: '#1E2A3D',
    input: '#1A2235',
  },
  // Accents
  accent: {
    primary: '#3B82F6',    // Azul vibrante
    secondary: '#06B6D4',  // Cyan
    success: '#10B981',    // Verde
    warning: '#F59E0B',    // Ámbar
    danger: '#EF4444',     // Rojo
  },
  // Text
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#475569',
    inverse: '#0A0E1A',
  },
  // Borders
  border: {
    default: '#1E2A3D',
    focus: '#3B82F6',
    subtle: '#0F172A',
  },
} as const;

export const TRANSPORT_CONFIG = {
  omnibus: {
    key: 'omnibus' as const,
    label: 'Ómnibus',
    icon: 'bus',
    color: '#10B981',
    gradient: ['#065F46', '#10B981'] as [string, string],
    description: 'Transporte terrestre',
  },
  tren: {
    key: 'tren' as const,
    label: 'Tren',
    icon: 'train',
    color: '#F59E0B',
    gradient: ['#78350F', '#F59E0B'] as [string, string],
    description: 'Ferrocarril',
  },
  catamaran: {
    key: 'catamaran' as const,
    label: 'Catamarán',
    icon: 'boat',
    color: '#06B6D4',
    gradient: ['#164E63', '#06B6D4'] as [string, string],
    description: 'Transporte marítimo',
  },
  avion: {
    key: 'avion' as const,
    label: 'Avión',
    icon: 'airplane',
    color: '#3B82F6',
    gradient: ['#1E3A8A', '#3B82F6'] as [string, string],
    description: 'Transporte aéreo',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;