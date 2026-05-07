import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface Props {
  value: boolean;
  /** Active track color (matches the accent color of the parent toggle row) */
  color: string;
}

/**
 * Drop-in replacement for the static switch View used in add.tsx.
 * Animates both the thumb position and the track background color.
 */
export default function AnimatedSwitch({ value, color }: Props) {
  const thumbPos = useRef(new Animated.Value(value ? 18 : 2)).current;
  const bgAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(thumbPos, {
        toValue: value ? 18 : 2,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        overshootClamping: true,
      }),
      Animated.timing(bgAnim, {
        toValue: value ? 1 : 0,
        duration: 180,
        useNativeDriver: false, // backgroundColor cannot use native driver
      }),
    ]).start();
  }, [value]);

  const trackColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.bg.elevated, color],
  });

  return (
    <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX: thumbPos }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    // Subtle shadow so the thumb lifts off the track
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
});
