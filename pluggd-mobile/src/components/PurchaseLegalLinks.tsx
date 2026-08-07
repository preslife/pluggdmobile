import { Linking, StyleSheet, Text, View } from 'react-native';
import { LEGAL_URLS } from '../config/environment';
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
  const theme = usePluggdTheme();

  return (
    <View style={styles.wrap}>
      {note ? (
        <Text style={[styles.note, { color: theme.colors.textSubtle }]}>{note}</Text>
      ) : null}
      <View style={styles.row}>
        <Text
          accessibilityRole="link"
          accessibilityLabel="Read the Terms of Use"
          onPress={() => Linking.openURL(LEGAL_URLS.terms)}
          style={[styles.link, { color: theme.colors.accent }]}
        >
          Terms of Use
        </Text>
        <Text style={[styles.divider, { color: theme.colors.textSubtle }]}>·</Text>
        <Text
          accessibilityRole="link"
          accessibilityLabel="Read the Privacy Policy"
          onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
          style={[styles.link, { color: theme.colors.accent }]}
        >
          Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingTop: 4 },
  note: { fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  link: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12, textDecorationLine: 'underline' },
  divider: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
});
