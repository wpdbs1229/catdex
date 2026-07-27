import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/app/navigation/RootNavigator';

// 재작성 1단계입니다. 촬영 화면만 동작하고 나머지 탭은 흰 화면 자리표시자입니다.
// 남아 있는 자산과 다음 단계는 AGENTS.md를 참고하세요.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = {
  root: { flex: 1 },
} as const;
