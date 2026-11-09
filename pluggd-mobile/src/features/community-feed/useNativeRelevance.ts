import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { NativeRelevanceController } from './communityRelevanceController';
import { nativeFeedMode, type NativeFeedMode } from './communityRelevanceModel';

export function useNativeRelevance(initialMode: NativeFeedMode = 'latest', enabled = true, contextOnly = false) {
  const { user, session, loading } = useAuth();
  const actorId = user?.id ?? null;
  const token = session?.access_token ?? null;
  const controller = useMemo(() => new NativeRelevanceController(actorId && token ? { id: actorId, token } : null, undefined, initialMode, contextOnly), [actorId, token, initialMode, contextOnly]);
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  useEffect(() => {
    let disposed = false;
    if (actorId && !contextOnly) void AsyncStorage.getItem(`pluggd.community.feedMode.v1:${actorId}`).then(value => { const mode = nativeFeedMode(value); if (!disposed && mode) controller.restoreMode(mode); }).catch(() => undefined);
    return () => { disposed = true; controller.dispose(); };
  }, [actorId, controller, contextOnly]);
  useFocusEffect(useCallback(() => {
    controller.setActive(enabled && !loading && AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', value => controller.setActive(enabled && !loading && value === 'active', value !== 'active'));
    return () => { subscription.remove(); controller.setActive(false); };
  }, [controller, enabled, loading]));
  const selectMode = (mode: NativeFeedMode) => {
    controller.selectMode(mode);
    if (actorId) void AsyncStorage.setItem(`pluggd.community.feedMode.v1:${actorId}`, mode).catch(() => undefined);
  };
  return { state, controller, actorId, selectMode };
}
