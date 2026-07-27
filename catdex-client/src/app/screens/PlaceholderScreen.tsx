import { StyleSheet, View } from 'react-native';

/**
 * 새 디자인이 확정되기 전까지 촬영 외 화면은 흰 화면으로 둔다.
 * 화면별 구현은 디자인이 나오는 순서대로 이 자리를 대체한다.
 */
export function PlaceholderScreen() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
