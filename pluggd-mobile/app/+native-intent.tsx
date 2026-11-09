import { mixAccessSession } from '../src/features/playback/mixAccessSession';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return mixAccessSession.rewriteLink(path, process.env.EXPO_PUBLIC_APP_LINK_HOST);
}
