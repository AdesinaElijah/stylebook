import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BRAND } from '../theme/brand';

type StripeBarProps = {
  height?: number;
  style?: ViewStyle;
};

const StripeBar: React.FC<StripeBarProps> = ({ height = 6, style }) => {
  return (
    <View style={[styles.container, { height }, style]}>
      <View style={[styles.stripe, { backgroundColor: BRAND.gold ?? '#C9A227' }]} />
      <View style={[styles.stripe, { backgroundColor: BRAND.brown ?? '#6B4226' }]} />
      <View style={[styles.stripe, { backgroundColor: BRAND.cream ?? '#F5EDE0' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
  },
});

export default StripeBar;