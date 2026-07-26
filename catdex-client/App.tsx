import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// 재설계 대기 상태입니다.
// 기존 화면 코드는 pre-redesign 태그에 보존되어 있고, 새 디자인이 나오면
// 이 자리에서부터 다시 만듭니다. 유지한 자산은 다음과 같습니다.
// - Supabase 스키마와 RLS 정책 (supabase/migrations)
// - CatVision 네이티브 모듈 (modules/cat-vision, src/shared/native)
// - 도메인 규칙 문서 (docs/domain-rules.md)
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>냥도감</Text>
      <Text style={styles.caption}>새 디자인 적용 준비 중이에요</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F0',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F1A17',
  },
  caption: {
    fontSize: 15,
    color: '#8A7F76',
  },
});
