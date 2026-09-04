import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../../lib/supabase';

const STORAGE_PREFIX = 'pluggd:studio-enabled-modules';

type PreferenceRow = {
  module_identifier?: string | null;
  enabled?: boolean | null;
};

function storageKey(userId: string | null | undefined) {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}`;
}

export async function readLocalStudioModulePreferences<T extends string>(
  userId: string | null | undefined,
  isValid: (value: unknown) => value is T,
) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter(isValid))) : [];
  } catch {
    return [];
  }
}

export async function cacheStudioModulePreferences<T extends string>(
  userId: string | null | undefined,
  moduleIds: readonly T[],
) {
  const normalized = Array.from(new Set(moduleIds));
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
}

export async function loadServerStudioModulePreferences<T extends string>({
  userId,
  allModuleIds,
  isValid,
}: {
  userId: string;
  allModuleIds: readonly T[];
  isValid: (value: unknown) => value is T;
}) {
  const local = await readLocalStudioModulePreferences(userId, isValid);
  const client = supabase as any;
  let { data, error } = await client
    .from('creator_studio_module_preferences')
    .select('module_identifier,enabled')
    .eq('user_id', userId);

  if (error) {
    // The release can still render its previously saved local state while the
    // source-only migration is awaiting the authorised integration deploy.
    return { moduleIds: local, synced: false, error: error.message || 'Studio sync is unavailable.' };
  }

  if (!Array.isArray(data) || data.length === 0) {
    const enabled = new Set(local);
    const initialRows = allModuleIds.map((moduleId) => ({
      user_id: userId,
      module_identifier: moduleId,
      enabled: enabled.has(moduleId),
    }));
    const initialised = await client
      .from('creator_studio_module_preferences')
      .upsert(initialRows, { onConflict: 'user_id,module_identifier', ignoreDuplicates: true });
    if (initialised.error) {
      return {
        moduleIds: local,
        synced: false,
        error: initialised.error.message || 'Studio sync could not be initialised.',
      };
    }
    const refreshed = await client
      .from('creator_studio_module_preferences')
      .select('module_identifier,enabled')
      .eq('user_id', userId);
    data = refreshed.data;
    error = refreshed.error;
    if (error) {
      return { moduleIds: local, synced: false, error: error.message || 'Studio sync could not refresh.' };
    }
  }

  const moduleIds = Array.from(new Set(
    ((data || []) as PreferenceRow[])
      .filter((row) => row.enabled && isValid(row.module_identifier))
      .map((row) => row.module_identifier as T),
  ));
  await cacheStudioModulePreferences(userId, moduleIds);
  return { moduleIds, synced: true, error: null };
}

export async function saveServerStudioModulePreferences<T extends string>({
  userId,
  moduleIds,
  allModuleIds,
}: {
  userId: string;
  moduleIds: readonly T[];
  allModuleIds: readonly T[];
}) {
  const enabled = new Set(moduleIds);
  const { error } = await (supabase as any)
    .from('creator_studio_module_preferences')
    .upsert(
      allModuleIds.map((moduleId) => ({
        user_id: userId,
        module_identifier: moduleId,
        enabled: enabled.has(moduleId),
      })),
      { onConflict: 'user_id,module_identifier' },
    );
  if (error) throw new Error(error.message || 'Studio modules could not be synced.');
  return cacheStudioModulePreferences(userId, moduleIds);
}
