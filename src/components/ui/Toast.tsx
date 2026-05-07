import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  /** Duration in ms before auto-dismiss. Default: 2500 */
  duration?: number;
}

interface ToastState {
  message: string;
  type: ToastType;
  duration: number;
  /** Unique ID to retrigger the effect when the same message is shown twice */
  id: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((config: ToastConfig) => {
    setToast({
      message: config.message,
      type: config.type ?? 'success',
      duration: config.duration ?? 2500,
      id: Date.now(),
    });
  }, []);

  const hide = useCallback(() => setToast(null), []);

  return { toast, show, hide };
}

export const ToastContext = createContext<ReturnType<typeof useToast> | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastParams = useToast();
  return (
    <ToastContext.Provider value={toastParams}>
      {children}
      <Toast toast={toastParams.toast} onHide={toastParams.hide} />
    </ToastContext.Provider>
  );
}

export function useGlobalToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useGlobalToast must be used within ToastProvider');
  return ctx;
}

// ── Internal config ───────────────────────────────────────────────────────────

const ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
};

const COLOR: Record<ToastType, string> = {
  success: COLORS.accent.success,
  error: COLORS.accent.danger,
  info: COLORS.accent.primary,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface ToastProps {
  toast: ToastState | null;
  onHide: () => void;
  /**
   * Extra bottom offset. Useful when the toast lives inside a Modal
   * that already handles safe areas differently.
   */
  bottomOffset?: number;
}

export default function Toast({ toast, onHide, bottomOffset }: ToastProps) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;

    // Always start from hidden position
    translateY.setValue(80);
    opacity.setValue(0);

    // Slide up + fade in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast?.id]); // Re-run only when a new toast is triggered

  if (!toast) return null;

  const color = COLOR[toast.type];
  const icon = ICON[toast.type];
  const bottomPos = (bottomOffset ?? Math.max(insets.bottom, 8)) + SPACING.lg;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomPos, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bg.elevated,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    // Shadow (Android)
    elevation: 12,
    zIndex: 9999,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: FONT.sizes.md,
    color: COLORS.text.primary,
    fontWeight: FONT.weights.medium,
    lineHeight: 20,
  },
});
