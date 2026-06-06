import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  grams: number;
  target: number;
  color: string;
  label: string;
  size?: number;
}

export default function MacroRing({
  grams,
  target,
  color,
  label,
  size = 90,
}: Props) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(grams / Math.max(target, 1), 1);
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={styles.wrapper}>
      <View style={{ width: size, height: size }}>
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Foreground arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>

        {/* Center label */}
        <View style={[StyleSheet.absoluteFillObject, styles.centerLabel]}>
          <Text style={[styles.gramsText, { color }]}>
            {grams}g
          </Text>
        </View>
      </View>

      {/* Bottom label */}
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
  },
  centerLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gramsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
