import { buildResultSummary, buildEmptyStateCopy, isQueryActive } from '../../lib/searchMessaging';

describe('searchMessaging helpers', () => {
  it('returns prompt summary when query is empty', () => {
    expect(buildResultSummary('   ', 0)).toEqual({ kind: 'prompt' });
    expect(isQueryActive('   ')).toBe(false);
  });

  it('returns empty summary with trimmed query when no results', () => {
    expect(buildResultSummary('  beats ', 0)).toEqual({ kind: 'empty', query: 'beats' });
  });

  it('maps tab-specific empty-state copy', () => {
    expect(buildEmptyStateCopy('music', '  ')).toEqual({ kind: 'default', tab: 'music' });
    expect(buildEmptyStateCopy('beats', '  trap soul ')).toEqual({
      kind: 'query',
      tab: 'beats',
      query: 'trap soul',
    });
    expect(isQueryActive('fan')).toBe(true);
  });
});
