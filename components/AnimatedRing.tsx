import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  eaten: number;
  target: number;
  burned: number;
  size?: number;
}

export default function AnimatedRing({ eaten, target, burned, size = 200 }: Props) {
  const theme = useTheme();
  const eatAnim = useRef(new Animated.Value(0)).current;
  const burnAnim = useRef(new Animated.Value(0)).current;

  const cx = size / 2;
  const outerR = size / 2 - 14;
  const innerR = size / 2 - 30;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;

  const eatRatio = Math.min(eaten / Math.max(target, 1), 1);
  const burnRatio = Math.min(burned / Math.max(target * 0.4, 1), 1);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(eatAnim, { toValue: eatRatio, duration: 900, useNativeDriver: false }),
      Animated.timing(burnAnim, { toValue: burnRatio, duration: 700, useNativeDriver: false }),
    ]).start();
  }, [eatRatio, burnRatio]);

  const eatDash = eatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, outerCirc] });
  const burnDash = burnAnim.interpolate({ inputRange: [0, 1], outputRange: [0, innerCirc] });

  const remaining = Math.max(target - eaten + burned, 0);
  const isOver = eaten - burned > target;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Outer track */}
        <Circle cx={cx} cy={cx} r={outerR} stroke={theme.border} strokeWidth={16} fill="none" />
        <AnimatedCircle
          cx={cx} cy={cx} r={outerR}
          stroke={isOver ? theme.error : theme.accent}
          strokeWidth={16} fill="none" strokeLinecap="round"
          strokeDasharray={`${outerCirc}`}
          strokeDashoffset={eatDash.interpolate({ inputRange: [0, outerCirc], outputRange: [outerCirc, 0] })}
        />
        {/* Inner track */}
        <Circle cx={cx} cy={cx} r={innerR} stroke={theme.border} strokeWidth={11} fill="none" />
        <AnimatedCircle
          cx={cx} cy={cx} r={innerR}
          stroke="#FF9800"
          strokeWidth={11} fill="none" strokeLinecap="round"
          strokeDasharray={`${innerCirc}`}
          strokeDashoffset={burnDash.interpolate({ inputRange: [0, innerCirc], outputRange: [innerCirc, 0] })}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.remaining, { color: isOver ? theme.error : theme.text }]}>{remaining}</Text>
        <Text style={[styles.label, { color: theme.muted }]}>kcal remaining</Text>
        {isOver && <Text style={[styles.overLabel, { color: theme.error }]}>Over target!</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  remaining: { fontSize: 34, fontWeight: '900' },
  label: { fontSize: 13, marginTop: 4 },
  overLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});
