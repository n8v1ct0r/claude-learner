// Manual jest mock for react-native-reanimated (auto-applied for this node module).
//
// The package's own `/mock` entry pulls the real ./index, which initializes react-native-worklets'
// native module and crashes under jest (loadUnpackers on undefined). This self-contained mock
// implements only the tiny surface our components use — no native imports — so unit/a11y tests can
// render Reanimated-driven views (Button3D) without a device.
const React = require('react');
const { View } = require('react-native');

const useSharedValue = (init) => ({ value: init });

// Run the worklet body immediately on the JS thread and return its style object.
const useAnimatedStyle = (fn) => {
  try {
    return fn() || {};
  } catch {
    return {};
  }
};

// Animation helpers resolve to their target value synchronously (no timers under test).
const withTiming = (toValue) => toValue;
const withSpring = (toValue) => toValue;
const withDelay = (_delay, animation) => animation;
const withSequence = (...animations) => animations[animations.length - 1];
// A repeated animation resolves to its (already-synchronous) target value; there are no timers under
// test, so the looped value simply settles. cancelAnimation is a no-op on the plain shared-value stub.
const withRepeat = (animation) => animation;
const cancelAnimation = () => {};
const runOnJS = (fn) => fn;

const createAnimatedComponent = (Component) => {
  const Wrapped = React.forwardRef((props, ref) =>
    React.createElement(Component, { ...props, ref }),
  );
  Wrapped.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

const AnimatedView = createAnimatedComponent(View);

module.exports = {
  __esModule: true,
  default: {
    View: AnimatedView,
    createAnimatedComponent,
  },
  View: AnimatedView,
  createAnimatedComponent,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
  Easing: { linear: (t) => t, ease: (t) => t, inOut: (fn) => fn, out: (fn) => fn },
};
