import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';

interface Props {
  eaten: number;
  target: number;
  burned: number;
  size?: number;
}

export default function CalorieRing({ eaten, target, burned, size = 180 }: Props) {
  const theme = useTheme();
  const cx = size / 2;
  const outerR = size / 2 - 12;
  const innerR = size / 2 - 28;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;

  const eatRatio = Math.min(eaten / Math.max(target, 1), 1);
  const burnRatio = Math.min(burned / Math.max(target * 0.3, 1), 1);

  const remaining = Math.max(target - eaten + burned, 0);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={outerR} stroke={theme.border} strokeWidth={14} fill="none" />
        <Circle
          cx={cx}
          cy={cx}
          r={outerR}
          stroke={theme.accent}
          strokeWidth={14}
          fill="none"
          strokeDasharray={`${outerCirc * eatRatio} ${outerCirc}`}
          strokeDashoffset={outerCirc * 0.25}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cx} r={innerR} stroke={theme.border} strokeWidth={10} fill="none" />
        <Circle
          cx={cx}
          cy={cx}
          r={innerR}
          stroke="#FF9800"
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${innerCirc * burnRatio} ${innerCirc}`}
          strokeDashoffset={innerCirc * 0.25}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.remaining, { color: theme.text }]}>{remaining}</Text>
        <Text style={[styles.label, { color: theme.muted }]}>kcal left</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  remaining: { fontSize: 32, fontWeight: '700' },
  label: { fontSize: 13, marginTop: 2 },
});
