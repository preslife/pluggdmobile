export type SearchTab = "music" | "beats" | "creators";

export type ResultSummary =
  | { kind: "prompt" }
  | { kind: "empty"; query: string }
  | { kind: "results"; query: string; totalResults: number };

export type EmptyStateCopy =
  | { kind: "default"; tab: SearchTab }
  | { kind: "query"; tab: SearchTab; query: string };

export const buildResultSummary = (query: string, totalResults: number): ResultSummary => {
  const trimmed = query.trim();
  if (!trimmed) {
    return { kind: "prompt" };
  }

  if (totalResults === 0) {
    return { kind: "empty", query: trimmed };
  }

  return { kind: "results", query: trimmed, totalResults };
};

export const buildEmptyStateCopy = (tab: SearchTab, query: string): EmptyStateCopy => {
  const trimmed = query.trim();
  if (!trimmed) {
    return { kind: "default", tab };
  }

  return { kind: "query", tab, query: trimmed };
};

export const isQueryActive = (query: string) => query.trim().length > 0;
