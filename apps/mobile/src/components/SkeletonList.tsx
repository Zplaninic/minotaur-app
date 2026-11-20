import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { colors, durations, minTouchSize, opacity, radii, shadows, spacing } from "../theme/tokens";

type SkeletonListProps = {
  // Read by screen readers; the placeholder rows themselves are hidden from them.
  label: string;
  rows?: number;
};

// Detail lines per row vary so the placeholder reads like a real list.
const DETAIL_WIDTHS = ["70%", "55%", "80%", "45%"] as const;

// Placeholder rows shaped like the list cards, while the first page loads.
export const SkeletonList = ({ label, rows = 6 }: SkeletonListProps) => {
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const appear = Animated.sequence([
      Animated.delay(durations.loaderDelay),
      Animated.timing(fade, { toValue: 1, duration: durations.loaderDelay, useNativeDriver: true }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: opacity.pulse, duration: durations.pulse, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: durations.pulse, useNativeDriver: true }),
      ]),
    );
    let stopped = false;
    appear.start(({ finished }) => {
      if (!finished) {
        return;
      }
      // With reduced motion the rows stay still.
      void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (!reduced && !stopped) {
          pulse.start();
        }
      });
    });
    return () => {
      stopped = true;
      appear.stop();
      pulse.stop();
    };
  }, [fade]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <Animated.View style={{ opacity: fade }} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: rows }, (_, index) => (
          <View key={index} style={styles.row}>
            <View style={[styles.bar, styles.title]} />
            <View style={[styles.bar, styles.detail, { width: DETAIL_WIDTHS[index % DETAIL_WIDTHS.length] }]} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchSize,
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radii.lg,
    ...shadows.raised,
    backgroundColor: colors.beige10,
  },
  bar: {
    borderRadius: radii.pill,
    backgroundColor: colors.greenDark10,
  },
  title: {
    width: "50%",
    height: spacing[4],
  },
  detail: {
    height: spacing[3],
  },
});
