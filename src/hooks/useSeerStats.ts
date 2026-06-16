import { useMemo } from 'react';
import { useCombinedFilteredRawData } from './useCombinedRawData';
import { DEATH_TYPES } from '../types/deathTypes';
import { compareVersion } from './utils/dataUtils';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../utils/datasyncExport';
import { getPlayerId } from '../utils/playerIdentification';

const MIN_VERSION = '0.284';

export interface SeerKillerStat {
  player: string;
  playerId: string;
  seerKills: number;
  gamesAsLoup: number;
  killRate: number; // seerKills / gamesAsLoup * 100
  isHighlightedAddition?: boolean;
}

export interface SeerVictimStat {
  player: string;
  playerId: string;
  seerDeaths: number;
  gamesAsVillageois: number;
  deathRate: number; // seerDeaths / gamesAsVillageois * 100
  isHighlightedAddition?: boolean;
}

export interface SeerStatsData {
  killers: SeerKillerStat[];
  victims: SeerVictimStat[];
  eligibleGamesCount: number;
}

export function useSeerStats() {
  const { gameData, isLoading, error } = useCombinedFilteredRawData();

  const data = useMemo<SeerStatsData | null>(() => {
    if (!gameData) return null;

    // Filter games by version >= 0.284
    const eligibleGames = gameData.filter(
      game => compareVersion(game.Version || '0', MIN_VERSION)
    );

    // Maps keyed by player ID
    // Intermediate maps for raw counts + game counts
    const killersRaw = new Map<string, { player: string; playerId: string; seerKills: number; gamesAsLoup: number }>();
    const victimsRaw = new Map<string, { player: string; playerId: string; seerDeaths: number; gamesAsVillageois: number }>();

    for (const game of eligibleGames) {
      for (const player of game.PlayerStats) {
        const finalRole = getPlayerFinalRole(
          player.MainRoleInitial,
          player.MainRoleChanges || []
        );
        const camp = getPlayerCampFromRole(finalRole, { regroupWolfSubRoles: true, regroupVillagers: true }, player.Power);
        const playerId = getPlayerId(player);
        const playerName = player.Username;

        // --- Track games as Villageois and SEER deaths ---
        if (camp === 'Villageois') {
          const existing = victimsRaw.get(playerId);
          if (existing) {
            existing.gamesAsVillageois++;
            if (player.DeathType === DEATH_TYPES.SEER) existing.seerDeaths++;
          } else {
            victimsRaw.set(playerId, {
              player: playerName,
              playerId,
              seerDeaths: player.DeathType === DEATH_TYPES.SEER ? 1 : 0,
              gamesAsVillageois: 1,
            });
          }
        }

        // --- Track games as Loup (for denominator of kill rate) ---
        if (camp === 'Loup') {
          const existing = killersRaw.get(playerId);
          if (existing) {
            existing.gamesAsLoup++;
          } else {
            killersRaw.set(playerId, {
              player: playerName,
              playerId,
              seerKills: 0,
              gamesAsLoup: 1,
            });
          }
        }
      }

      // --- Kill chart: find who caused SEER deaths and is in Loup camp ---
      for (const victim of game.PlayerStats) {
        if (victim.DeathType !== DEATH_TYPES.SEER || !victim.KillerName) continue;

        // Find the killer in the same game
        const killerStat = game.PlayerStats.find(
          p => p.Username === victim.KillerName
        );
        if (!killerStat) continue;

        const killerFinalRole = getPlayerFinalRole(
          killerStat.MainRoleInitial,
          killerStat.MainRoleChanges || []
        );
        const killerCamp = getPlayerCampFromRole(
          killerFinalRole,
          { regroupWolfSubRoles: true, regroupVillagers: true },
          killerStat.Power
        );

        if (killerCamp !== 'Loup') continue;

        const killerId = getPlayerId(killerStat);
        const existing = killersRaw.get(killerId);
        if (existing) {
          existing.seerKills++;
        }
        // (gamesAsLoup entry was already created in the per-player loop above)
      }
    }

    // Build final arrays with rates, keeping only players who have at least 1 kill/death
    const killers: SeerKillerStat[] = Array.from(killersRaw.values())
      .filter(k => k.seerKills > 0)
      .map(k => ({
        player: k.player,
        playerId: k.playerId,
        seerKills: k.seerKills,
        gamesAsLoup: k.gamesAsLoup,
        killRate: k.gamesAsLoup > 0 ? (k.seerKills / k.gamesAsLoup) * 100 : 0,
      }));

    const victims: SeerVictimStat[] = Array.from(victimsRaw.values())
      .filter(v => v.seerDeaths > 0)
      .map(v => ({
        player: v.player,
        playerId: v.playerId,
        seerDeaths: v.seerDeaths,
        gamesAsVillageois: v.gamesAsVillageois,
        deathRate: v.gamesAsVillageois > 0 ? (v.seerDeaths / v.gamesAsVillageois) * 100 : 0,
      }));

    return {
      killers,
      victims,
      eligibleGamesCount: eligibleGames.length,
    };
  }, [gameData]);

  return { data, isLoading, error };
}
