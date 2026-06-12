import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

function normalizeSupabaseUrl(nextUrl: string) {
  if (!nextUrl) {
    return '';
  }

  try {
    return new URL(nextUrl).origin;
  } catch {
    return nextUrl;
  }
}

const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '');
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

function isPlaceholderSupabaseConfig(url: string, key: string) {
  return (
    !url ||
    !key ||
    url.includes('your-project-ref') ||
    url === 'https://placeholder.supabase.co' ||
    key === 'placeholder-key' ||
    key.includes('your_key_here')
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !isPlaceholderSupabaseConfig(supabaseUrl, supabaseKey));

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 설정이 필요합니다. .env의 EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 실제 프로젝트 값으로 바꿔 주세요.');
  }
}
