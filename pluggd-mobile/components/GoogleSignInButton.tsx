import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../src/design/typography';

type Props = {
  onPress: () => void;
  mode?: 'sign-in' | 'sign-up';
  disabled?: boolean;
};

export function GoogleSignInButton({
  onPress,
  mode = 'sign-in',
  disabled = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.buttonSurface}>
        <View style={styles.iconShell}>
          <FontAwesome name="google" size={18} color="#181818" />
        </View>
        <Text style={styles.label}>
          {mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}
        </Text>
        <View style={styles.trailingSpace} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    height: 52,
    minHeight: 52,
    flexShrink: 0,
    borderRadius: 5,
    overflow: 'hidden',
  },
  buttonSurface: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.16)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: '#F1F1F1',
    transform: [{ scale: 0.992 }],
  },
  disabled: {
    opacity: 0.55,
  },
  iconShell: {
    width: 28,
    alignItems: 'flex-start',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: '#111111',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 15,
    lineHeight: 19,
  },
  trailingSpace: {
    width: 28,
  },
});
