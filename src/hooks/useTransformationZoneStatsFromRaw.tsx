import { useGameStatsBase } from './utils/baseStatsHook';
import { adjustCoordinatesForMap } from './utils/deathLocationUtils';
import { getPlayerCampFromRole } from '../utils/datasyncExport';
import type { GameLogEntry } from './useCombinedRawData';

/**
 * Village map zones (same boundaries as PlayerHistoryDeathMap)
 */
type VillageZone = 'Village Principal' | 'Ferme' | 'Village Pêcheur' | 'Ruines' | 'Reste de la Carte';

const VILLAGE_ZONES: VillageZone[] = [
  'Village Principal',
  'Ferme',
  'Village Pêcheur',
  'Ruines',
  'Reste de la Carte',
];

function getVillageZone(adjustedX: number, adjustedZ: number): VillageZone {
  if (adjustedZ >= -250 && adjustedZ <= 100 && adjustedX >= -450 && adjustedX <= -120) {
    return 'Village Principal';
  }
  if (adjustedZ >= -550 && adjustedZ <= -250 && adjustedX >= -150 && adjustedX <= 150) {
    return 'Ferme';
  }
  if (adjustedZ >= 150 && adjustedZ <= 500 && adjustedX >= -320 && adjustedX <= 80) {
    return 'Village Pêcheur';
  }
  if (adjustedZ >= -220 && adjustedZ <= 200 && adjustedX >= 100 && adjustedX <= 450) {
    return 'Ruines';
  }
  return 'Reste de la Carte';
}

export interface ZoneTransformStats {
  zone: VillageZone;
  transformCount: number;
  percentage: number;
  /** Average kills per game for wolves who transformed in this zone */
  avgKills: number;
  /** Total kill-events associated with transforms in this zone */
  totalKills: number;
  /** Number of (player × game) transform events in this zone */
  sampleSize: number;
  /** Win rate of the Loup camp, weighted by transform events in this zone (0–100) */
  wolfWinRate: number;
  /** Number of transform events in this zone where the Loup camp won */
  wolfWinCount: number;
}

export interface TransformationZoneStatsData {
  zoneStats: ZoneTransformStats[];
  totalTransformations: number;
}

function computeTransformationZoneStats(
  gameData: GameLogEntry[]
): TransformationZoneStatsData | null {
  if (!gameData || gameData.length === 0) return null;

  // Zone accumulators
  const transformCounts: Record<VillageZone, number> = {
    'Village Principal': 0,
    'Ferme': 0,
    'Village Pêcheur': 0,
    'Ruines': 0,
    'Reste de la Carte': 0,
  };

  // For kill averages: each transform event (player, game) contributes the kills
  // that player made in that game. Multiple transforms by the same player in a game
  // each count as a separate data point.
  const killSums: Record<VillageZone, number> = {
    'Village Principal': 0,
    'Ferme': 0,
    'Village Pêcheur': 0,
    'Ruines': 0,
    'Reste de la Carte': 0,
  };
  const killSampleSizes: Record<VillageZone, number> = {
    'Village Principal': 0,
    'Ferme': 0,
    'Village Pêcheur': 0,
    'Ruines': 0,
    'Reste de la Carte': 0,
  };
  // For wolf win rate: each transform event contributes 1 win or 0
  const wolfWinCounts: Record<VillageZone, number> = {
    'Village Principal': 0,
    'Ferme': 0,
    'Village Pêcheur': 0,
    'Ruines': 0,
    'Reste de la Carte': 0,
  };

  for (const game of gameData) {
    if (game.MapName !== 'Village') continue;

    for (const player of game.PlayerStats) {
      // Only Loup-camp players (Loup, Traître, Louveteau, Amoureux Loup)
      const camp = getPlayerCampFromRole(player.MainRoleInitial, {
        regroupLovers: false,
        regroupVillagers: true,
        regroupWolfSubRoles: true,
      });
      const isWolf = camp === 'Loup' || player.MainRoleInitial === 'Amoureux Loup';
      if (!isWolf) continue;

      if (!player.Actions || !Array.isArray(player.Actions)) continue;

      const transformActions = player.Actions.filter(
        a => a.ActionType === 'Transform' && a.Position
      );
      if (transformActions.length === 0) continue;

      // Count kills this player made in this game
      const playerKills = game.PlayerStats.filter(
        victim => victim.KillerName?.toLowerCase() === player.Username.toLowerCase()
      ).length;

      const playerWon = player.Victorious ? 1 : 0;

      for (const action of transformActions) {
        const adjusted = adjustCoordinatesForMap(
          action.Position!.x,
          action.Position!.z,
          'Village'
        );
        const zone = getVillageZone(adjusted.x, adjusted.z);
        transformCounts[zone]++;
        killSums[zone] += playerKills;
        killSampleSizes[zone]++;
        wolfWinCounts[zone] += playerWon;
      }
    }
  }

  const totalTransformations = VILLAGE_ZONES.reduce(
    (sum, z) => sum + transformCounts[z],
    0
  );

  const zoneStats: ZoneTransformStats[] = VILLAGE_ZONES.map(zone => ({
    zone,
    transformCount: transformCounts[zone],
    percentage:
      totalTransformations > 0
        ? (transformCounts[zone] / totalTransformations) * 100
        : 0,
    avgKills:
      killSampleSizes[zone] > 0 ? killSums[zone] / killSampleSizes[zone] : 0,
    totalKills: killSums[zone],
    sampleSize: killSampleSizes[zone],
    wolfWinRate:
      killSampleSizes[zone] > 0
        ? (wolfWinCounts[zone] / killSampleSizes[zone]) * 100
        : 0,
    wolfWinCount: wolfWinCounts[zone],
  }));

  return { zoneStats, totalTransformations };
}

export function useTransformationZoneStatsFromRaw() {
  return useGameStatsBase(computeTransformationZoneStats);
}
