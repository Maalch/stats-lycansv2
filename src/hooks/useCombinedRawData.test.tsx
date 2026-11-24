import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../context/SettingsContext';
import { useCombinedFilteredRawData, useFilteredGameLogData, useFilteredGameLogDataAllTypes } from './useCombinedRawData';
import { useFilteredRawBRData, useFilteredMiniBRGlobalData } from './useRawBRData';
import type { GameLogEntry } from './useCombinedRawData';

const makeGame = (id: string, start: number, modded: boolean): GameLogEntry => ({
  Id: id,
  DisplayedId: id,
  StartDate: new Date(start).toISOString(),
  EndDate: new Date(start + 1000).toISOString(),
  MapName: 'Village',
  HarvestGoal: 0,
  HarvestDone: 0,
  EndTiming: null,
  Version: '1',
  Modded: modded,
  Clips: [],
  LegacyData: null,
  PlayerStats: [],
  GameEvents: [],
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/?dateRangeEnabled=true&currentSession=true&gameTypeEnabled=true&gameFilter=modded&dateStart=2020-01-01&dateEnd=2020-01-02');
});

afterEach(() => vi.unstubAllGlobals());

describe('current session game filtering', () => {
  it('filters game log views and excludes BR records without a start time', async () => {
    const now = Date.now();
    const games = [
      makeGame('test-20261124010000', now - 13 * 60 * 60 * 1000, true),
      makeGame('test-20261124020000', now - 60 * 60 * 1000, true),
      makeGame('test-20261124030000', now - 60 * 60 * 1000, false),
      makeGame('test-20261124040000', now + 60 * 60 * 1000, true),
    ];
    const brData = {
      BRParties: { data: [{ Game: 1, Participants: 'Player', Score: 1, Gagnant: true }] },
      BRRefParties: { data: [{ Game: 1, Date: '24/11/2026', 'Game Moddée': true, 'Nombre de participants': 3 }] },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => url.includes('joueurs.json')
        ? { Players: [] }
        : url.includes('rawBRData.json')
          ? brData
          : { GameStats: games },
    })));

    const { result } = renderHook(() => ({
      combined: useCombinedFilteredRawData(),
      games: useFilteredGameLogData(),
      allTypes: useFilteredGameLogDataAllTypes(),
      br: useFilteredRawBRData(),
      miniBR: useFilteredMiniBRGlobalData(),
    }), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.combined.isLoading || result.current.games.isLoading || result.current.allTypes.isLoading || result.current.br.isLoading || result.current.miniBR.isLoading).toBe(false));
    expect(result.current.combined.gameData?.map(game => game.Id)).toEqual([games[1].Id]);
    expect(result.current.games.data?.map(game => game.Id)).toEqual([games[1].Id]);
    expect(result.current.allTypes.data?.map(game => game.Id)).toEqual([games[1].Id, games[2].Id]);
    expect(result.current.combined.brPartiesData).toEqual([]);
    expect(result.current.combined.brRefPartiesData).toEqual([]);
    expect(result.current.br.data).toEqual([]);
    expect(result.current.miniBR.data).toEqual([]);
  });
});
