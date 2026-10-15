import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, useWindowDimensions } from 'react-native';

// From the design's mascot handoff. Every mascot image lives here; screens
// never require() mascot files directly. To swap in new art: save the PNG at
// the path in the TODO and change that one line.
const IMAGES = {
  happy: require('../../assets/mascot/happy.png'),
  sad: require('../../assets/mascot/sad.png'),
  neutral: require('../../assets/mascot/neutral.png'),
};

const VARIANTS = {
  greeting: { image: IMAGES.happy, label: 'Javi the capybara smiling' }, // TODO: replace with greeting mascot → assets/mascot/greeting.png
  thinking: { image: IMAGES.neutral, label: 'Javi, the Java tutor' }, // TODO: replace with thinking mascot → assets/mascot/thinking.png
  celebrate: { image: IMAGES.happy, label: 'Javi the capybara celebrating' },
  proud: { image: IMAGES.happy, label: 'Javi the capybara cheering' }, // TODO: replace with proud mascot → assets/mascot/proud.png
  encourage: { image: IMAGES.sad, label: 'Javi the capybara, sympathetic' }, // TODO: replace with encourage mascot → assets/mascot/encourage.png
  confused: { image: IMAGES.neutral, label: 'Javi the capybara, puzzled' }, // TODO: replace with confused mascot → assets/mascot/confused.png
  sleepy: { image: IMAGES.sad, label: 'Javi the capybara, drowsy' }, // TODO: replace with sleepy mascot → assets/mascot/sleepy.png
  curious: { image: IMAGES.neutral, label: 'Javi the capybara, curious' }, // TODO: replace with curious mascot → assets/mascot/curious.png
  focused: { image: IMAGES.neutral, label: 'Javi the capybara, focused' }, // TODO: replace with focused mascot → assets/mascot/focused.png
};

const SIZES = { small: 44, medium: 110, large: 180 };

// Below this window height, large shrinks to medium and medium to small.
// Pass hideOnSmall to drop a purely decorative mascot instead of shrinking it.
const SMALL_SCREEN_HEIGHT = 680;

export default function Mascot({
  variant = 'thinking',
  size = 'medium',
  px,
  decorative = false,
  hideOnSmall = false,
  animate = true,
  style,
}) {
  const { height } = useWindowDimensions();
  const small = height < SMALL_SCREEN_HEIGHT;
  const v = VARIANTS[variant] || VARIANTS.thinking;
  const resolved = small ? (size === 'large' ? 'medium' : 'small') : size;
  const dim = px || SIZES[resolved];

  // Rises 8px and scales up from .94 on mount; skipped under reduce motion.
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        progress.setValue(1);
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [variant, animate]);

  if (hideOnSmall && small) return null;

  return (
    <Animated.Image
      source={v.image}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : v.label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[
        {
          width: dim,
          height: dim,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
        style,
      ]}
    />
  );
}
