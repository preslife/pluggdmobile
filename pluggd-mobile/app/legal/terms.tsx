import { LegalReaderScreen } from '../../src/features/legal/LegalReaderScreen';
import { TERMS_DOCUMENT } from '../../src/features/legal/legalContent';

export default function TermsRoute() {
  return <LegalReaderScreen document={TERMS_DOCUMENT} />;
}
