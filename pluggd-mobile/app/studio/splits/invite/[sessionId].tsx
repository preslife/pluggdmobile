import { CreatorAccessGate } from '../../../../components/CreatorAccessGate';
import { SplitHostInvitationScreen } from '../../../../src/features/studio/splitSessionScreens';
export default function SplitInvitationRoute() {
  return <CreatorAccessGate><SplitHostInvitationScreen /></CreatorAccessGate>;
}
