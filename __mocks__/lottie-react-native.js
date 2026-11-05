// Manual jest mock for lottie-react-native (auto-applied for this node module).
//
// The real LottieView renders a native view backed by the Lottie native module, which is not present
// under jest. Our juice components (Celebration, ceremony v2) only need it to render as an inert host
// element in tests — the animation itself is a device concern. This stub renders a plain <View> and
// ignores Lottie-specific props (source/autoPlay/loop), so any tree containing a celebration mounts
// without touching native code.
const React = require('react');
const { View } = require('react-native');

const LottieView = React.forwardRef((props, ref) => {
  // Drop Lottie-only props; forward style/testID/accessibility so tests can still query the node.
  const { source, autoPlay, loop, ...rest } = props;
  return React.createElement(View, { ...rest, ref });
});
LottieView.displayName = 'LottieView';

module.exports = {
  __esModule: true,
  default: LottieView,
  LottieView,
};
