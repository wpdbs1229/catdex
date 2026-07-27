import { StyleSheet, View } from 'react-native';

/** 3분할 안내선. 고양이를 화면 가운데로 유도해 누끼 품질을 끌어올린다. */
export function GridOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.line, styles.horizontal, { top: '33.33%' }]} />
      <View style={[styles.line, styles.horizontal, { top: '66.66%' }]} />
      <View style={[styles.line, styles.vertical, { left: '33.33%' }]} />
      <View style={[styles.line, styles.vertical, { left: '66.66%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  horizontal: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  vertical: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
});
