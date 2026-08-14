import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import type { CarnivalHubBundle, CarnivalRoutePreferences, CarnivalSignal, SavedCarnivalRoute } from './carnivalTypes';

const ROUTE_KEY = 'pluggd.carnival-2026.saved-route';
const ROAD_PACK_KEY = 'pluggd.carnival-2026.road-pack';

export async function loadCarnivalHub(): Promise<CarnivalHubBundle> {
  const { data, error } = await supabase.functions.invoke('get-carnival-hub', { method: 'GET' });
  if (error) throw error;
  if (!data || data.schemaVersion !== 1) throw new Error('The Carnival guide is being updated. Please try again shortly.');
  return data as CarnivalHubBundle;
}

export async function loadCarnivalStoryHtml(articleUrl: string) {
  const url = new URL(articleUrl);
  if (url.protocol !== 'https:' || !['pluggd.fm', 'www.pluggd.fm'].includes(url.hostname)) {
    throw new Error('This story is not available in the PLUGGD reader.');
  }

  const response = await fetch(url.toString(), { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error('This story did not finish loading.');

  const source = await response.text();
  const readerStyle = `
    <style id="pluggd-reader-shell">
      .pluggd-carnival-reader-nav, .masthead { display: none !important; }
      html { scroll-behavior: auto !important; }
      body { padding-bottom: max(28px, env(safe-area-inset-bottom)) !important; }
      .hero { min-height: min(720px, 72svh) !important; }
      .hero__inner { min-height: min(720px, 72svh) !important; }
      a, button { min-height: 44px; }
      img { max-width: 100% !important; height: auto; }
    </style>`;

  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/<\/head>/i, `${readerStyle}</head>`);
}

export function isCarnivalCampaignActive(bundle?: CarnivalHubBundle | null, now = new Date()) {
  if (!bundle) return false;
  const start = new Date(bundle.campaign.startsAt).getTime();
  const end = new Date(bundle.campaign.endsAt).getTime();
  const current = now.getTime();
  return Number.isFinite(start) && Number.isFinite(end) && current >= start && current <= end;
}

export function carnivalSignalCategory(signal: CarnivalSignal) {
  const tags = [...(signal.activity_tags ?? []), ...(signal.mood_tags ?? [])].map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag.includes('access') || tag.includes('toilet') || tag.includes('medical'))) return 'Access & essentials';
  if (tags.some((tag) => tag.includes('stage') || tag.includes('performance'))) return 'Stages';
  if (tags.some((tag) => tag.includes('food') || tag.includes('drink'))) return 'Food & drink';
  return 'Sound systems';
}

export function buildCarnivalRoute(signals: CarnivalSignal[], preferences: CarnivalRoutePreferences): SavedCarnivalRoute {
  const eligible = signals.filter((signal) => signal.public_latitude != null && signal.public_longitude != null);
  const sound = preferences.sound.toLowerCase();
  const scored = eligible
    .map((signal) => {
      const text = [signal.location_label, signal.body, ...(signal.activity_tags ?? []), ...(signal.mood_tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const accessible = /access|step-free|toilet|medical|quiet/.test(text);
      return {
        signal,
        score: (sound === 'surprise me' || text.includes(sound) ? 6 : 0) + (preferences.accessible && accessible ? 5 : 0) + (signal.location_label ? 1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || (a.signal.location_label ?? '').localeCompare(b.signal.location_label ?? ''));
  const limit = preferences.pace === 'Easy' ? 3 : preferences.pace === 'Balanced' ? 5 : 8;
  return { ...preferences, createdAt: new Date().toISOString(), stops: scored.slice(0, limit).map(({ signal }) => signal) };
}

export async function saveCarnivalRoute(route: SavedCarnivalRoute) {
  await AsyncStorage.setItem(ROUTE_KEY, JSON.stringify(route));
}

export async function loadSavedCarnivalRoute(): Promise<SavedCarnivalRoute | null> {
  const value = await AsyncStorage.getItem(ROUTE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as SavedCarnivalRoute;
  } catch {
    return null;
  }
}

export async function downloadCarnivalRoadPack(url: string, updatedAt: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) throw new Error('Offline storage is unavailable on this device.');
  const destination = `${directory}pluggd-carnival-2026-road-pack.html`;
  const result = await FileSystem.downloadAsync(url, destination);
  await AsyncStorage.setItem(ROAD_PACK_KEY, JSON.stringify({ uri: result.uri, updatedAt, savedAt: new Date().toISOString() }));
  return result.uri;
}

export async function loadCarnivalRoadPack(): Promise<{ uri: string; updatedAt: string; savedAt: string } | null> {
  const value = await AsyncStorage.getItem(ROAD_PACK_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { uri: string; updatedAt: string; savedAt: string };
    const info = await FileSystem.getInfoAsync(parsed.uri);
    return info.exists ? parsed : null;
  } catch {
    return null;
  }
}
