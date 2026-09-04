import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../design/typography';
import { usePluggdTheme } from '../design/usePluggdTheme';

/**
 * Terms of Use and Privacy Policy links for any screen that sells something.
 *
 * App Store Review guideline 3.1.2 requires that the point of purchase for an
 * auto-renewable subscription shows the title, duration and price *and*
 * functional links to both documents. Missing links are a standard rejection,
 * so this ships wherever a purchase can start: memberships, the creator
 * membership sheet and the wallet.
 *
 * `note` carries the screen-specific renewal or spend wording that has to sit
 * alongside the links.
 */
export function PurchaseLegalLinks({ note }: { note?: string }) {
  const router = useRouter();
  const theme = usePluggdTheme();

  return (
    <View style={styles.wrap}>
      {note ? (
        <Text style={[styles.note, { color: theme.colors.textSubtle }]}>{note}</Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Read the Terms of Use"
          onPress={() => router.push('/legal/terms' as any)}
          style={({ pressed }) => [
            styles.linkButton,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.link, { color: theme.colors.accent }]}>Terms of Use</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Read the Privacy Policy"
          onPress={() => router.push('/legal/privacy' as any)}
          style={({ pressed }) => [
            styles.linkButton,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.link, { color: theme.colors.accent }]}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10, paddingTop: 4 },
  note: { fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, lineHeight: 18 },
  row: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' },
  linkButton: { minHeight: 44, minWidth: 126, flexGrow: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12, textDecorationLine: 'underline', textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
