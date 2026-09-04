import { CreatorAccessGate } from '../../components/CreatorAccessGate';
import { StudioBrowserScreen } from '../../src/features/studio/StudioBrowserScreen';

export default function StudioBrowserRoute() {
  return <CreatorAccessGate><StudioBrowserScreen /></CreatorAccessGate>;
}
