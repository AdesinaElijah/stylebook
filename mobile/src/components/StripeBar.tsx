import React from 'react';
import { View } from 'react-native';
import { STRIPES } from '../theme/brand';

export default function StripeBar({ height = 6 }: { height?: number }) {
  return (
    <View style={{ flexDirection: 'row', width: '100%', height }}>
      {STRIPES.map((s, i) => (
        <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />
      ))}
    </View>
  );
}