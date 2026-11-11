import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import { SplitHostScreen } from '../../../src/features/studio/splitSessionScreens';
export default function SplitHostRoute() {
  return <CreatorAccessGate><SplitHostScreen /></CreatorAccessGate>;
}
