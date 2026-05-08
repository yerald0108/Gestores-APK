import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/theme';

interface Props {
  value: boolean;
  onToggle?: (val: boolean) => void;
  color: string;
  size?: 'standard' | 'sm';
}

/**
 * Drop-in replacement for the static switch View used in add.tsx.
 * Animates both the thumb position and the track background color.
 */
export default function AnimatedSwitch({ value, onToggle, color, size = 'standard' }: Props) {
  const isSm = size === 'sm';
  const trackW = isSm ? 32 : 42;
  const thumbSize = isSm ? 16 : 20;
  const activePos = trackW - thumbSize - 2;
  
  const thumbPos = useRef(new Animated.Value(value ? activePos : 2)).current;
  const bgAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(thumbPos, {
        toValue: value ? activePos : 2,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        overshootClamping: true,
      }),
      Animated.timing(bgAnim, {
        toValue: value ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, activePos]);

  const handlePress = () => {
    if (onToggle) onToggle(!value);
  };

  const trackColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.bg.elevated, color],
  });

  const Content = (
    <Animated.View style={[styles.track, { backgroundColor: trackColor, width: trackW, height: isSm ? 20 : 24, borderRadius: isSm ? 10 : 12 }]}>
      <Animated.View
        style={[styles.thumb, { transform: [{ translateX: thumbPos }], width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2 }]}
      />
    </Animated.View>
  );

  if (onToggle) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
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
