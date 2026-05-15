# PLUGGD iOS Typography

## Target Families

- Headings: `Neue Montreal`
- Body/UI copy: `Neue Haas Grotesk`
- Campaigns, posters, limited drops, ticket/badge-style labels: `ABC Diatype Monument`

## Implementation

Typography is centralized in:

- `src/design/typography.ts`
- `src/design/tokens.ts`

The app now applies typography globally by:

- setting default body font family for `Text` and `TextInput`
- patching `StyleSheet.create` to assign font families to text style keys
- adding `pluggdTypography.fonts` for explicit component usage

## Font Files

The requested font files are not currently present in the repository or local Downloads folder. Because these are commercial/licensed fonts, they should be added manually by the account owner.

Recommended local bundle path:

```text
assets/fonts/
  NeueMontreal-Regular.otf
  NeueMontreal-Medium.otf
  NeueMontreal-Bold.otf
  NeueHaasGroteskText-Regular.otf
  NeueHaasGroteskText-Medium.otf
  NeueHaasGroteskText-Bold.otf
  ABCDiatypeMonument-Regular.otf
  ABCDiatypeMonument-Bold.otf
```

After the licensed files are added, update `src/design/typography.ts` to load the exact file names with `expo-font` and adjust the family names if the font metadata exposes different internal names.
