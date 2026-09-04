import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { pluggdFonts } from '../../src/design/typography';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type GlassSheetProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  fullHeight?: boolean;
  onClose?: () => void;
  headerAction?: ReactNode;
};

export function GlassSheet({ children, title, subtitle, style, scroll = false, fullHeight = false, onClose, headerAction }: GlassSheetProps) {
  const theme = usePluggdTheme();
  const body = scroll ? (
    <ScrollView
      style={fullHeight ? styles.fullScroll : undefined}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollBody, fullHeight && styles.fullScrollBody]}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <LiftSurface depth="high" style={fullHeight ? styles.fullLift : undefined}>
      <GlassPanel
        intensity="strong"
        radius={liquidGlassRadii.xxl}
        style={[styles.sheet, fullHeight && styles.fullSheet, style]}
        contentStyle={fullHeight ? styles.fullContent : undefined}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
        {title || onClose ? (
          <View style={styles.titleRow}>
            {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : <View />}
            <View style={styles.headerActions}>
              {headerAction}
              {onClose ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close sheet"
                  hitSlop={6}
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, pressed && styles.closeButtonPressed]}
                >
                  <MaterialIcons name="close" size={23} color={theme.colors.text} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
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
  fullLift: { flex: 1 },
  fullSheet: { flex: 1, maxHeight: '100%' },
  fullContent: { flex: 1 },
  fullScroll: { flex: 1 },
  fullScrollBody: { flexGrow: 1, paddingBottom: 28 },
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
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  closeButtonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
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
