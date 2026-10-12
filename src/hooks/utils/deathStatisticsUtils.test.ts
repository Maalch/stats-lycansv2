import { describe, expect, it } from 'vitest';
import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import {
  DEATH_TYPES,
  getDeathTypeCategory,
  getDeathTypeLabel,
  isSystemDeath,
  isValidDeathType,
  requiresKiller,
} from '../../types/deathTypes';
import { extractDeathsFromGame, extractKillsFromGame } from './deathStatisticsUtils';

function makePlayer(overrides: Partial<PlayerStat>): PlayerStat {
  return {
    Username: 'TestPlayer',
    MainRoleInitial: 'Villageois',
    MainRoleChanges: [],
    Power: null,
    SecondaryRole: null,
    DeathDateIrl: null,
    DeathTiming: null,
    DeathPosition: null,
    DeathType: null,
    KillerName: null,
    Victorious: false,
    Votes: [],
    SecondsTalkedOutsideMeeting: 0,
    SecondsTalkedDuringMeeting: 0,
    ...overrides,
  };
}

function makeGame(playerStats: PlayerStat[]): GameLogEntry {
  return {
    Id: 'Ponce-20261006100000',
    DisplayedId: '1',
    StartDate: '2026-10-06T10:00:00Z',
    EndDate: '2026-10-06T10:10:00Z',
    MapName: 'Village',
    HarvestGoal: 0,
    HarvestDone: 0,
    EndTiming: 'M1',
    Version: '0.362',
    Modded: true,
    Clips: [],
    LegacyData: null,
    PlayerStats: playerStats,
    GameEvents: [],
  };
}

describe('VENGEANCE deaths', () => {
  it('is recognized as an event death that does not require a killer', () => {
    expect(isValidDeathType(DEATH_TYPES.VENGEANCE)).toBe(true);
    expect(getDeathTypeLabel(DEATH_TYPES.VENGEANCE)).toBe("Mort liée à l'événement Vengeance");
    expect(getDeathTypeCategory(DEATH_TYPES.VENGEANCE)).toBe('EVENT_DEATHS');
    expect(isSystemDeath(DEATH_TYPES.VENGEANCE)).toBe(true);
    expect(requiresKiller(DEATH_TYPES.VENGEANCE)).toBe(false);
  });

  it('counts the death without attributing it as a player kill', () => {
    const game = makeGame([
      makePlayer({
        ID: 'victim-id',
        Username: 'Victim',
        DeathTiming: 'M1',
        DeathType: DEATH_TYPES.VENGEANCE,
      }),
      makePlayer({ ID: 'killer-id', Username: 'Killer' }),
    ]);

    expect(extractDeathsFromGame(game)).toMatchObject([
      {
        playerId: 'victim-id',
        deathType: DEATH_TYPES.VENGEANCE,
        killerId: null,
        killerName: null,
        killerCamp: null,
      },
    ]);

    const gameWithKillerName = makeGame([
      makePlayer({
        ID: 'victim-id',
        Username: 'Victim',
        DeathTiming: 'M1',
        DeathType: DEATH_TYPES.VENGEANCE,
        KillerName: 'Killer',
      }),
      makePlayer({ ID: 'killer-id', Username: 'Killer' }),
    ]);

    expect(extractKillsFromGame(gameWithKillerName)).toEqual([]);
  });
});
