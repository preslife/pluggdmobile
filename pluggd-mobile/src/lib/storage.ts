import AsyncStorage from "@react-native-async-storage/async-storage";

// Lightweight wrapper so Supabase can persist auth session on native
export const supabaseStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export async function clearSupabaseAuthStorage() {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith("sb-") && key.includes("-auth-token"));
  if (authKeys.length) await AsyncStorage.multiRemove(authKeys);
}
