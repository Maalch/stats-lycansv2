import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { useSettings } from '../../../context/SettingsContext';
import { useCombinedFilteredRawData, type GameLogEntry } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { CHART_LIMITS } from '../../../config/chartConstants';
import { getPlayerId } from '../../../utils/playerIdentification';
import { getPlayerMainCampFromRole } from '../../../utils/datasyncExport';
import { FullscreenChart } from '../../common/FullscreenChart';
import { MonthlyRankingBarRace, type BarRacePlayer } from './MonthlyRankingBarRace';
import { MonthlyRankingGameContext } from './MonthlyRankingGameContext';
import { MonthlyRankingTimeline } from './MonthlyRankingTimeline';

// Monthly threshold: player must have played at least 40% of month's games to be ranked
const MIN_PARTICIPATION_RATIO = 0.40;
// Yearly threshold: lower because more games overall in a year
const MIN_PARTICIPATION_RATIO_YEARLY = 0.20;

interface MonthData {
  key: string;        // "YYYY-MM" for sorting
  label: string;      // "Février 2026" for display
  totalGames: number;
  sortedGames: GameLogEntry[]; // Chronologically sorted games for animation
}

interface YearData {
  key: string;         // "YYYY"
  label: string;       // "2025"
  totalGames: number;  // total games across all months in this year
  sortedMonths: {      // months with games, sorted chronologically
    key: string;       // "YYYY-MM"
    label: string;     // "Janvier 2025"
    games: GameLogEntry[];
  }[];
}

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return `${FRENCH_MONTHS[monthIndex]} ${year}`;
}

