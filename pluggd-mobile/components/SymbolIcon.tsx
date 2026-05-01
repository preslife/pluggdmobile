import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  type OpaqueColorValue,
  type StyleProp,
  type TextStyle,
  useColorScheme,
} from 'react-native';

const SYMBOL_NAME_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  database: 'storage',
  ios: 'apple',
  trophy: 'emoji-events',
};

const COLOR_MAP: Record<string, string> = {
  primary: '#FF5200',
  white: '#FFFFFF',
  black: '#000000',
  'background-dark': '#080808',
  'text-secondary': '#9B9B9B',
  'slate-900': '#0F172A',
  'slate-800': '#1E293B',
  'slate-700': '#334155',
  'slate-600': '#475569',
  'slate-500': '#64748B',
  'slate-400': '#94A3B8',
  'gray-700': '#374151',
  'gray-600': '#4B5563',
  'gray-500': '#6B7280',
  'gray-400': '#9CA3AF',
  'zinc-700': '#3F3F46',
  'zinc-600': '#52525B',
  'zinc-500': '#71717A',
  'zinc-400': '#A1A1AA',
  'stone-500': '#78716C',
  'stone-400': '#A8A29E',
  'blue-400': '#60A5FA',
  'blue-500': '#3B82F6',
  'green-500': '#22C55E',
};

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

const SPACING_MAP: Record<string, number> = {
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
};

type SymbolIconProps = {
  name: string;
  className?: string;
  color?: string | OpaqueColorValue;
  size?: number;
  style?: StyleProp<TextStyle>;
};

function normalizeSymbolName(name: string): keyof typeof MaterialIcons.glyphMap {
  const mapped = SYMBOL_NAME_MAP[name];
  if (mapped) return mapped;

  const hyphenated = name.replace(/_/g, '-');
  if (hyphenated in MaterialIcons.glyphMap) {
    return hyphenated as keyof typeof MaterialIcons.glyphMap;
  }

  if (name in MaterialIcons.glyphMap) {
    return name as keyof typeof MaterialIcons.glyphMap;
  }

  return 'help-outline';
}

function opacityColor(base: string, opacity: string) {
  const alpha = Number(opacity) / 100;
  if (base === 'white') return `rgba(255,255,255,${alpha})`;
  if (base === 'black') return `rgba(0,0,0,${alpha})`;
  const hex = COLOR_MAP[base];
  if (!hex?.startsWith('#') || hex.length !== 7) return hex;

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function spacingValue(token: string) {
  const negative = token.startsWith('-');
  const key = negative ? token.slice(1) : token;
  const value = SPACING_MAP[key];
  return value == null ? undefined : negative ? -value : value;
}

function styleFromClassName(className: string | undefined, colorScheme: 'light' | 'dark' | null | undefined) {
  if (!className) return {};

  const style: TextStyle = {};

  for (const rawToken of className.split(/\s+/).filter(Boolean)) {
    let token = rawToken;

    if (token.startsWith('dark:')) {
      if (colorScheme !== 'dark') continue;
      token = token.slice(5);
    } else if (token.startsWith('light:')) {
      if (colorScheme !== 'light') continue;
      token = token.slice(6);
    }

    if (token === 'absolute') {
      style.position = 'absolute';
      continue;
    }

    const textSize = token.match(/^text-\[(\d+)px\]$/);
    if (textSize) {
      style.fontSize = Number(textSize[1]);
      continue;
    }

    const textColor = token.match(/^text-\[#([0-9A-Fa-f]{6})\]$/);
    if (textColor) {
      style.color = `#${textColor[1]}`;
      continue;
    }

    if (token.startsWith('text-')) {
      const value = token.slice(5);
      if (FONT_SIZE_MAP[value]) {
        style.fontSize = FONT_SIZE_MAP[value];
        continue;
      }

      const [colorKey, opacity] = value.split('/');
      const color = opacity ? opacityColor(colorKey, opacity) : COLOR_MAP[colorKey];
      if (color) {
        style.color = color;
      }
      continue;
    }

    const spacing = token.match(/^(-?)(top|right|bottom|left|mr|ml|mt|mb)-(.+)$/);
    if (spacing) {
      const [, negative, prop, valueToken] = spacing;
      const value = spacingValue(`${negative}${valueToken}`);
      if (value == null) continue;
      if (prop === 'mr') style.marginRight = value;
      if (prop === 'ml') style.marginLeft = value;
      if (prop === 'mt') style.marginTop = value;
      if (prop === 'mb') style.marginBottom = value;
      if (prop === 'top') style.top = value;
      if (prop === 'right') style.right = value;
      if (prop === 'bottom') style.bottom = value;
      if (prop === 'left') style.left = value;
    }
  }

  return style;
}

export function SymbolIcon({ name, className, color, size, style }: SymbolIconProps) {
  const colorScheme = useColorScheme();
  const classStyle = useMemo(
    () => styleFromClassName(className, colorScheme),
    [className, colorScheme],
  );

  return (
    <MaterialIcons
      accessibilityElementsHidden
      importantForAccessibility="no"
      name={normalizeSymbolName(String(name))}
      size={size ?? classStyle.fontSize ?? 20}
      color={color ?? classStyle.color ?? '#FFFFFF'}
      style={[classStyle, style]}
    />
  );
}
