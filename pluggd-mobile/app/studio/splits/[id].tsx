import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import { SplitAgreementScreen } from '../../../src/features/studio/SplitEngineScreens';

export default function StudioSplitAgreementRoute() {
  return <CreatorAccessGate><SplitAgreementScreen /></CreatorAccessGate>;
}
