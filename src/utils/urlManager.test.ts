import { describe, it, expect, beforeEach } from 'vitest';
import { parseUrlState, buildUrlSearch, pushUrlState, replaceUrlState } from './urlManager';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('parseUrlState', () => {
  it('returns an empty state when there are no search params', () => {
    expect(parseUrlState()).toEqual({});
  });

  it('parses known params, decoding booleans and leaving strings as-is', () => {
    window.history.replaceState({}, '', '/?tab=rankings&gameTypeEnabled=true&gameFilter=modded');
    expect(parseUrlState()).toEqual({
      tab: 'rankings',
      gameTypeEnabled: true,
      gameFilter: 'modded',
    });
  });

  it('ignores unknown params', () => {
    window.history.replaceState({}, '', '/?unknownParam=foo&tab=general');
    expect(parseUrlState()).toEqual({ tab: 'general' });
  });
});

describe('buildUrlSearch', () => {
  it('omits default/falsy values', () => {
    expect(buildUrlSearch({ gameTypeEnabled: false, gameFilter: 'all' })).toBe('');
  });

  it('includes enabled filters and their dependent values', () => {
    const search = buildUrlSearch({ gameTypeEnabled: true, gameFilter: 'modded', tab: 'rankings' });
    const params = new URLSearchParams(search);
    expect(params.get('gameTypeEnabled')).toBe('true');
    expect(params.get('gameFilter')).toBe('modded');
    expect(params.get('tab')).toBe('rankings');
  });
});

describe('pushUrlState / replaceUrlState', () => {
  it('pushUrlState updates the URL and creates a history entry', () => {
    pushUrlState({ tab: 'general' });
    expect(window.location.search).toBe('?tab=general');
  });

  it('replaceUrlState updates the URL without a query string when state is empty', () => {
    window.history.replaceState({}, '', '/?tab=general');
    replaceUrlState({});
    expect(window.location.search).toBe('');
  });

  it('round-trips through parseUrlState', () => {
    pushUrlState({ tab: 'general', subtab: 'evolution' });
    expect(parseUrlState()).toEqual({ tab: 'general', subtab: 'evolution' });
  });
});