/** Pure helper: build bar-race player list from a game set with eligibility filter. */
function buildBarRacePlayers(
  gamesToConsider: GameLogEntry[],
  minGames: number,
  highlightedPlayer: string | null | undefined,
  prevRanks: Map<string, number>,
  isAnimating: boolean,
  currentFrameIndex: number,
): { barRaceData: BarRacePlayer[]; playerAdded: boolean; avgWinRate: string; newRanks: Map<string, number> } {
  const playerMap = new Map<string, { displayName: string; gamesPlayed: number; wins: number; loupAndSoloWins: number; soloWins: number; loupAndSoloGames: number; soloGames: number }>();
  for (const game of gamesToConsider) {
    for (const ps of game.PlayerStats) {
      const id = getPlayerId(ps);
      if (!playerMap.has(id)) {
        playerMap.set(id, { displayName: ps.Username, gamesPlayed: 0, wins: 0, loupAndSoloWins: 0, soloWins: 0, loupAndSoloGames: 0, soloGames: 0 });
      }
      const entry = playerMap.get(id)!;
      entry.gamesPlayed++;
      const camp = getPlayerMainCampFromRole(ps.MainRoleInitial, ps.Power ?? undefined);
      const isSolo = camp !== 'Loup' && camp !== 'Villageois';
      if (ps.Victorious) {
        entry.wins++;
        if (camp === 'Loup' || isSolo) entry.loupAndSoloWins++;
        if (isSolo) entry.soloWins++;
      }
      if (camp === 'Loup' || isSolo) entry.loupAndSoloGames++;
      if (isSolo) entry.soloGames++;
    }
  }

  interface EligiblePlayer {
    name: string;
    gamesPlayed: number;
    wins: number;
    winPercent: number;
    loupAndSoloWins: number;
    soloWins: number;
    loupAndSoloGames: number;
    soloGames: number;
    isHighlightedAddition?: boolean;
  }

  const eligiblePlayers: EligiblePlayer[] = [];
  for (const [, stats] of playerMap) {
    if (stats.gamesPlayed >= minGames) {
      eligiblePlayers.push({
        name: stats.displayName,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        winPercent: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0,
        loupAndSoloWins: stats.loupAndSoloWins,
        soloWins: stats.soloWins,
        loupAndSoloGames: stats.loupAndSoloGames,
        soloGames: stats.soloGames,
      });
    }
  }

  eligiblePlayers.sort((a, b) =>
    b.winPercent - a.winPercent ||
    b.gamesPlayed - a.gamesPlayed ||
    b.loupAndSoloWins - a.loupAndSoloWins ||
    b.soloWins - a.soloWins ||
    b.loupAndSoloGames - a.loupAndSoloGames ||
    b.soloGames - a.soloGames
  );
  const topPlayers = eligiblePlayers.slice(0, CHART_LIMITS.TOP_20);

  let totalWinPercent = 0;
  for (const p of eligiblePlayers) totalWinPercent += p.winPercent;
  const avgWinRate = eligiblePlayers.length > 0
    ? (totalWinPercent / eligiblePlayers.length).toFixed(1)
    : '0';

  let finalPlayers: EligiblePlayer[] = [...topPlayers];
  let playerAdded = false;

  if (highlightedPlayer) {
    const inTop = topPlayers.some(p => p.name === highlightedPlayer);
    if (!inTop) {
      const fromEligible = eligiblePlayers.find(p => p.name === highlightedPlayer);
      if (fromEligible) {
        finalPlayers.push({ ...fromEligible, isHighlightedAddition: true });
        playerAdded = true;
      } else {
        for (const [, stats] of playerMap) {
          if (stats.displayName === highlightedPlayer && stats.gamesPlayed > 0) {
            finalPlayers.push({
              name: stats.displayName,
              gamesPlayed: stats.gamesPlayed,
              wins: stats.wins,
              winPercent: (stats.wins / stats.gamesPlayed) * 100,
              loupAndSoloWins: stats.loupAndSoloWins,
              soloWins: stats.soloWins,
              loupAndSoloGames: stats.loupAndSoloGames,
              soloGames: stats.soloGames,
              isHighlightedAddition: true,
            });
            playerAdded = true;
            break;
          }
        }
      }
    }
  }

  finalPlayers.sort((a, b) => {
    if (a.isHighlightedAddition && !b.isHighlightedAddition) return 1;
    if (!a.isHighlightedAddition && b.isHighlightedAddition) return -1;
    return (
      b.winPercent - a.winPercent ||
      b.gamesPlayed - a.gamesPlayed ||
      b.loupAndSoloWins - a.loupAndSoloWins ||
      b.soloWins - a.soloWins ||
      b.loupAndSoloGames - a.loupAndSoloGames ||
      b.soloGames - a.soloGames
    );
  });

  let displayRankCounter = 0;
  const newRanks = new Map<string, number>();
  const barRaceData: BarRacePlayer[] = finalPlayers.map((p, index) => {
    newRanks.set(p.name, index);
    const prevRank = prevRanks.has(p.name) ? prevRanks.get(p.name)! : null;
    const isNew = prevRank === null && isAnimating && currentFrameIndex > 1;
    let rankDelta: number | null = null;
    if (prevRank !== null && isAnimating) rankDelta = prevRank - index;

    // Compute Olympic-style display rank (shared for truly tied players)
    let displayRank: number;
    if (p.isHighlightedAddition) {
      displayRank = index;
    } else if (index === 0) {
      displayRankCounter = 0;
      displayRank = 0;
    } else {
      const prev = finalPlayers[index - 1];
      const isTied = !prev.isHighlightedAddition &&
        p.winPercent === prev.winPercent &&
        p.gamesPlayed === prev.gamesPlayed &&
        p.loupAndSoloWins === prev.loupAndSoloWins &&
        p.soloWins === prev.soloWins &&
        p.loupAndSoloGames === prev.loupAndSoloGames &&
        p.soloGames === prev.soloGames;
      if (!isTied) displayRankCounter = index;
      displayRank = displayRankCounter;
    }

    return {
      name: p.name,
      winPercent: p.winPercent,
      gamesPlayed: p.gamesPlayed,
      wins: p.wins,
      rank: index,
      displayRank,
      prevRank,
      rankDelta,
      isNew,
      isHighlightedAddition: p.isHighlightedAddition,
    };
  });

  return { barRaceData, playerAdded, avgWinRate, newRanks };
}

