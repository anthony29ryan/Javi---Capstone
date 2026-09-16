import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Matches the design handoff's screen-entry animation: fade in while sliding
// up 10px, 280ms. Wraps a screen's content so every auth screen enters the
// same way without repeating the Animated boilerplate five times.
export default function AuthAnimatedScreen({ children, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
