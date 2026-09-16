import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { authColors, authRadius } from '../../theme/authTheme';

const VISIBLE_MS = 1800;
const POP_MS = 200;

/**
 * Centered pill toast, pinned near the bottom of the screen. Pass the
 * current message (or null/empty to hide); pass onHide so the caller can
 * clear its own state once the auto-dismiss finishes.
 */
export default function AuthToast({ message, onHide }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;

    Animated.timing(progress, {
      toValue: 1,
      duration: POP_MS,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: POP_MS,
        useNativeDriver: true,
      }).start(() => onHide?.());
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: progress,
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        },
      ]}
    >
      <Text style={styles.label}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: authColors.toastBg,
    borderRadius: authRadius.toast,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  label: {
    color: authColors.white,
    fontWeight: '600',
    fontSize: 12,
  },
});
