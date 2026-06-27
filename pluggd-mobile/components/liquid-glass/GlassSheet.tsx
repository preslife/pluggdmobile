import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { pluggdFonts } from '../../src/design/typography';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassSheetProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
};

export function GlassSheet({ children, title, subtitle, style, scroll = false }: GlassSheetProps) {
  const body = scroll ? (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <LiftSurface depth="high">
      <GlassPanel intensity="strong" radius={liquidGlassRadii.xxl} style={[styles.sheet, style]}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {body}
      </GlassPanel>
    </LiftSurface>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '82%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: liquidGlassColors.borderTop,
    marginBottom: 14,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 22,
    lineHeight: 27,
  },
  subtitle: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  scrollBody: {
    paddingBottom: 8,
  },
});
