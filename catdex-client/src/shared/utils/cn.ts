import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

type NamedStyle = ViewStyle | TextStyle | ImageStyle;

export function cn<T extends NamedStyle>(...styles: Array<StyleProp<T> | false | null | undefined>) {
  return styles.filter(Boolean) as StyleProp<T>[];
}
