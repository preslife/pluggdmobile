import { createContext, useContext } from "react";
import type { LabelMembership } from "@/hooks/useLabelMemberships";

type StudioMode = "personal" | "label";

export interface StudioContextValue {
  mode: StudioMode;
  activeLabel: LabelMembership | null;
  memberships: LabelMembership[];
  labelsLoading: boolean;
  setMode: (mode: StudioMode) => void;
  setActiveLabelId: (labelId: string | null) => void;
  refreshLabels: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

export function useStudioContext(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudioContext must be used within a StudioContext provider");
  }
  return ctx;
}

export function useOptionalStudioContext(): StudioContextValue | undefined {
  return useContext(StudioContext);
}

export { StudioContext };
