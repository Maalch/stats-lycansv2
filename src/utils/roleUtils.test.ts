import { describe, it, expect } from 'vitest';
import { isVillageoisElite } from './roleUtils';
import type { PlayerStat } from '../hooks/useCombinedRawData';

// Minimal valid PlayerStat with sensible defaults, only MainRoleInitial/Power vary per test.
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

describe('isVillageoisElite', () => {
  it('returns true for the new format (MainRoleInitial "Villageois Élite")', () => {
    const player = makePlayer({ MainRoleInitial: 'Villageois Élite', Power: 'Chasseur' });
    expect(isVillageoisElite(player)).toBe(true);
  });

  it.each(['Chasseur', 'Alchimiste'])('returns true for the legacy format (MainRoleInitial "%s")', (role) => {
    const player = makePlayer({ MainRoleInitial: role });
    expect(isVillageoisElite(player)).toBe(true);
  });

  it('returns false for a regular Villageois', () => {
    const player = makePlayer({ MainRoleInitial: 'Villageois' });
    expect(isVillageoisElite(player)).toBe(false);
  });

  it('returns false for a non-elite role such as Loup', () => {
    const player = makePlayer({ MainRoleInitial: 'Loup' });
    expect(isVillageoisElite(player)).toBe(false);
  });
});
