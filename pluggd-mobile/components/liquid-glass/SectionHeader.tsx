import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { liquidGlassColors } from '../../src/design/liquidGlassTokens';
import { pluggdFonts } from '../../src/design/typography';

type SectionHeaderProps = {
  title: string;
  subtitle?: string | null;
  actionLabel?: string;
  onActionPress?: () => void;
  /** Web-parity editorial header: small orange icon + serif title + letterspaced subline. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  serif?: boolean;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress, icon, serif }: SectionHeaderProps) {
  const editorial = Boolean(icon || serif);
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {icon ? (
            <MaterialIcons name={icon} size={18} color="#FF5A00" />
          ) : (
            <View style={styles.tick} />
          )}
          <Text style={[styles.title, serif && styles.titleSerif]}>{title}</Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, editorial && styles.subtitleEditorial]}>
            {editorial ? subtitle.toUpperCase() : subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onActionPress} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  tick: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#FF5A00',
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  titleSerif: {
    fontFamily: pluggdFonts.serif,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: 0,
  },
  subtitle: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 12,
  },
  subtitleEditorial: {
    marginLeft: 0,
    marginTop: 3,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9.5,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
});
