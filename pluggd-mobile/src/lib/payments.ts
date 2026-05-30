type DisabledPaymentResult = {
  status: 'disabled';
  message: string;
};

export async function launchPaymentSheet(): Promise<DisabledPaymentResult> {
  return {
    status: 'disabled',
    message: 'Add PLUGGD credits in Wallet, then return to unlock eligible items.',
  };
}
