import type { GameLogEntry, PlayerStat, Action } from './useCombinedRawData';
import { useGameStatsBase } from './utils/baseStatsHook';
import {
  parseTimingPhase,
  getPlayerCamp,
  getFirstActionOfType,
} from '../utils/actionMetaUtils';
import { getEffectCategory } from './utils/potionScrollStatsUtils';

const PARCHEMIN_REGEX = /^Parchemin \((.+)\)$/;

// Pre-calculated stats for a camp filter group
export interface AggregatedCampStats {
  uses: number;
  wins: number;
  winRate: number;
  baselineWinRate: number;
  delta: number;
}

// Gadget/Potion/Accessory win rate statistics
export interface ActionItemStats {
  itemName: string;
  actionType: 'UseGadget' | 'DrinkPotion' | 'TakeAccessory';
  totalUses: number;
  winRate: number;
  wins: number;
  losses: number;
  baselineWinRate: number;
  delta: number; // Difference from baseline
  campBreakdown: {
    camp: string;
    winRate: number;
    uses: number;
    wins: number;
    delta: number;
  }[];
  // Pre-calculated aggregated stats for common filter groups
  aggregatedCampStats: {
    villageois: AggregatedCampStats;
    loups: AggregatedCampStats;
    autres: AggregatedCampStats;
  };
}

// Wolf transformation timing statistics
export interface WolfTransformTimingStats {
  timing: string; // "N1", "N2", "N3+"
  gamesCount: number;
  wins: number;
  losses: number;
  winRate: number;
}

// Wolf untransform count statistics
export interface WolfUntransformStats {
  untransformCount: string; // "0", "1", "2", "3+"
  wolfCount: number;
  wins: number;
  losses: number;
  winRate: number;
  baselineWinRate: number;
  delta: number;
}

// Power usage timing statistics
export interface PowerUsageStats {
  powerName: string;
  totalUses: number;
  averageTiming: number; // Average phase number when used
  winRate: number;
  earlyUseWinRate: number; // Used in N1-N2
  lateUseWinRate: number; // Used in N3+
}

export interface ParcheminItemStats extends ActionItemStats {
  effectCategory: 'positive' | 'neutral' | 'negative' | null;
  effectName: string;
}

// Hunter shoot meta statistics
export interface HunterShootMetaStats {
  totalShots: number;
  successfulShots: number;
  missedShots: number;
  accuracy: number;
  totalHunterGames: number;
  hunterWins: number;
  hunterWinRate: number;
  winRateWhenHit: number;
  winRateWhenMiss: number;
  hitsCount: number;
  missesCount: number;
  targetCampStats: {
    camp: string;
    count: number;
    wins: number;
    winRate: number;
    delta: number;
  }[];
}

export interface ActionMetaStatsData {
  gadgetStats: ActionItemStats[];
  potionStats: ActionItemStats[];
  accessoryStats: ActionItemStats[];
  parcheminStats: ParcheminItemStats[];
  wolfTransformTiming: WolfTransformTimingStats[];
  wolfUntransformStats: WolfUntransformStats[];
  powerUsageStats: PowerUsageStats[];
  hunterShootStats: HunterShootMetaStats;
  overallStats: {
    totalGamesAnalyzed: number;
    totalActionsRecorded: number;
    averageActionsPerGame: number;
    gamesWithActions: number;
  };
}

