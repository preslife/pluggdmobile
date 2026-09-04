import { Stack } from "expo-router";
import { usePluggdTheme } from "../../../src/design/usePluggdTheme";

export default function LiveLayout() {
  const theme = usePluggdTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
