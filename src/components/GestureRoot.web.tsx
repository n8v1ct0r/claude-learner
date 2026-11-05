// src/components/GestureRoot.web.tsx: the web root view (see GestureRoot.tsx). No app code uses a
// gesture-handler gesture, so web needs only the flex container.
import { View, type ViewProps } from 'react-native';

export function GestureRoot(props: ViewProps) {
  return <View {...props} />;
}
