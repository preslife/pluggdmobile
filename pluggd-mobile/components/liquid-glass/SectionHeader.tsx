import { Pressable, StyleSheet, Text, View } from 'react-native';
import { liquidGlassColors } from '../../src/design/liquidGlassTokens';
import { pluggdFonts } from '../../src/design/typography';

type SectionHeaderProps = {
  title: string;
  subtitle?: string | null;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={styles.tick} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  subtitle: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 12,
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
