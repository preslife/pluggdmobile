// Compatibility exports keep the submitted iOS provider wiring untouched while
// the implementation now owns one provider-neutral App Store / Google Play
// connection. New code should use StoreBillingProvider/useStoreBilling directly.
export {
  StoreBillingProvider as StoreKitProvider,
  useStoreBilling as useStoreKit,
} from './StoreBillingProvider';
