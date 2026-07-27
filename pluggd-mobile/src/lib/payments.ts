type DisabledPaymentResult = {
  status: 'disabled';
  message: string;
};

export async function launchPaymentSheet(): Promise<DisabledPaymentResult> {
  return {
    status: 'disabled',
    message:
      'This legacy payment sheet is not used. PLUGGD selects the approved purchase method for each item and storefront.',
  };
}
