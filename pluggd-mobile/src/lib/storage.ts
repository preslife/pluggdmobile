import AsyncStorage from "@react-native-async-storage/async-storage";

// Lightweight wrapper so Supabase can persist auth session on native
export const supabaseStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
