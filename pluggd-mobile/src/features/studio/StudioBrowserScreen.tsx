import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { selectionHaptic } from '../../design/haptics';
import type { PluggdTheme } from '../../design/tokens';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { supabase } from '../../lib/supabase';
import { isAllowlistedStudioPath } from './studio-data';

const STUDIO_ORIGIN = 'https://pluggd.fm';
const STUDIO_HOST = 'pluggd.fm';

type BrowserState = 'issuing' | 'ready' | 'failed' | 'session_expired';

type HandoffResponse = {
  code?: unknown;
  verifier?: unknown;
  target_path?: unknown;
  error?: unknown;
};

function firstParam(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function safeReturnRoute(value: string) {
  return value.startsWith('/studio') && !value.startsWith('/studio/browser')
    ? value
    : '/studio/apps';
}

function safeTitle(value: string) {
  const normalized = value.trim().slice(0, 80);
  return normalized || 'Studio';
}

function parsePluggdUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function StudioBrowserScreen() {
  const params = useLocalSearchParams<{
    targetPath?: string | string[];
    title?: string | string[];
    returnTo?: string | string[];
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webViewRef = useRef<WebView>(null);
  const targetPath = firstParam(params.targetPath, '/studio');
  const returnTo = safeReturnRoute(firstParam(params.returnTo, '/studio/apps'));
  const title = safeTitle(firstParam(params.title, 'Studio'));
  const [state, setState] = useState<BrowserState>('issuing');
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('Creating your secure Studio session…');
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  const validTarget = useMemo(() => isAllowlistedStudioPath(targetPath), [targetPath]);

  const close = useCallback(() => {
    selectionHaptic();
    router.replace(returnTo as never);
  }, [returnTo, router]);

  const issueHandoff = useCallback(async () => {
    setState('issuing');
    setHandoffUrl(null);
    setLoading(true);
    setMessage('Creating your secure Studio session…');

    if (!validTarget) {
      setState('failed');
      setMessage('This Studio destination is not available in the app.');
      return;
    }

    const { data, error } = await supabase.functions.invoke<HandoffResponse>(
      'mobile-studio-handoff',
      { body: { action: 'issue', target_path: targetPath } },
    );
    const code = typeof data?.code === 'string' ? data.code : '';
    const verifier = typeof data?.verifier === 'string' ? data.verifier : '';

    if (error || !code || !verifier) {
      setState('failed');
      setMessage(
        typeof data?.error === 'string'
          ? data.error
          : 'Studio could not create a secure session. Check your connection and try again.',
      );
      return;
    }

    const fragment = new URLSearchParams({ code, verifier }).toString();
    setHandoffUrl(`${STUDIO_ORIGIN}/mobile-studio-handoff#${fragment}`);
    setState('ready');
  }, [targetPath, validTarget]);

  useEffect(() => {
    void issueHandoff();
  }, [issueHandoff]);

  const onNavigation = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
    setLoading(navigation.loading);
  }, []);

  const allowNavigation = useCallback((request: { url: string }) => {
    const parsed = parsePluggdUrl(request.url);
    if (!parsed) return false;

    if (parsed.host !== STUDIO_HOST) {
      Alert.alert(
        'Open outside PLUGGD?',
        'This link leaves Creator Studio.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => void Linking.openURL(request.url) },
        ],
      );
      return false;
    }

    if (parsed.pathname.startsWith('/auth')) {
      setState('session_expired');
      setMessage('Your Studio session ended. Sign in to PLUGGD again, then reopen this module.');
      return false;
    }

    return parsed.pathname === '/mobile-studio-handoff'
      || parsed.pathname === '/studio'
      || parsed.pathname.startsWith('/studio/');
  }, []);

  const retry = useCallback(() => {
    selectionHaptic();
    void issueHandoff();
  }, [issueHandoff]);

  const showError = useCallback((nextMessage: string) => {
    setState('failed');
    setLoading(false);
    setMessage(nextMessage);
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.chrome, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Studio module"
          onPress={close}
          style={styles.iconButton}
        >
          <MaterialIcons name="close" size={25} color={theme.colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>PLUGGD STUDIO</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back in Studio"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => webViewRef.current?.goBack()}
          style={[styles.iconButton, !canGoBack && styles.disabledButton]}
        >
          <MaterialIcons name="arrow-back" size={23} color={theme.colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh Studio module"
          onPress={() => webViewRef.current?.reload()}
          disabled={state !== 'ready'}
          style={[styles.iconButton, state !== 'ready' && styles.disabledButton]}
        >
          <MaterialIcons name="refresh" size={23} color={theme.colors.text} />
        </Pressable>
      </View>

      {state === 'ready' && handoffUrl ? (
        <View style={styles.webWrap}>
          <WebView
            ref={webViewRef}
            source={{ uri: handoffUrl }}
            originWhitelist={[STUDIO_ORIGIN]}
            onShouldStartLoadWithRequest={allowNavigation}
            onNavigationStateChange={onNavigation}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => showError('Studio could not load. Check your connection and try again.')}
            onHttpError={(event) => showError(`Studio returned an error (${event.nativeEvent.statusCode}). Try again.`)}
            onContentProcessDidTerminate={() => showError('Studio restarted unexpectedly. Reopen the module to continue.')}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            startInLoadingState={false}
            style={styles.webView}
          />
          {loading ? (
            <View pointerEvents="none" style={styles.loadingBar}>
              <ActivityIndicator color={theme.colors.accentText} size="small" />
              <Text style={styles.loadingText}>Loading {title}…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.stateWrap}>
          {state === 'issuing' ? (
            <ActivityIndicator color={theme.colors.accentText} size="large" />
          ) : (
            <View style={styles.stateIcon}>
              <MaterialIcons name={state === 'session_expired' ? 'lock-clock' : 'cloud-off'} size={34} color={state === 'session_expired' ? theme.colors.accentText : theme.colors.danger} />
            </View>
          )}
          <Text style={styles.stateTitle}>
            {state === 'issuing' ? 'Opening your workspace' : state === 'session_expired' ? 'Studio session ended' : 'Studio did not open'}
          </Text>
          <Text accessibilityRole={state === 'issuing' ? 'text' : 'alert'} style={styles.stateMessage}>{message}</Text>
          {state !== 'issuing' ? (
            <View style={styles.stateActions}>
              {state !== 'session_expired' ? (
                <Pressable accessibilityRole="button" onPress={retry} style={styles.primaryButton}>
                  <MaterialIcons name="refresh" size={20} color={theme.colors.onAccent} />
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={close} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Back to Studio</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  chrome: {
    minHeight: 76,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
  },
  disabledButton: { opacity: 0.35 },
  titleWrap: { flex: 1, minWidth: 0, paddingHorizontal: 5 },
  kicker: {
    color: theme.colors.accentText,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 9,
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 2,
    color: theme.colors.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 18,
  },
  webWrap: { flex: 1, backgroundColor: theme.colors.background },
  webView: { flex: 1, backgroundColor: theme.colors.background },
  loadingBar: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    backgroundColor: theme.colors.surfaceStrong,
  },
  loadingText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
  },
  stateTitle: {
    marginTop: 22,
    color: theme.colors.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 25,
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  stateActions: { marginTop: 24, width: '100%', gap: 10 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.accentFill,
  },
  primaryButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.displayExtraBold, fontSize: 15 },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  });
}
