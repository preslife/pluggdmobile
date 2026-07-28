import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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

  useEffect(() => {
    let active = true;
    if (Platform.OS !== 'ios') return;
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

  if (!available) return null;

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
