import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type AppStateStatus } from 'react-native';
import { Asset } from 'expo-asset';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { clampViewAngle, coverImageUrl, parseDeckEvent, validCueId, type DeckSnapshot } from './deckBridge';

export type ListeningDeck3DProps = {
  mixId: string; coverUrl: string | null; position: number; duration: number;
  playing: boolean; engaged: boolean; visible: boolean; reducedMotion: boolean;
  cueRequestId: number | null; parkRequestId?: number | null; onCueReady: (id: number) => void;
  onSeek: (seconds: number) => void; onError?: (message: string) => void;
  onReady?: () => void; viewAngle?: number; chapters?: readonly number[];
};
const bundle = require('../../../assets/listening-room/deck.html');
let localBundle: Promise<string> | null = null;
function deckBundleUri() {
  if (!localBundle) {
    localBundle = Asset.fromModule(bundle).downloadAsync().then(asset => {
      if (!asset.localUri?.startsWith('file://')) throw new Error('Local deck unavailable');
      return asset.localUri;
    }).catch(error => { localBundle = null; throw error; });
  }
  return localBundle;
}
/** Visual surface only. Native Track Player and the parent route own every audio action. */
export function ListeningDeck3D(props: ListeningDeck3DProps) {
  const [uri, setUri] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const web = useRef<WebView>(null);
  const loaded = useRef(false);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const lastSent = useRef(0);
  const lastEvent = useRef(0);
  const session = useRef(`deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  const latest = useRef(props); latest.current = props;
  const foreground = useRef(appState === 'active'); foreground.current = appState === 'active';
  const cancelledCue = useRef(new Set<string>());
  const deliveredCue = useRef(new Set<string>());
  const activeCue = useRef<{ key: string; id: number } | null>(null);
  const errorReported = useRef(false);
  const reportError = useCallback(() => {
    if (errorReported.current) return;
    errorReported.current = true;
    latest.current.onError?.('The 3D deck could not open. Please try again.');
  }, []);
  const sendSnapshot = useCallback(() => {
    if (!loaded.current || !web.current) return;
    const p = latest.current;
    const visible = p.visible && foreground.current;
    const duration = Number.isFinite(p.duration) ? Math.max(0, p.duration) : 0;
    const position = Number.isFinite(p.position) ? Math.max(0, Math.min(duration, p.position)) : 0;
    const key = `${p.mixId}:${p.cueRequestId}`;
    if (activeCue.current && (activeCue.current.key !== key || !visible)) cancelledCue.current.add(activeCue.current.key);
    activeCue.current = p.cueRequestId !== null && validCueId(p.cueRequestId) && visible && !cancelledCue.current.has(key)
      ? { key, id: p.cueRequestId } : null;
    const state: DeckSnapshot = {
      kind: 'state', version: 1, session: session.current, mixId: p.mixId,
      sequence: ++sequence.current, duration, position, playing: p.playing,
      engaged: p.engaged, visible, reducedMotion: p.reducedMotion,
      cueRequestId: activeCue.current?.id ?? null,
      parkRequestId: validCueId(p.parkRequestId) ? p.parkRequestId : null,
      coverUrl: coverImageUrl(p.coverUrl), viewAngle: clampViewAngle(p.viewAngle ?? 35.5),
      chapters: (p.chapters ?? []).filter(n => Number.isFinite(n) && n >= 0 && n <= duration).slice(0, 300),
    };
    // JSON is data, never interpolated into HTML or executable callbacks.
    lastSent.current = Date.now();
    web.current.injectJavaScript(`window.PLUGGDDeckReceive?.(${JSON.stringify(state)}); true;`);
  }, []);
  useEffect(() => {
    let alive = true; mounted.current = true;
    void deckBundleUri().then(value => { if (alive) setUri(value); }).catch(() => { if (alive) reportError(); });
    return () => { alive = false; mounted.current = false; loaded.current = false; activeCue.current = null; };
  }, [reportError]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', value => {
      foreground.current = value === 'active';
      setAppState(value);
      sendSnapshot();
    });
    return () => listener.remove();
  }, [sendSnapshot]);
  // Identity/cue/lifecycle commands are immediate; progress updates cross at most ten times a second.
  useEffect(sendSnapshot, [appState, props.mixId, props.visible, props.cueRequestId, props.parkRequestId, sendSnapshot]);
  useEffect(() => {
    const timer = setTimeout(sendSnapshot, Math.max(0, 100 - (Date.now() - lastSent.current)));
    return () => clearTimeout(timer);
  }, [props.coverUrl, props.position, props.duration, props.playing, props.engaged,
    props.reducedMotion, props.viewAngle, props.chapters, sendSnapshot]);
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    if (!mounted.current) return;
    const message = parseDeckEvent(event.nativeEvent.data);
    const p = latest.current;
    if (!message || message.session !== session.current || message.mixId !== p.mixId || message.sequence <= lastEvent.current) return;
    lastEvent.current = message.sequence;
    if (message.kind === 'error') { reportError(); return; }
    if (message.kind === 'ready') { latest.current.onReady?.(); return; }
    if (!p.visible || !foreground.current) return;
    if (message.kind === 'seek') {
      if (Number.isFinite(p.duration) && p.duration > 0 && message.seconds <= p.duration) p.onSeek(message.seconds);
      return;
    }
    const key = `${p.mixId}:${message.requestId}`;
    if (message.requestId !== p.cueRequestId || activeCue.current?.key !== key || cancelledCue.current.has(key) || deliveredCue.current.has(key)) return;
    deliveredCue.current.add(key); activeCue.current = null;
    p.onCueReady(message.requestId);
  }, [reportError]);
  if (!uri) return <View style={styles.surface} pointerEvents="none" />;
  return <View style={styles.surface} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <WebView ref={web} source={{ uri }} style={styles.web} originWhitelist={['file://*', 'about:blank']}
      onLoadStart={() => { loaded.current = false; lastEvent.current = 0; }}
      onLoadEnd={() => { loaded.current = true; sendSnapshot(); }}
      onMessage={onMessage} onError={reportError} onHttpError={reportError}
      onContentProcessDidTerminate={reportError} onRenderProcessGone={() => { reportError(); }}
      onShouldStartLoadWithRequest={request => request.url === uri || request.url === 'about:blank'}
      javaScriptEnabled domStorageEnabled={false} scrollEnabled={false} bounces={false}
      setSupportMultipleWindows={false} allowsInlineMediaPlayback={false} mediaPlaybackRequiresUserAction
      allowsFullscreenVideo={false} allowsBackForwardNavigationGestures={false}
      allowFileAccess allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
      allowingReadAccessToURL={uri.slice(0, uri.lastIndexOf('/') + 1)}
      mixedContentMode="never" cacheEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
    />
  </View>;
}
const styles = StyleSheet.create({
  surface: { width: '100%', aspectRatio: 1.55, overflow: 'hidden', backgroundColor: 'transparent' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
export default ListeningDeck3D;
