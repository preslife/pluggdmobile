import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_creator: boolean;
  user_type: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lookup user by username
 */
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return null;
  }
}

/**
 * Lookup user by ID (for legacy redirects)
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking username availability:', error);
      return false;
    }

    return !data; // Username is available if no data returned
  } catch (error) {
    console.error('Error in isUsernameAvailable:', error);
    return false;
  }
}

/**
 * Generate a unique username from a base name
 */
export async function generateUniqueUsername(baseName: string): Promise<string> {
  // Clean the base name
  let cleanBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  if (!cleanBase) {
    cleanBase = 'user';
  }

  // Try the base name first
  if (await isUsernameAvailable(cleanBase)) {
    return cleanBase;
  }

  // Try with numbers
  for (let i = 1; i <= 999; i++) {
    const candidate = `${cleanBase}${i}`;
    if (await isUsernameAvailable(candidate)) {
      return candidate;
    }
  }

  // Fallback with timestamp
  return `${cleanBase}${Date.now().toString().slice(-6)}`;
}