import { LegalReaderScreen } from '../../src/features/legal/LegalReaderScreen';
import { PRIVACY_DOCUMENT } from '../../src/features/legal/legalContent';

export default function PrivacyRoute() {
  return <LegalReaderScreen document={PRIVACY_DOCUMENT} />;
}
