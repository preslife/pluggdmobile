import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';

type GlassPillTabsProps<T extends string> = {
  value: T;
  items: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function GlassPillTabs<T extends string>({ value, items, onChange }: GlassPillTabsProps<T>) {
  return (
    <GlassPanel intensity="subtle" radius={liquidGlassRadii.xl} style={styles.wrap} contentStyle={styles.panelContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPress={() => {
                selectionHaptic();
                onChange(item.value);
              }}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  panelContent: {
    maxWidth: '100%',
  },
  row: {
    padding: 3,
    gap: 3,
  },
  tab: {
    minHeight: 34,
    borderRadius: liquidGlassRadii.pill,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.085)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderTop,
  },
  tabPressed: {
    transform: [{ scale: 0.985 }],
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  labelActive: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Bold',
  },
  labelInactive: {
    color: liquidGlassColors.textMuted,
  },
});
