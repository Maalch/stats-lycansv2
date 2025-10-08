import type { GameLogEntry } from '../useCombinedRawData';

/**
 * Parse EndTiming string to extract game phase and day number
 */
export interface GameTimeInfo {
  phase: 'J' | 'N' | 'M'; // Jour, Nuit, Meeting
  dayNumber: number;
  originalTiming: string;
  phaseLabel: string; // French label for display
}

/**
 * Parse EndTiming string (e.g., "J3", "N2", "M1")
 */
export function parseEndTiming(endTiming: string | null): GameTimeInfo | null {
  if (!endTiming || endTiming.trim() === '') {
    return null;
  }

  const trimmed = endTiming.trim();
  
  // Extract first character (phase) and remaining characters (day number)
  const phase = trimmed.charAt(0).toUpperCase() as 'J' | 'N' | 'M';
  const dayNumberStr = trimmed.slice(1);
  const dayNumber = parseInt(dayNumberStr, 10);

  // Validate phase
  if (!['J', 'N', 'M'].includes(phase)) {
    console.warn(`Invalid game phase in EndTiming: ${endTiming}`);
    return null;
  }

  // Validate day number
  if (isNaN(dayNumber) || dayNumber < 1) {
    console.warn(`Invalid day number in EndTiming: ${endTiming}`);
    return null;
  }

  // Get phase label
  const phaseLabels = {
    'J': 'Jour',
    'N': 'Nuit', 
    'M': 'Meeting'
  };

  return {
    phase,
    dayNumber,
    originalTiming: trimmed,
    phaseLabel: phaseLabels[phase]
  };
}

/**
 * Distribution of games by end timing
 */
export interface EndTimingDistribution {
  timing: string; // e.g., "J1", "N2", "M3"
  phase: string; // e.g., "Jour", "Nuit", "Meeting"
  dayNumber: number;
  count: number;
  percentage: number;
}

/**
 * Distribution of games by phase (aggregated)
 */
export interface PhaseDistribution {
  phase: string; // "Jour", "Nuit", "Meeting"
  count: number;
  percentage: number;
  averageDay: number;
}

/**
 * Distribution of games by day number (aggregated across phases)
 */
export interface DayDistribution {
  dayNumber: number;
  count: number;
  percentage: number;
  phases: { [phase: string]: number }; // Count per phase for this day
}

/**
 * Game time analysis response
 */
export interface GameTimeAnalysisResponse {
  totalGames: number;
  gamesWithEndTiming: number;
  averageGameLength: number; // Average day number
  endTimingDistribution: EndTimingDistribution[];
  phaseDistribution: PhaseDistribution[];
  dayDistribution: DayDistribution[];
  longestGame: {
    gameId: string;
    endTiming: string;
    dayNumber: number;
  } | null;
  shortestGame: {
    gameId: string;
    endTiming: string;
    dayNumber: number;
  } | null;
}

/**
 * Compute game time analysis from raw game data
 */
export function computeGameTimeAnalysis(rawGameData: GameLogEntry[]): GameTimeAnalysisResponse {
  if (!rawGameData || rawGameData.length === 0) {
    return {
      totalGames: 0,
      gamesWithEndTiming: 0,
      averageGameLength: 0,
      endTimingDistribution: [],
      phaseDistribution: [],
      dayDistribution: [],
      longestGame: null,
      shortestGame: null
    };
  }

  const totalGames = rawGameData.length;
  let gamesWithEndTiming = 0;
  let totalDays = 0;
  let longestGame: GameTimeAnalysisResponse['longestGame'] = null;
  let shortestGame: GameTimeAnalysisResponse['shortestGame'] = null;

  // Count distributions
  const endTimingCounts: Record<string, number> = {};
  const phaseCounts: Record<string, { count: number; totalDays: number }> = {};
  const dayCounts: Record<number, { count: number; phases: Record<string, number> }> = {};

  rawGameData.forEach(game => {
    const gameTimeInfo = parseEndTiming(game.EndTiming);
    
    if (gameTimeInfo) {
      gamesWithEndTiming++;
      totalDays += gameTimeInfo.dayNumber;

      // Update longest/shortest games
      if (!longestGame || gameTimeInfo.dayNumber > longestGame.dayNumber) {
        longestGame = {
          gameId: game.DisplayedId,
          endTiming: gameTimeInfo.originalTiming,
          dayNumber: gameTimeInfo.dayNumber
        };
      }

      if (!shortestGame || gameTimeInfo.dayNumber < shortestGame.dayNumber) {
        shortestGame = {
          gameId: game.DisplayedId,
          endTiming: gameTimeInfo.originalTiming,
          dayNumber: gameTimeInfo.dayNumber
        };
      }

      // Count end timing distribution
      const timingKey = gameTimeInfo.originalTiming;
      endTimingCounts[timingKey] = (endTimingCounts[timingKey] || 0) + 1;

      // Count phase distribution
      const phaseLabel = gameTimeInfo.phaseLabel;
      if (!phaseCounts[phaseLabel]) {
        phaseCounts[phaseLabel] = { count: 0, totalDays: 0 };
      }
      phaseCounts[phaseLabel].count++;
      phaseCounts[phaseLabel].totalDays += gameTimeInfo.dayNumber;

      // Count day distribution
      const dayNum = gameTimeInfo.dayNumber;
      if (!dayCounts[dayNum]) {
        dayCounts[dayNum] = { count: 0, phases: {} };
      }
      dayCounts[dayNum].count++;
      dayCounts[dayNum].phases[phaseLabel] = (dayCounts[dayNum].phases[phaseLabel] || 0) + 1;
    }
  });

  // Calculate average game length
  const averageGameLength = gamesWithEndTiming > 0 ? totalDays / gamesWithEndTiming : 0;

  // Format end timing distribution
  const endTimingDistribution: EndTimingDistribution[] = Object.entries(endTimingCounts)
    .map(([timing, count]) => {
      const gameTimeInfo = parseEndTiming(timing);
      return {
        timing,
        phase: gameTimeInfo?.phaseLabel || 'Unknown',
        dayNumber: gameTimeInfo?.dayNumber || 0,
        count,
        percentage: (count / gamesWithEndTiming) * 100
      };
    })
    .sort((a, b) => {
      // Sort by day number first, then by phase priority (J -> N -> M)
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber;
      }
      const phaseOrder = { 'Jour': 0, 'Nuit': 1, 'Meeting': 2 };
      return (phaseOrder[a.phase as keyof typeof phaseOrder] || 3) - 
             (phaseOrder[b.phase as keyof typeof phaseOrder] || 3);
    });

  // Format phase distribution
  const phaseDistribution: PhaseDistribution[] = Object.entries(phaseCounts)
    .map(([phase, data]) => ({
      phase,
      count: data.count,
      percentage: (data.count / gamesWithEndTiming) * 100,
      averageDay: data.count > 0 ? data.totalDays / data.count : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Format day distribution
  const dayDistribution: DayDistribution[] = Object.entries(dayCounts)
    .map(([dayStr, data]) => ({
      dayNumber: parseInt(dayStr, 10),
      count: data.count,
      percentage: (data.count / gamesWithEndTiming) * 100,
      phases: data.phases
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    totalGames,
    gamesWithEndTiming,
    averageGameLength,
    endTimingDistribution,
    phaseDistribution,
    dayDistribution,
    longestGame,
    shortestGame
  };
}