import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // RN의 require('*.webp')를 노드 테스트에서 더미 모듈로 대체한다.
      name: 'rn-image-asset-stub',
      enforce: 'pre',
      transform(code, id) {
        if (!/\.(ts|tsx)$/.test(id)) return null;
        if (!/require\((['"])[^'"]+\.(webp|png|jpg|jpeg|gif)\1\)/.test(code)) return null;
        return code.replace(/require\((['"])[^'"]+\.(webp|png|jpg|jpeg|gif)\1\)/g, '1');
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
