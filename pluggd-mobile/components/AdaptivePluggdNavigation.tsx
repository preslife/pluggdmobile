import {
  useAdaptiveNavigationLayout,
  type AdaptiveNavigationMode,
} from '../src/design/adaptiveNavigation';
import { PluggdDock } from './PluggdDock';
import { PluggdTopNavigation } from './PluggdTopNavigation';

/**
 * Shared responsive navigation switch. Existing phone chrome can adopt this
 * one route group at a time without duplicating breakpoint logic.
 */
export function AdaptivePluggdNavigation({ mode }: { mode?: AdaptiveNavigationMode }) {
  const adaptiveLayout = useAdaptiveNavigationLayout();
  const resolvedMode = mode ?? adaptiveLayout.mode;
  return resolvedMode === 'compact' ? (
    <PluggdDock />
  ) : (
    <PluggdTopNavigation widthClass={adaptiveLayout.widthClass} />
  );
}
