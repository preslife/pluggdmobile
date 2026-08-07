import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { appleSignInAvailable } from '../src/features/auth/apple-sign-in';

/**
 * Resolved on demand: a top-level import of expo-apple-authentication throws on
 * a binary without the native module, and this button renders inside the login
 * screen — so the whole sign-in screen went blank instead of simply dropping
 * the Apple option.
 */
type AppleAuthenticationModule = typeof import('expo-apple-authentication');

function appleAuth(): AppleAuthenticationModule | null {
  if (!appleSignInAvailable()) return null;
  try {
    return require('expo-apple-authentication') as AppleAuthenticationModule;
  } catch {
    return null;
  }
}

type Props = {
  onPress: () => void;
  mode?: 'sign-in' | 'sign-up';
  light?: boolean;
  disabled?: boolean;
};

export function AppleSignInButton({
  onPress,
  mode = 'sign-in',
  light = false,
  disabled = false,
}: Props) {
  const [available, setAvailable] = useState(false);

  const AppleAuthentication = appleAuth();

  useEffect(() => {
    let active = true;
    if (Platform.OS !== 'ios' || !AppleAuthentication) return;
    AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (active) setAvailable(isAvailable);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!available || !AppleAuthentication) return null;

  return (
    <View style={{ opacity: disabled ? 0.55 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel={mode === 'sign-up' ? 'Sign up with Apple' : 'Sign in with Apple'}
        buttonType={
          mode === 'sign-up'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
        }
        buttonStyle={
          light
            ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
        }
        cornerRadius={5}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 52,
  },
});