function computeActionMetaStats(gameData: GameLogEntry[]): ActionMetaStatsData {
  // Filter for modded games only (actions are only in modded games)
  const moddedGames = gameData.filter(g => g.Modded);

  // Track all gadgets, potions, accessories, and parchemins
  const gadgetUsageMap = new Map<string, { uses: number; wins: number; camp: Map<string, { uses: number; wins: number }> }>();
  const potionUsageMap = new Map<string, { uses: number; wins: number; camp: Map<string, { uses: number; wins: number }> }>();
  const accessoryUsageMap = new Map<string, { uses: number; wins: number; camp: Map<string, { uses: number; wins: number }> }>();
  const parcheminUsageMap = new Map<string, { uses: number; wins: number; camp: Map<string, { uses: number; wins: number }> }>();

  // Track wolf transformation timing
  const transformTimingMap = new Map<string, { games: number; wins: number }>();

  // Track wolf untransform counts per wolf player per game (bucket: 0, 1, 2, 3+)
  const untransformBucketMap = new Map<string, { count: number; wins: number }>();

  // Track power usage
  const powerUsageMap = new Map<string, { 
    uses: number; 
    wins: number; 
    timings: number[]; 
    earlyUses: number; 
    earlyWins: number; 
    lateUses: number; 
    lateWins: number;
  }>();

  // Track hunter shoot stats
  let hunterTotalShots = 0;
  let hunterSuccessfulShots = 0;
  let hunterTotalGames = 0;
  let hunterWins = 0;
  let hunterHitWins = 0;
  let hunterHitCount = 0;
  let hunterMissWins = 0;
  let hunterMissCount = 0;
  const hunterTargetCampMap = new Map<string, { count: number; wins: number }>();

  let totalActions = 0;
  let gamesWithActions = 0;

  // Process each game
  moddedGames.forEach((game: GameLogEntry) => {
    let gameHasActions = false;

    game.PlayerStats.forEach((player: PlayerStat) => {
      const playerCamp = getPlayerCamp(player);
      const playerWon = player.Victorious;
      const actions = player.Actions || [];
      
      if (actions.length > 0) {
        gameHasActions = true;
        totalActions += actions.length;
      }

      // Track gadgets (excluding parchemins, which are tracked separately)
      actions.filter((a: Action) => a.ActionType === 'UseGadget' && a.ActionName && a.ActionName !== 'Balle').forEach((action: Action) => {
        const name = action.ActionName!;

        // Separate parchemins from regular gadgets
        if (PARCHEMIN_REGEX.test(name)) {
          if (!parcheminUsageMap.has(name)) {
            parcheminUsageMap.set(name, { uses: 0, wins: 0, camp: new Map() });
          }
          const stats = parcheminUsageMap.get(name)!;
          stats.uses++;
          if (playerWon) stats.wins++;

          if (!stats.camp.has(playerCamp)) {
            stats.camp.set(playerCamp, { uses: 0, wins: 0 });
          }
          const campStatsP = stats.camp.get(playerCamp)!;
          campStatsP.uses++;
          if (playerWon) campStatsP.wins++;
          return;
        }

        if (!gadgetUsageMap.has(name)) {
          gadgetUsageMap.set(name, { uses: 0, wins: 0, camp: new Map() });
        }
        const stats = gadgetUsageMap.get(name)!;
        stats.uses++;
        if (playerWon) stats.wins++;

        // Track by camp
        if (!stats.camp.has(playerCamp)) {
          stats.camp.set(playerCamp, { uses: 0, wins: 0 });
        }
        const campStats = stats.camp.get(playerCamp)!;
        campStats.uses++;
        if (playerWon) campStats.wins++;
      });

      // Track potions
      actions.filter((a: Action) => a.ActionType === 'DrinkPotion' && a.ActionName).forEach((action: Action) => {
        const name = action.ActionName!;
        if (!potionUsageMap.has(name)) {
          potionUsageMap.set(name, { uses: 0, wins: 0, camp: new Map() });
        }
        const stats = potionUsageMap.get(name)!;
        stats.uses++;
        if (playerWon) stats.wins++;

        // Track by camp
        if (!stats.camp.has(playerCamp)) {
          stats.camp.set(playerCamp, { uses: 0, wins: 0 });
        }
        const campStats = stats.camp.get(playerCamp)!;
        campStats.uses++;
        if (playerWon) campStats.wins++;
      });

      // Track accessories
      actions.filter((a: Action) => a.ActionType === 'TakeAccessory' && a.ActionName).forEach((action: Action) => {
        const name = action.ActionName!;
        if (!accessoryUsageMap.has(name)) {
          accessoryUsageMap.set(name, { uses: 0, wins: 0, camp: new Map() });
        }
        const stats = accessoryUsageMap.get(name)!;
        stats.uses++;
        if (playerWon) stats.wins++;

        // Track by camp
        if (!stats.camp.has(playerCamp)) {
          stats.camp.set(playerCamp, { uses: 0, wins: 0 });
        }
        const campStats = stats.camp.get(playerCamp)!;
        campStats.uses++;
        if (playerWon) campStats.wins++;
      });

      // Track wolf transformation timing (only for wolf roles)
      // Check MainRoleInitial to include all wolf types (Loup, Traître, Louveteau)
      const isWolfRole = player.MainRoleInitial === 'Loup' || 
                         player.MainRoleInitial === 'Traître' || 
                         player.MainRoleInitial === 'Louveteau';
      
      if (isWolfRole) {
        const firstTransform = getFirstActionOfType(actions, 'Transform');
        if (firstTransform) {
          const phase = parseTimingPhase(firstTransform.Timing);
          let timingKey = 'N3+';
          if (phase === 1) timingKey = 'N1';
          else if (phase === 2) timingKey = 'N2';

          if (!transformTimingMap.has(timingKey)) {
            transformTimingMap.set(timingKey, { games: 0, wins: 0 });
          }
          const stats = transformTimingMap.get(timingKey)!;
          stats.games++;
          if (playerWon) stats.wins++;
        }

        // Count untransforms for this wolf player in this game
        const untransformCount = actions.filter((a: Action) => a.ActionType === 'Untransform').length;
        const bucketKey = untransformCount >= 3 ? '3+' : String(untransformCount);
        if (!untransformBucketMap.has(bucketKey)) {
          untransformBucketMap.set(bucketKey, { count: 0, wins: 0 });
        }
        const uStats = untransformBucketMap.get(bucketKey)!;
        uStats.count++;
        if (playerWon) uStats.wins++;
      }

      // Track power usage (UsePower action type)
      actions.filter((a: Action) => a.ActionType === 'UsePower' && a.ActionName).forEach((action: Action) => {
        const name = action.ActionName!;
        const phase = parseTimingPhase(action.Timing) || 0;
        const isEarly = phase <= 2;

        if (!powerUsageMap.has(name)) {
          powerUsageMap.set(name, { 
            uses: 0, 
            wins: 0, 
            timings: [], 
            earlyUses: 0, 
            earlyWins: 0,
            lateUses: 0,
            lateWins: 0
          });
        }
        const stats = powerUsageMap.get(name)!;
        stats.uses++;
        if (playerWon) stats.wins++;
        stats.timings.push(phase);

        if (isEarly) {
          stats.earlyUses++;
          if (playerWon) stats.earlyWins++;
        } else {
          stats.lateUses++;
          if (playerWon) stats.lateWins++;
        }
      });

      // Track hunter shoot actions
      const hunterShootActions = actions.filter((a: Action) => a.ActionType === 'HunterShoot');
      if (hunterShootActions.length > 0) {
        hunterTotalGames++;
        if (playerWon) hunterWins++;

        hunterShootActions.forEach((action: Action) => {
          hunterTotalShots++;
          if (action.ActionTarget) {
            hunterSuccessfulShots++;
            hunterHitCount++;
            if (playerWon) hunterHitWins++;

            // Track target camp
            const targetPlayer = game.PlayerStats.find(
              (p: PlayerStat) => p.Username === action.ActionTarget
            );
            if (targetPlayer) {
              const targetCamp = getPlayerCamp(targetPlayer);
              if (!hunterTargetCampMap.has(targetCamp)) {
                hunterTargetCampMap.set(targetCamp, { count: 0, wins: 0 });
              }
              const campData = hunterTargetCampMap.get(targetCamp)!;
              campData.count++;
              if (playerWon) campData.wins++;
            }
          } else {
            hunterMissCount++;
            if (playerWon) hunterMissWins++;
          }
        });
      }
    });

    if (gameHasActions) gamesWithActions++;
  });

  // Calculate baseline win rates for ALL camps that appear in the data
  const campBaselineWinRates = new Map<string, number>();
  const campTotals = new Map<string, { wins: number; total: number }>();
  let totalPlayers = 0;
  let totalWins = 0;
  
  // First pass: collect all camps and their win/total counts
  moddedGames.forEach((game: GameLogEntry) => {
    game.PlayerStats.forEach((player: PlayerStat) => {
      const playerCamp = getPlayerCamp(player);
      totalPlayers++;
      if (player.Victorious) totalWins++;
      
      if (!campTotals.has(playerCamp)) {
        campTotals.set(playerCamp, { wins: 0, total: 0 });
      }
      const campData = campTotals.get(playerCamp)!;
      campData.total++;
      if (player.Victorious) campData.wins++;
    });
  });
  
  // Convert to win rates
  campTotals.forEach((data, camp) => {
    campBaselineWinRates.set(camp, data.total > 0 ? (data.wins / data.total) * 100 : 50);
  });
  
  const overallBaselineWinRate = totalPlayers > 0 ? (totalWins / totalPlayers) * 100 : 50;
  
  // Calculate aggregated baseline win rates for filter groups
  const wolfCamps = ['Loup', 'Traître', 'Louveteau'];
  const villageoisCamps = ['Villageois'];
  
  const calculateGroupBaseline = (includedCamps: string[]): number => {
    let groupWins = 0;
    let groupTotal = 0;
    campTotals.forEach((data, camp) => {
      if (includedCamps.includes(camp)) {
        groupWins += data.wins;
        groupTotal += data.total;
      }
    });
    return groupTotal > 0 ? (groupWins / groupTotal) * 100 : 50;
  };
  
  const calculateAutresBaseline = (): number => {
    let groupWins = 0;
    let groupTotal = 0;
    campTotals.forEach((data, camp) => {
      if (!villageoisCamps.includes(camp) && !wolfCamps.includes(camp)) {
        groupWins += data.wins;
        groupTotal += data.total;
      }
    });
    return groupTotal > 0 ? (groupWins / groupTotal) * 100 : 50;
  };
  
  const villageoisBaseline = calculateGroupBaseline(villageoisCamps);
  const loupsBaseline = calculateGroupBaseline(wolfCamps);
  const autresBaseline = calculateAutresBaseline();

  // Helper function to calculate aggregated camp stats for an item
  const calculateAggregatedCampStats = (
    campMap: Map<string, { uses: number; wins: number }>
  ): { villageois: AggregatedCampStats; loups: AggregatedCampStats; autres: AggregatedCampStats } => {
    // Villageois
    let villageoisUses = 0, villageoisWins = 0;
    campMap.forEach((campData, camp) => {
      if (villageoisCamps.includes(camp)) {
        villageoisUses += campData.uses;
        villageoisWins += campData.wins;
      }
    });
    const villageoisWinRate = villageoisUses > 0 ? (villageoisWins / villageoisUses) * 100 : 0;
    
    // Loups (Loup, Traître, Louveteau)
    let loupsUses = 0, loupsWins = 0;
    campMap.forEach((campData, camp) => {
      if (wolfCamps.includes(camp)) {
        loupsUses += campData.uses;
        loupsWins += campData.wins;
      }
    });
    const loupsWinRate = loupsUses > 0 ? (loupsWins / loupsUses) * 100 : 0;
    
    // Autres (everything else)
    let autresUses = 0, autresWins = 0;
    campMap.forEach((campData, camp) => {
      if (!villageoisCamps.includes(camp) && !wolfCamps.includes(camp)) {
        autresUses += campData.uses;
        autresWins += campData.wins;
      }
    });
    const autresWinRate = autresUses > 0 ? (autresWins / autresUses) * 100 : 0;
    
    return {
      villageois: {
        uses: villageoisUses,
        wins: villageoisWins,
        winRate: villageoisWinRate,
        baselineWinRate: villageoisBaseline,
        delta: villageoisWinRate - villageoisBaseline,
      },
      loups: {
        uses: loupsUses,
        wins: loupsWins,
        winRate: loupsWinRate,
        baselineWinRate: loupsBaseline,
        delta: loupsWinRate - loupsBaseline,
      },
      autres: {
        uses: autresUses,
        wins: autresWins,
        winRate: autresWinRate,
        baselineWinRate: autresBaseline,
        delta: autresWinRate - autresBaseline,
      },
    };
  };

  // Convert gadget map to array
  const gadgetStats: ActionItemStats[] = Array.from(gadgetUsageMap.entries())
    .map(([itemName, data]) => {
      const winRate = data.uses > 0 ? (data.wins / data.uses) * 100 : 0;
      
      const campBreakdown = Array.from(data.camp.entries()).map(([camp, campData]) => {
        const campWinRate = campData.uses > 0 ? (campData.wins / campData.uses) * 100 : 0;
        const campBaseline = campBaselineWinRates.get(camp) || 50;
        return {
          camp,
          winRate: campWinRate,
          uses: campData.uses,
          wins: campData.wins,
          delta: campWinRate - campBaseline,
        };
      });

      return {
        itemName,
        actionType: 'UseGadget' as const,
        totalUses: data.uses,
        winRate,
        wins: data.wins,
        losses: data.uses - data.wins,
        baselineWinRate: overallBaselineWinRate,
        delta: winRate - overallBaselineWinRate,
        campBreakdown,
        aggregatedCampStats: calculateAggregatedCampStats(data.camp),
      };
    })
    .sort((a, b) => b.totalUses - a.totalUses);

  // Convert potion map to array
  const potionStats: ActionItemStats[] = Array.from(potionUsageMap.entries())
    .map(([itemName, data]) => {
      const winRate = data.uses > 0 ? (data.wins / data.uses) * 100 : 0;
      
      const campBreakdown = Array.from(data.camp.entries()).map(([camp, campData]) => {
        const campWinRate = campData.uses > 0 ? (campData.wins / campData.uses) * 100 : 0;
        const campBaseline = campBaselineWinRates.get(camp) || 50;
        return {
          camp,
          winRate: campWinRate,
          uses: campData.uses,
          wins: campData.wins,
          delta: campWinRate - campBaseline,
        };
      });

      return {
        itemName,
        actionType: 'DrinkPotion' as const,
        totalUses: data.uses,
        winRate,
        wins: data.wins,
        losses: data.uses - data.wins,
        baselineWinRate: overallBaselineWinRate,
        delta: winRate - overallBaselineWinRate,
        campBreakdown,
        aggregatedCampStats: calculateAggregatedCampStats(data.camp),
      };
    })
    .sort((a, b) => b.totalUses - a.totalUses);

  // Convert accessory map to array
  const accessoryStats: ActionItemStats[] = Array.from(accessoryUsageMap.entries())
    .map(([itemName, data]) => {
      const winRate = data.uses > 0 ? (data.wins / data.uses) * 100 : 0;
      
      const campBreakdown = Array.from(data.camp.entries()).map(([camp, campData]) => {
        const campWinRate = campData.uses > 0 ? (campData.wins / campData.uses) * 100 : 0;
        const campBaseline = campBaselineWinRates.get(camp) || 50;
        return {
          camp,
          winRate: campWinRate,
          uses: campData.uses,
          wins: campData.wins,
          delta: campWinRate - campBaseline,
        };
      });

      return {
        itemName,
        actionType: 'TakeAccessory' as const,
        totalUses: data.uses,
        winRate,
        wins: data.wins,
        losses: data.uses - data.wins,
        baselineWinRate: overallBaselineWinRate,
        delta: winRate - overallBaselineWinRate,
        campBreakdown,
        aggregatedCampStats: calculateAggregatedCampStats(data.camp),
      };
    })
    .sort((a, b) => b.totalUses - a.totalUses);

  // Convert transform timing map to array
  const wolfTransformTiming: WolfTransformTimingStats[] = ['N1', 'N2', 'N3+']
    .map(timing => {
      const data = transformTimingMap.get(timing) || { games: 0, wins: 0 };
      return {
        timing,
        gamesCount: data.games,
        wins: data.wins,
        losses: data.games - data.wins,
        winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
      };
    })
    .filter(s => s.gamesCount > 0);

  // Convert wolf untransform bucket map to array
  const wolfBaselineWinRate = loupsBaseline;
  const wolfUntransformStats: WolfUntransformStats[] = ['0', '1', '2', '3+']
    .map(bucket => {
      const data = untransformBucketMap.get(bucket) || { count: 0, wins: 0 };
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      return {
        untransformCount: bucket,
        wolfCount: data.count,
        wins: data.wins,
        losses: data.count - data.wins,
        winRate,
        baselineWinRate: wolfBaselineWinRate,
        delta: winRate - wolfBaselineWinRate,
      };
    })
    .filter(s => s.wolfCount > 0);

  // Convert power usage map to array
  const powerUsageStats: PowerUsageStats[] = Array.from(powerUsageMap.entries())
    .map(([powerName, data]) => {
      const avgTiming = data.timings.length > 0 
        ? data.timings.reduce((sum, t) => sum + t, 0) / data.timings.length 
        : 0;
      
      return {
        powerName,
        totalUses: data.uses,
        averageTiming: avgTiming,
        winRate: data.uses > 0 ? (data.wins / data.uses) * 100 : 0,
        earlyUseWinRate: data.earlyUses > 0 ? (data.earlyWins / data.earlyUses) * 100 : 0,
        lateUseWinRate: data.lateUses > 0 ? (data.lateWins / data.lateUses) * 100 : 0,
      };
    })
    .filter(s => s.totalUses >= 5) // Minimum 5 uses for significance
    .sort((a, b) => b.totalUses - a.totalUses);

  // Convert parchemin map to array with effect categories
  const parcheminStats: ParcheminItemStats[] = Array.from(parcheminUsageMap.entries())
    .map(([itemName, data]) => {
      const winRate = data.uses > 0 ? (data.wins / data.uses) * 100 : 0;
      const match = itemName.match(PARCHEMIN_REGEX);
      const effectName = match ? match[1] : itemName;

      const campBreakdown = Array.from(data.camp.entries()).map(([camp, campData]) => {
        const campWinRate = campData.uses > 0 ? (campData.wins / campData.uses) * 100 : 0;
        const campBaseline = campBaselineWinRates.get(camp) || 50;
        return {
          camp,
          winRate: campWinRate,
          uses: campData.uses,
          wins: campData.wins,
          delta: campWinRate - campBaseline,
        };
      });

      return {
        itemName,
        effectName,
        effectCategory: getEffectCategory(itemName),
        actionType: 'UseGadget' as const,
        totalUses: data.uses,
        winRate,
        wins: data.wins,
        losses: data.uses - data.wins,
        baselineWinRate: overallBaselineWinRate,
        delta: winRate - overallBaselineWinRate,
        campBreakdown,
        aggregatedCampStats: calculateAggregatedCampStats(data.camp),
      };
    })
    .sort((a, b) => b.totalUses - a.totalUses);

  // Build hunter shoot meta stats
  const hunterBaselineWinRate = hunterTotalGames > 0 ? (hunterWins / hunterTotalGames) * 100 : 0;
  const targetCampStats = Array.from(hunterTargetCampMap.entries())
    .map(([camp, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      return {
        camp,
        count: data.count,
        wins: data.wins,
        winRate,
        delta: winRate - hunterBaselineWinRate,
      };
    })
    .sort((a, b) => b.count - a.count);

  const hunterShootStats: HunterShootMetaStats = {
    totalShots: hunterTotalShots,
    successfulShots: hunterSuccessfulShots,
    missedShots: hunterTotalShots - hunterSuccessfulShots,
    accuracy: hunterTotalShots > 0 ? (hunterSuccessfulShots / hunterTotalShots) * 100 : 0,
    totalHunterGames: hunterTotalGames,
    hunterWins,
    hunterWinRate: hunterBaselineWinRate,
    winRateWhenHit: hunterHitCount > 0 ? (hunterHitWins / hunterHitCount) * 100 : 0,
    winRateWhenMiss: hunterMissCount > 0 ? (hunterMissWins / hunterMissCount) * 100 : 0,
    hitsCount: hunterHitCount,
    missesCount: hunterMissCount,
    targetCampStats,
  };

  return {
    gadgetStats,
    potionStats,
    accessoryStats,
    parcheminStats,
    wolfTransformTiming,
    wolfUntransformStats,
    powerUsageStats,
    hunterShootStats,
    overallStats: {
      totalGamesAnalyzed: moddedGames.length,
      totalActionsRecorded: totalActions,
      averageActionsPerGame: moddedGames.length > 0 ? totalActions / moddedGames.length : 0,
      gamesWithActions,
    },
  };
}

export function useActionMetaStatsFromRaw() {
  const { data, isLoading, error } = useGameStatsBase(computeActionMetaStats);
  return { actionMetaStats: data, isLoading, error };
}
