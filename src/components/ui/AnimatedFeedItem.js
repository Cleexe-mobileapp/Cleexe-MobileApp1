import React from 'react';
import { View } from 'react-native';

/**
 * Plain wrapper — Reanimated entering/layout/exiting on list items caused native
 * crashes (SIGSEGV in uiManagerDidDispatchCommand) under Fabric / Expo Go.
 */
export default function AnimatedFeedItem({ children, index, style }) {
  return <View style={style}>{children}</View>;
}
