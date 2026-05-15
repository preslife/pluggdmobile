import { SimpleContextScreen } from '../src/features/culture/CultureScreens';

export default function PurchasesScreen() {
  return (
    <SimpleContextScreen
      title="Purchases"
      subtitle="Your unlocked PLUGGD releases, assets and event purchases."
      icon="shopping-bag"
      body="Purchased releases, tickets, unlocks and platform-native purchases will appear here when backed by your account data."
    />
  );
}
