export interface CollaborationBudgetSample {
  budget_range?: string | null;
  genre?: string | null;
}

export interface BudgetStats {
  min: number;
  max: number;
  currencySymbol: string;
}

export interface BudgetBenchmarks {
  perGenre: Record<string, BudgetStats>;
  global?: BudgetStats;
}

const currencyCodes: Record<string, string> = {
  '£': 'GBP',
  '$': 'USD',
  '€': 'EUR',
  '¥': 'JPY',
};

const normaliseGenreKey = (genre?: string | null) => genre?.trim().toLowerCase() ?? 'general';

export const parseBudgetRange = (value?: string | null): BudgetStats | null => {
  if (!value) return null;
  const matches = value.match(/[\d.,]+/g);
  if (!matches || matches.length === 0) return null;

  const parseNumber = (segment: string) => Number(segment.replace(/,/g, ''));

  const min = parseNumber(matches[0]);
  const max = matches[1] ? parseNumber(matches[1]) : min;

  if (Number.isNaN(min) || Number.isNaN(max)) {
    return null;
  }

  const symbolMatch = value.trim().match(/^[^\d-]+/);
  const currencySymbol = symbolMatch?.[0]?.trim()?.charAt(0) ?? '£';

  return {
    min,
    max,
    currencySymbol,
  };
};

export const formatBudgetEstimate = (stats?: BudgetStats | null): string | null => {
  if (!stats) return null;
  const currencyCode = currencyCodes[stats.currencySymbol] ?? 'USD';
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  });

  const formattedMin = formatter.format(stats.min);
  const formattedMax = formatter.format(stats.max);

  if (Math.abs(stats.max - stats.min) < 1) {
    return formattedMin;
  }

  return `${formattedMin}–${formattedMax}`;
};

export const buildBudgetBenchmarks = (projects: CollaborationBudgetSample[]): BudgetBenchmarks => {
  const perGenreAggregates: Record<string, { minTotal: number; maxTotal: number; count: number; currencySymbol: string }> = {};
  let globalMinTotal = 0;
  let globalMaxTotal = 0;
  let globalCount = 0;
  let globalCurrencySymbol = '£';

  projects.forEach((project) => {
    const parsed = parseBudgetRange(project.budget_range);
    if (!parsed) return;

    const genreKey = normaliseGenreKey(project.genre);
    const aggregate = perGenreAggregates[genreKey] ?? {
      minTotal: 0,
      maxTotal: 0,
      count: 0,
      currencySymbol: parsed.currencySymbol,
    };

    aggregate.minTotal += parsed.min;
    aggregate.maxTotal += parsed.max;
    aggregate.count += 1;
    if (aggregate.count === 1 || aggregate.currencySymbol === parsed.currencySymbol) {
      aggregate.currencySymbol = parsed.currencySymbol;
    }

    perGenreAggregates[genreKey] = aggregate;

    globalMinTotal += parsed.min;
    globalMaxTotal += parsed.max;
    globalCount += 1;
    if (globalCount === 1 || globalCurrencySymbol === parsed.currencySymbol) {
      globalCurrencySymbol = parsed.currencySymbol;
    }
  });

  const perGenre: Record<string, BudgetStats> = Object.entries(perGenreAggregates).reduce((acc, [genre, aggregate]) => {
    acc[genre] = {
      min: aggregate.minTotal / aggregate.count,
      max: aggregate.maxTotal / aggregate.count,
      currencySymbol: aggregate.currencySymbol,
    };
    return acc;
  }, {} as Record<string, BudgetStats>);

  const global = globalCount > 0
    ? {
        min: globalMinTotal / globalCount,
        max: globalMaxTotal / globalCount,
        currencySymbol: globalCurrencySymbol,
      }
    : undefined;

  return { perGenre, global };
};

export const estimateBudgetForProject = (
  benchmarks: BudgetBenchmarks,
  project: CollaborationBudgetSample,
): string | null => {
  const genreKey = normaliseGenreKey(project.genre);
  const stats = benchmarks.perGenre[genreKey] ?? benchmarks.global;
  return formatBudgetEstimate(stats);
};
