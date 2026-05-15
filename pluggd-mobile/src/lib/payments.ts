type DisabledPaymentResult = {
  status: 'disabled';
  message: string;
};

export async function launchPaymentSheet(): Promise<DisabledPaymentResult> {
  return {
    status: 'disabled',
    message: 'Digital purchases in the iOS app must use PLUGGD credits purchased through Apple IAP.',
  };
}
