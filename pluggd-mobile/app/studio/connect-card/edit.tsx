import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import { StudioConnectCardEditorScreen } from '../../../src/features/studio/StudioConnectCardEditorScreen';

export default function StudioConnectCardEditRoute() {
  return <CreatorAccessGate><StudioConnectCardEditorScreen /></CreatorAccessGate>;
}
