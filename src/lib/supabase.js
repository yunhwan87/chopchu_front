import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// .env 파일에서 정보를 가져오거나 직접 입력할 수 있습니다.
// Expo 환경에서는 Constants나 process.env를 사용합니다.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl?.substring(0, 10) + '...');
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
