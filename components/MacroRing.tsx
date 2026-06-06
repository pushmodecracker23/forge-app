import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  grams: number;
  target: number;
  color: string;
  label: string;
  size?: number;
}

export default function MacroRing({ grams, target, color, label, size = 90 }: Props) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(grams / Math.max(target, 1), 1);
  const center = size / 2;

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - progress)],
  });

  return (
    <View style={styles.wrapper}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={center} cy={center} r={radius}
            stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} fill="none"
          />
          <AnimatedCircle
            cx={center} cy={center} r={radius}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFillObject, styles.center]}>
          <Text style={[styles.gramsText, { color }]}>{grams}g</Text>
        </View>
      </View>
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6 },
  center: { justifyContent: 'center', alignItems: 'center' },
  gramsText: { fontSize: 14, fontWeight: '700' },
  labelText: { fontSize: 11, color: '#6B7280' },
});
