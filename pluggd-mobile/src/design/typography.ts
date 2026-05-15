import { StyleSheet, Text, TextInput } from 'react-native';

export const pluggdFonts = {
  heading: 'Neue Montreal',
  body: 'Neue Haas Grotesk',
  campaign: 'ABC Diatype Monument',
  fallback: 'System',
} as const;

const HEADING_KEY = /(title|heading|headline|display|hero|section|header|name|wordmark|brand)/i;
const CAMPAIGN_KEY = /(campaign|poster|limited|ticket|badge|kicker|eyebrow|drop|countdown|cta)/i;
const BODY_KEY = /(body|copy|subtitle|meta|caption|label|text|input|value|description|message|comment|note|pill|chip)/i;

type StyleRecord = Record<string, any>;

let configured = false;
let originalCreate: typeof StyleSheet.create | null = null;

function isTextStyle(style: unknown) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return false;
  const value = style as StyleRecord;
  return (
    value.fontSize != null ||
    value.fontWeight != null ||
    value.lineHeight != null ||
    value.letterSpacing != null ||
    value.textTransform != null ||
    value.fontVariant != null ||
    value.includeFontPadding != null
  );
}

function fontForStyleKey(key: string) {
  if (CAMPAIGN_KEY.test(key)) return pluggdFonts.campaign;
  if (HEADING_KEY.test(key)) return pluggdFonts.heading;
  if (BODY_KEY.test(key)) return pluggdFonts.body;
  return pluggdFonts.body;
}

function applyTypography<T extends StyleRecord>(styles: T): T {
  const next: StyleRecord = {};

  for (const [key, style] of Object.entries(styles)) {
    if (!isTextStyle(style) || style.fontFamily) {
      next[key] = style;
      continue;
    }

    next[key] = {
      ...style,
      fontFamily: fontForStyleKey(key),
    };
  }

  return next as T;
}

export function configurePluggdTypography() {
  if (configured) return;
  configured = true;

  const textDefaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps = {
    ...textDefaultProps,
    style: [textDefaultProps.style, { fontFamily: pluggdFonts.body }],
  };

  const inputDefaultProps = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps = {
    ...inputDefaultProps,
    style: [inputDefaultProps.style, { fontFamily: pluggdFonts.body }],
  };

  originalCreate = originalCreate ?? StyleSheet.create.bind(StyleSheet);
  (StyleSheet as any).create = function createWithPluggdTypography<T extends StyleRecord>(styles: T): T {
    return originalCreate?.(applyTypography(styles)) ?? styles;
  };
}

configurePluggdTypography();
