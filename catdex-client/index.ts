// 제스처 핸들러는 다른 무엇보다 먼저 로드되어야 한다.
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
