// src/juice/Celebration.web.tsx: the web build's confetti.
//
// lottie-react-native's web entry needs @lottiefiles/dotlottie-react, which this app does not ship.
// Rather than add a dependency for a decorative burst, the web build always renders the same static
// confetti frame the native build shows under reduce-motion. Native keeps Celebration.tsx unchanged.

import { View } from 'react-native';

import { colors } from '@/design/tokens';

import type { CelebrationProps } from './Celebration';

const STATIC_COLORS = [colors.clay400, colors.xpGold, colors.gemTeal, colors.streakFlame, colors.success];

export function Celebration(_props: CelebrationProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="celebration-static"
      style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}
    >
      {STATIC_COLORS.map((c, i) => (
        <View
          key={c}
          style={{
            width: 12,
            height: 18,
            borderRadius: 2,
            backgroundColor: c,
            transform: [{ rotate: `${(i - 2) * 12}deg` }],
          }}
        />
      ))}
    </View>
  );
}
