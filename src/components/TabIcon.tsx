// src/components/TabIcon.tsx: a bottom-tab icon.
//
// expo-symbols draws SF Symbols on iOS and Material Symbols on Android. A bare SF name renders nothing
// off iOS, so every tab names both. The web build resolves TabIcon.web.tsx instead.
import { SymbolView, type SFSymbol, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type MaterialSymbol = Exclude<Exclude<SymbolViewProps['name'], SFSymbol>['web'], undefined>;

export interface TabIconProps {
  name: SFSymbol;
  material: MaterialSymbol;
  color: ColorValue;
}

export function TabIcon({ name, material, color }: TabIconProps) {
  return (
    <SymbolView
      name={{ ios: name, android: material, web: material }}
      size={25}
      weight="bold"
      tintColor={color}
      resizeMode="scaleAspectFit"
    />
  );
}