/**
 * Standalone page for Monthly/Yearly Ranking statistics.
 * Supports switching between monthly (game-by-game animation) and yearly (month-by-month animation).
 * State persists via NavigationContext.
 */
export function MonthlyRankingChart() {
  const { navigationState, updateNavigationState, navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { gameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Period mode: monthly (game-by-game animation) or yearly (month-by-month animation)
  const [rankingPeriod, setRankingPeriod] = useState<'monthly' | 'yearly'>(
    navigationState.monthlyRankingState?.rankingPeriod || 'monthly'
  );

  // Selected period units (auto-selects latest when null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    navigationState.monthlyRankingState?.selectedMonth || null
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(
    navigationState.monthlyRankingState?.selectedYear || null
  );

  // Animation frame index: monthly = game index, yearly = month-frame index
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGameIndex, setCurrentGameIndex] = useState<number>(
    navigationState.monthlyRankingState?.currentGameIndex || 0
  );
  const [playSpeed, setPlaySpeed] = useState<number>(
    navigationState.monthlyRankingState?.playSpeed || 1000
  );
  const intervalRef = useRef<number | null>(null);

  // Track previous ranks for delta indicators
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  // Persist state to NavigationContext
  useEffect(() => {
    const currentNavState = navigationState.monthlyRankingState;
    if (!currentNavState ||
        currentNavState.selectedMonth !== selectedMonth ||
        currentNavState.currentGameIndex !== currentGameIndex ||
        currentNavState.playSpeed !== playSpeed ||
        currentNavState.rankingPeriod !== rankingPeriod ||
        currentNavState.selectedYear !== selectedYear) {
      updateNavigationState({
        monthlyRankingState: {
          selectedMonth: selectedMonth || undefined,
          currentGameIndex,
          playSpeed,
          rankingPeriod,
          selectedYear: selectedYear || undefined,
        }
      });
    }
  }, [selectedMonth, currentGameIndex, playSpeed, rankingPeriod, selectedYear, updateNavigationState]);

  // Build monthly data from raw game log entries
  const { months, monthKeys } = useMemo(() => {
    if (!gameData || gameData.length === 0) {
      return { months: new Map<string, MonthData>(), monthKeys: [] };
    }

    const monthGames = new Map<string, typeof gameData>();
    for (const game of gameData) {
      const date = new Date(game.StartDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGames.has(key)) monthGames.set(key, []);
      monthGames.get(key)!.push(game);
    }

    const monthsMap = new Map<string, MonthData>();
    for (const [key, games] of monthGames) {
      const sortedGames = [...games].sort(
        (a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
      );
      monthsMap.set(key, { key, label: formatMonthLabel(key), totalGames: games.length, sortedGames });
    }

    const sortedKeys = [...monthsMap.keys()].sort();
    return { months: monthsMap, monthKeys: sortedKeys };
  }, [gameData]);

  // Build yearly data from raw game log entries
  const { years, yearKeys } = useMemo(() => {
    if (!gameData || gameData.length === 0) {
      return { years: new Map<string, YearData>(), yearKeys: [] };
    }

    // Group games by month key
    const yearMonthGames = new Map<string, GameLogEntry[]>();
    for (const game of gameData) {
      const date = new Date(game.StartDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!yearMonthGames.has(monthKey)) yearMonthGames.set(monthKey, []);
      yearMonthGames.get(monthKey)!.push(game);
    }

    // Aggregate months into years
    const yearsMap = new Map<string, YearData>();
    for (const [monthKey, games] of yearMonthGames) {
      const yearKey = monthKey.split('-')[0];
      if (!yearsMap.has(yearKey)) {
        yearsMap.set(yearKey, { key: yearKey, label: yearKey, totalGames: 0, sortedMonths: [] });
      }
      const yearEntry = yearsMap.get(yearKey)!;
      const sortedGames = [...games].sort(
        (a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
      );
      yearEntry.sortedMonths.push({ key: monthKey, label: formatMonthLabel(monthKey), games: sortedGames });
      yearEntry.totalGames += games.length;
    }

    // Sort months within each year chronologically
    for (const year of yearsMap.values()) {
      year.sortedMonths.sort((a, b) => a.key.localeCompare(b.key));
    }

    const sortedKeys = [...yearsMap.keys()].sort();
    return { years: yearsMap, yearKeys: sortedKeys };
  }, [gameData]);

  // Resolve effective period units (fallback to latest)
  const currentMonthKey = useMemo(() => {
    if (selectedMonth && monthKeys.includes(selectedMonth)) return selectedMonth;
    return monthKeys.length > 0 ? monthKeys[monthKeys.length - 1] : null;
  }, [selectedMonth, monthKeys]);

  const currentYearKey = useMemo(() => {
    if (selectedYear && yearKeys.includes(selectedYear)) return selectedYear;
    return yearKeys.length > 0 ? yearKeys[yearKeys.length - 1] : null;
  }, [selectedYear, yearKeys]);

  const effectiveMonth = currentMonthKey;
  const effectiveYear = currentYearKey;

  const currentMonthData = effectiveMonth ? months.get(effectiveMonth) : null;
  const currentYearData = effectiveYear ? years.get(effectiveYear) : null;

  // Total animation frames: monthly = total games, yearly = total months in year
  const totalFrames = rankingPeriod === 'monthly'
    ? (currentMonthData?.totalGames ?? 0)
    : (currentYearData?.sortedMonths.length ?? 0);

  // Reset animation and rank history when period-unit or mode changes
  useEffect(() => {
    setCurrentGameIndex(0);
    setIsPlaying(false);
    prevRanksRef.current = new Map();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [effectiveMonth, effectiveYear, rankingPeriod]);

  // Build bar-race data with highlighted player logic and rank deltas
  const { barRacePlayers, highlightedPlayerAdded, averageWinRate, minGamesRequired, effectiveTotalGames, currentGame, currentMonthContext } = useMemo(() => {
    const isAnimating = currentGameIndex > 0;
    const defaultReturn = {
      barRacePlayers: [] as BarRacePlayer[],
      highlightedPlayerAdded: false,
      averageWinRate: '0',
      minGamesRequired: 0,
      effectiveTotalGames: 0,
      currentGame: null as GameLogEntry | null,
      currentMonthContext: null as { label: string; games: number } | null,
    };

    // ── Monthly mode ──
    if (rankingPeriod === 'monthly') {
      if (!currentMonthData) return defaultReturn;

      const gamesToConsider = isAnimating
        ? currentMonthData.sortedGames.slice(0, currentGameIndex)
        : currentMonthData.sortedGames;
      const effectiveTotal = isAnimating ? currentGameIndex : currentMonthData.totalGames;
      const minGames = Math.ceil(effectiveTotal * MIN_PARTICIPATION_RATIO);
      const latestGame = isAnimating && gamesToConsider.length > 0
        ? gamesToConsider[gamesToConsider.length - 1]
        : null;

      const { barRaceData, playerAdded, avgWinRate, newRanks } = buildBarRacePlayers(
        gamesToConsider, minGames, settings.highlightedPlayer, prevRanksRef.current, isAnimating, currentGameIndex
      );
      prevRanksRef.current = newRanks;

      return {
        barRacePlayers: barRaceData,
        highlightedPlayerAdded: playerAdded,
        averageWinRate: avgWinRate,
        minGamesRequired: minGames,
        effectiveTotalGames: effectiveTotal,
        currentGame: latestGame,
        currentMonthContext: null,
      };
    }

    // ── Yearly mode ──
    if (!currentYearData) return defaultReturn;

    const monthsToConsider = isAnimating
      ? currentYearData.sortedMonths.slice(0, currentGameIndex)
      : currentYearData.sortedMonths;
    const gamesFromMonths: GameLogEntry[] = [];
    for (const m of monthsToConsider) gamesFromMonths.push(...m.games);
    const effectiveTotal = gamesFromMonths.length;
    const minGames = Math.max(1, Math.ceil(effectiveTotal * MIN_PARTICIPATION_RATIO_YEARLY));

    const latestMonth = isAnimating && monthsToConsider.length > 0
      ? monthsToConsider[monthsToConsider.length - 1]
      : null;

    const { barRaceData, playerAdded, avgWinRate, newRanks } = buildBarRacePlayers(
      gamesFromMonths, minGames, settings.highlightedPlayer, prevRanksRef.current, isAnimating, currentGameIndex
    );
    prevRanksRef.current = newRanks;

    return {
      barRacePlayers: barRaceData,
      highlightedPlayerAdded: playerAdded,
      averageWinRate: avgWinRate,
      minGamesRequired: minGames,
      effectiveTotalGames: effectiveTotal,
      currentGame: null,
      currentMonthContext: latestMonth
        ? { label: latestMonth.label, games: latestMonth.games.length }
        : null,
    };
  }, [rankingPeriod, currentMonthData, currentYearData, settings.highlightedPlayer, currentGameIndex]);

  // ── Navigation handlers ──
  const monthIndex = effectiveMonth ? monthKeys.indexOf(effectiveMonth) : -1;
  const canGoPrevMonth = monthIndex > 0;
  const canGoNextMonth = monthIndex < monthKeys.length - 1;

  const goToPrevMonth = useCallback(() => {
    if (canGoPrevMonth) setSelectedMonth(monthKeys[monthIndex - 1]);
  }, [canGoPrevMonth, monthIndex, monthKeys]);

  const goToNextMonth = useCallback(() => {
    if (canGoNextMonth) setSelectedMonth(monthKeys[monthIndex + 1]);
  }, [canGoNextMonth, monthIndex, monthKeys]);

  const yearIndex = effectiveYear ? yearKeys.indexOf(effectiveYear) : -1;
  const canGoPrevYear = yearIndex > 0;
  const canGoNextYear = yearIndex < yearKeys.length - 1;

  const goToPrevYear = useCallback(() => {
    if (canGoPrevYear) setSelectedYear(yearKeys[yearIndex - 1]);
  }, [canGoPrevYear, yearIndex, yearKeys]);

  const goToNextYear = useCallback(() => {
    if (canGoNextYear) setSelectedYear(yearKeys[yearIndex + 1]);
  }, [canGoNextYear, yearIndex, yearKeys]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentGameIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex > totalFrames) {
          setIsPlaying(false);
          return 0;
        }
        return nextIndex;
      });
    }, playSpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playSpeed, totalFrames]);

  // ── Playback control handlers ──
  const handlePlayPause = useCallback(() => {
    if (currentGameIndex === 0 && !isPlaying) setCurrentGameIndex(1);
    setIsPlaying(prev => !prev);
  }, [isPlaying, currentGameIndex]);

  const handleStepBackward = useCallback(() => {
    setIsPlaying(false);
    setCurrentGameIndex(prev => {
      if (prev === 0) return totalFrames;
      return Math.max(1, prev - 1);
    });
  }, [totalFrames]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentGameIndex(prev => {
      if (prev === 0) return 1;
      if (prev >= totalFrames) return 0;
      return prev + 1;
    });
  }, [totalFrames]);

  const handleTimelineSeek = useCallback((index: number) => {
    setCurrentGameIndex(index);
  }, []);

  const handleTimelinePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // ── Player click handler ──
  const handlePlayerClick = useCallback((playerName: string) => {
    if (rankingPeriod === 'monthly') {
      const selectedDate = effectiveMonth
        ? effectiveMonth.split('-').reverse().join('/')
        : undefined;
      navigateToGameDetails({
        selectedPlayer: playerName,
        selectedDate,
        fromComponent: `Classement Mensuel — ${currentMonthData?.label || ''}`,
      });
    } else {
      navigateToGameDetails({
        selectedPlayer: playerName,
        fromComponent: `Classement Annuel — ${effectiveYear || ''}`,
      });
    }
  }, [rankingPeriod, navigateToGameDetails, currentMonthData, effectiveMonth, effectiveYear]);

  // ── Game context click handler ──
  const handleGameClick = useCallback((gameId: string) => {
    navigateToGameDetails({
      selectedGame: gameId,
      fromComponent: rankingPeriod === 'monthly'
        ? `Classement Mensuel — ${currentMonthData?.label || ''}`
        : `Classement Annuel — ${effectiveYear || ''}`,
    });
  }, [navigateToGameDetails, rankingPeriod, currentMonthData, effectiveYear]);

  // ── Timeline labels ──
  const isAnimating = currentGameIndex > 0;
  const transitionDuration = Math.round(playSpeed * 0.8);

  const timelineAllLabel = rankingPeriod === 'yearly'
    ? `Année complète (${currentYearData?.totalGames ?? 0} parties)`
    : undefined;

  const timelineCurrentLabel = useMemo(() => {
    if (rankingPeriod !== 'yearly' || !currentYearData || currentGameIndex === 0) return undefined;
    const month = currentYearData.sortedMonths[currentGameIndex - 1];
    if (!month) return undefined;
    const cumulative = currentYearData.sortedMonths
      .slice(0, currentGameIndex)
      .reduce((sum, m) => sum + m.games.length, 0);
    return `${month.label} (${cumulative} parties cumulées)`;
  }, [rankingPeriod, currentYearData, currentGameIndex]);

  // ── Early returns ──
  if (!gameData || gameData.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée disponible pour le classement</div>;
  }
  if (rankingPeriod === 'monthly' && monthKeys.length === 0) {
    return <div className="donnees-manquantes">Aucun mois avec des parties trouvé</div>;
  }
  if (rankingPeriod === 'yearly' && yearKeys.length === 0) {
    return <div className="donnees-manquantes">Aucune année avec des parties trouvée</div>;
  }

  const activeLabel = rankingPeriod === 'monthly'
    ? (currentMonthData?.label || '')
    : (effectiveYear || '');
  const eligibleCount = barRacePlayers.filter(p => !p.isHighlightedAddition).length;
  const participationPct = Math.round(
    (rankingPeriod === 'monthly' ? MIN_PARTICIPATION_RATIO : MIN_PARTICIPATION_RATIO_YEARLY) * 100
  );

  return (
    <div className="lycans-players-stats">
      <h2>Classement par Période</h2>
      <p className="lycans-stats-info">
        Classement des joueurs par taux de victoire
        <br />
        <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
          {rankingPeriod === 'monthly'
            ? 'Seuls les joueurs ayant participé à au moins 40% des parties du mois sont classés'
            : "Seuls les joueurs ayant participé à au moins 20% des parties de l'année sont classés"}
        </span>
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          {/* Period toggle */}
          <div className="monthly-period-toggle">
            <button
              className={`monthly-period-btn${rankingPeriod === 'monthly' ? ' monthly-period-btn--active' : ''}`}
              onClick={() => setRankingPeriod('monthly')}
            >
              📅 Mensuel
            </button>
            <button
              className={`monthly-period-btn${rankingPeriod === 'yearly' ? ' monthly-period-btn--active' : ''}`}
              onClick={() => setRankingPeriod('yearly')}
            >
              📆 Annuel
            </button>
          </div>

          <div>
            <h3>
              {rankingPeriod === 'monthly' ? 'Classement Mensuel' : 'Classement Annuel'} — Taux de Victoire
            </h3>
            {highlightedPlayerAdded && settings.highlightedPlayer && (
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--accent-primary)',
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem',
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du classement
              </p>
            )}
          </div>

          {/* Period navigation controls */}
          {rankingPeriod === 'monthly' ? (
            <div className="monthly-nav">
              <button onClick={goToPrevMonth} disabled={!canGoPrevMonth}>◀</button>
              <select
                value={effectiveMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthKeys.map(key => (
                  <option key={key} value={key}>{formatMonthLabel(key)}</option>
                ))}
              </select>
              <button onClick={goToNextMonth} disabled={!canGoNextMonth}>▶</button>
            </div>
          ) : (
            <div className="monthly-nav">
              <button onClick={goToPrevYear} disabled={!canGoPrevYear}>◀</button>
              <select
                value={effectiveYear || ''}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {yearKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <button onClick={goToNextYear} disabled={!canGoNextYear}>▶</button>
            </div>
          )}

          {/* Animation controls */}
          {totalFrames > 0 && (
            <>
              <div className="monthly-controls">
                <button onClick={handleStepBackward}>◀ Précédente</button>
                <button
                  className={`monthly-play-btn ${isPlaying ? 'monthly-play-btn--active' : ''}`}
                  onClick={handlePlayPause}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={handleStepForward}>Suivante ▶</button>
                <select
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                >
                  <option value={2000}>Lent (2s)</option>
                  <option value={1000}>Normal (1s)</option>
                  <option value={500}>Rapide (0.5s)</option>
                  <option value={250}>Très rapide (0.25s)</option>
                </select>
              </div>

              {/* Timeline slider */}
              <MonthlyRankingTimeline
                totalGames={totalFrames}
                currentGameIndex={currentGameIndex}
                isPlaying={isPlaying}
                onSeek={handleTimelineSeek}
                onPause={handleTimelinePause}
                allFramesLabel={timelineAllLabel}
                currentFrameLabel={timelineCurrentLabel}
              />
            </>
          )}

          {/* Context panel during animation */}
          {isAnimating && rankingPeriod === 'monthly' && currentGame && (
            <MonthlyRankingGameContext
              game={currentGame}
              onGameClick={handleGameClick}
            />
          )}
          {isAnimating && rankingPeriod === 'yearly' && currentMonthContext && (
            <div className="game-context-panel">
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                📅 {currentMonthContext.label}
              </span>
              <span className="game-context-separator">|</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                +{currentMonthContext.games} partie{currentMonthContext.games > 1 ? 's' : ''} ce mois
              </span>
              <span className="game-context-separator">|</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {effectiveTotalGames} parties cumulées
              </span>
            </div>
          )}

          {/* Bar race chart */}
          <FullscreenChart title={`${rankingPeriod === 'monthly' ? 'Classement Mensuel' : 'Classement Annuel'} — ${activeLabel}`}>
            {(isFullscreen: boolean) => (
              <MonthlyRankingBarRace
                players={barRacePlayers}
                playersColor={playersColor}
                highlightedPlayer={settings.highlightedPlayer ?? null}
                transitionDuration={transitionDuration}
                onPlayerClick={handlePlayerClick}
                isFullscreen={isFullscreen}
                isAnimating={isAnimating}
              />
            )}
          </FullscreenChart>

          {/* Summary info */}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            {eligibleCount > 0 && (
              <>
                {eligibleCount} joueur{eligibleCount > 1 ? 's' : ''} classé{eligibleCount > 1 ? 's' : ''} sur{' '}
                {effectiveTotalGames} partie{effectiveTotalGames > 1 ? 's' : ''}
                {currentGameIndex > 0 ? ' (animation)' : rankingPeriod === 'monthly' ? ' ce mois' : ' cette année'}
                {' '}(min. {minGamesRequired} partie{minGamesRequired > 1 ? 's' : ''} — {participationPct}%)
                {averageWinRate !== '0' && <> · Moyenne: {averageWinRate}%</>}
              </>
            )}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            À égalité de taux de victoire : nombre de parties jouées, puis victoires en camp Loup/Solo, puis victoires en Solo, puis parties en camp Loup/Solo, puis parties en Solo
          </p>
        </div>
      </div>
    </div>
  );
}

