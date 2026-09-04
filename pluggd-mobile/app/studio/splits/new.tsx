import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import { SplitCreateScreen } from '../../../src/features/studio/SplitEngineScreens';

export default function StudioSplitCreateRoute() {
  return <CreatorAccessGate><SplitCreateScreen /></CreatorAccessGate>;
}
