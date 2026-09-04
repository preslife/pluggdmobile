import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export type GlassDockItem = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  active?: boolean;
  onPress: () => void;
};

type GlassDockProps = {
  items: GlassDockItem[];
  bottomInset?: number;
};

export function GlassDock({ items, bottomInset = 10 }: GlassDockProps) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.wrap}>
      <LiftSurface depth="normal">
        <View style={[styles.dockShell, { height: 60 + bottomInset }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GlassPanel intensity="subtle" radius={liquidGlassRadii.xxl} style={styles.dock} />
          </View>
          <View style={[styles.tabRow, { transform: [{ translateY: bottomInset / 2 }] }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessible
              focusable
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} tab`}
              accessibilityState={{ selected: !!item.active }}
              importantForAccessibility="yes"
              testID={`dock-tab-${item.label.toLowerCase()}`}
              onPress={() => {
                selectionHaptic();
                item.onPress();
              }}
              style={({ pressed }) => [styles.tabPressable, pressed && styles.tabPressed]}
            >
              <View style={styles.tabItem}>
                <View style={styles.iconSlot}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={item.active ? theme.colors.accentText : theme.colors.textMuted}
                  />
                </View>
                <Text
                  style={[styles.tabLabel, { color: item.active ? theme.colors.accentText : theme.colors.textMuted }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {item.label}
                </Text>
                <View style={[styles.activeIndicator, item.active && styles.activeIndicatorOn]} />
              </View>
            </Pressable>
          ))}
          </View>
        </View>
      </LiftSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 5,
    paddingHorizontal: 10,
  },
  dockShell: {
    height: 60,
  },
  dock: {
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.68,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 22 },
  },
  tabRow: {
    height: 60,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  tabPressable: {
    flex: 1,
    height: 54,
  },
  tabPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.86,
  },
  tabItem: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconSlot: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11.5,
    lineHeight: 14,
  },
  activeIndicator: {
    width: 0,
    height: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  activeIndicatorOn: {
    backgroundColor: 'transparent',
  },
});
