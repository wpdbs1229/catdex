import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import type { RootStackParamList } from '@/app/navigation/types';

/**
 * 뒤로 갈 곳이 없으면 홈으로 보낸다.
 * 알림함처럼 푸시를 눌러 곧바로 열릴 수 있는 화면은 스택에 앞 화면이 없어서
 * goBack()만 부르면 버튼이 아무 반응도 하지 않는다.
 */
export function useGoBackOrHome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Main');
  }, [navigation]);
}
