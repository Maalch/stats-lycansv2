import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { useSettings } from '../../../context/SettingsContext';
import { useCombinedFilteredRawData, type GameLogEntry } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { CHART_LIMITS } from '../../../config/chartConstants';
import { getPlayerId } from '../../../utils/playerIdentification';
import { FullscreenChart } from '../../common/FullscreenChart';
import { MonthlyRankingBarRace, type BarRacePlayer } from './MonthlyRankingBarRace';
import { MonthlyRankingGameContext } from './MonthlyRankingGameContext';
import { MonthlyRankingTimeline } from './MonthlyRankingTimeline';

// Threshold: player must have played at least 40% of month's games to be ranked
const MIN_PARTICIPATION_RATIO = 0.40;

interface MonthData {
  key: string;        // "YYYY-MM" for sorting
  label: string;      // "Février 2026" for display
  totalGames: number;
  sortedGames: GameLogEntry[]; // Chronologically sorted games for animation
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

/**
 * Standalone page for Monthly Ranking statistics.
 * Manages month selection state and persists it via NavigationContext.
 */
export function MonthlyRankingChart() {
  const { navigationState, updateNavigationState, navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { gameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  
  // Initialize from navigationState with fallback to null (component will auto-select latest)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    navigationState.monthlyRankingState?.selectedMonth || null
  );

  // Animation state
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

  // Save state to navigation context when it changes (for back/forward navigation persistence)
  useEffect(() => {
    const currentNavState = navigationState.monthlyRankingState;
    if (!currentNavState || 
        currentNavState.selectedMonth !== selectedMonth ||
        currentNavState.currentGameIndex !== currentGameIndex ||
        currentNavState.playSpeed !== playSpeed) {
      updateNavigationState({
        monthlyRankingState: {
          selectedMonth: selectedMonth || undefined,
          currentGameIndex,
          playSpeed
        }
      });
    }
  }, [selectedMonth, currentGameIndex, playSpeed, updateNavigationState]);

  // Build monthly data from raw game log entries
  const { months, monthKeys } = useMemo(() => {
    if (!gameData || gameData.length === 0) {
      return { months: new Map<string, MonthData>(), monthKeys: [] };
    }

    // Group games by month
    const monthGames = new Map<string, typeof gameData>();
    for (const game of gameData) {
      const date = new Date(game.StartDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGames.has(key)) {
        monthGames.set(key, []);
      }
      monthGames.get(key)!.push(game);
    }

    // Build monthly data
    const monthsMap = new Map<string, MonthData>();
    for (const [key, games] of monthGames) {
      // Explicitly sort games chronologically by StartDate
      const sortedGames = [...games].sort(
        (a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
      );

      monthsMap.set(key, {
        key,
        label: formatMonthLabel(key),
        totalGames: games.length,
        sortedGames,
      });
    }

    // Sort month keys chronologically
    const sortedKeys = [...monthsMap.keys()].sort();

    return { months: monthsMap, monthKeys: sortedKeys };
  }, [gameData]);

  // Determine current month selection: use prop, fallback to latest month
  const currentMonthKey = useMemo(() => {
    if (selectedMonth && monthKeys.includes(selectedMonth)) {
      return selectedMonth;
    }
    // Default to last month with games
    return monthKeys.length > 0 ? monthKeys[monthKeys.length - 1] : null;
  }, [selectedMonth, monthKeys]);

  // Auto-set month to latest if not set yet
  const effectiveMonth = currentMonthKey;

  const currentMonthData = effectiveMonth ? months.get(effectiveMonth) : null;

  // Reset animation and previous ranks when month changes
  useEffect(() => {
    setCurrentGameIndex(0);
    setIsPlaying(false);
    prevRanksRef.current = new Map();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [effectiveMonth]);

  // Build bar-race data with highlighted player logic and rank deltas
  const { barRacePlayers, highlightedPlayerAdded, averageWinRate, minGamesRequired, effectiveTotalGames, currentGame } = useMemo(() => {
    if (!currentMonthData) {
      return { barRacePlayers: [], highlightedPlayerAdded: false, averageWinRate: '0', minGamesRequired: 0, effectiveTotalGames: 0, currentGame: null as GameLogEntry | null };
    }

    // When animating (currentGameIndex > 0), use subset of games
    const isAnimating = currentGameIndex > 0;
    const gamesToConsider = isAnimating 
      ? currentMonthData.sortedGames.slice(0, currentGameIndex)
      : currentMonthData.sortedGames;
    const effectiveTotal = isAnimating ? currentGameIndex : currentMonthData.totalGames;
    const minGames = Math.ceil(effectiveTotal * MIN_PARTICIPATION_RATIO);

    // Current game for context panel (the last game in the considered set)
    const latestGame = isAnimating && gamesToConsider.length > 0
      ? gamesToConsider[gamesToConsider.length - 1]
      : null;

    // Recalculate player stats based on gamesToConsider
    const playerMap = new Map<string, { displayName: string; gamesPlayed: number; wins: number }>();
    for (const game of gamesToConsider) {
      for (const ps of game.PlayerStats) {
        const id = getPlayerId(ps);
        if (!playerMap.has(id)) {
          playerMap.set(id, { displayName: ps.Username, gamesPlayed: 0, wins: 0 });
        }
        const entry = playerMap.get(id)!;
        entry.gamesPlayed++;
        if (ps.Victorious) {
          entry.wins++;
        }
      }
    }

    // Build eligible players
    interface EligiblePlayer {
      name: string;
      gamesPlayed: number;
      wins: number;
      winPercent: number;
      isHighlightedAddition?: boolean;
    }

    const eligiblePlayers: EligiblePlayer[] = [];
    for (const [, stats] of playerMap) {
      if (stats.gamesPlayed >= minGames) {
        eligiblePlayers.push({
          name: stats.displayName,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          winPercent: stats.gamesPlayed > 0
            ? (stats.wins / stats.gamesPlayed) * 100
            : 0,
        });
      }
    }

    // Sort by win rate descending, then by games played for ties
    eligiblePlayers.sort((a, b) => b.winPercent - a.winPercent || b.gamesPlayed - a.gamesPlayed);
    const chartLimit = CHART_LIMITS.TOP_15;
    const topPlayers = eligiblePlayers.slice(0, chartLimit);

    // Average win rate across eligible players
    let totalWinPercent = 0;
    for (const p of eligiblePlayers) {
      totalWinPercent += p.winPercent;
    }
    const avgWinRate = eligiblePlayers.length > 0
      ? (totalWinPercent / eligiblePlayers.length).toFixed(1)
      : '0';

    // Check if highlighted player is in top N
    let finalPlayers: EligiblePlayer[] = [...topPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer) {
      const inTop = topPlayers.some(p => p.name === settings.highlightedPlayer);
      if (!inTop) {
        const fromEligible = eligiblePlayers.find(p => p.name === settings.highlightedPlayer);
        if (fromEligible) {
          finalPlayers.push({ ...fromEligible, isHighlightedAddition: true });
          playerAdded = true;
        } else {
          // Player might not meet threshold
          let found = false;
          for (const [, stats] of playerMap) {
            if (stats.displayName === settings.highlightedPlayer && stats.gamesPlayed > 0) {
              finalPlayers.push({
                name: settings.highlightedPlayer,
                gamesPlayed: stats.gamesPlayed,
                wins: stats.wins,
                winPercent: (stats.wins / stats.gamesPlayed) * 100,
                isHighlightedAddition: true,
              });
              playerAdded = true;
              found = true;
              break;
            }
          }
          if (!found) {
            // Also search by canonical name in playerMap
            for (const [, stats] of playerMap) {
              if (stats.displayName === settings.highlightedPlayer && stats.gamesPlayed > 0) {
                finalPlayers.push({
                  name: stats.displayName,
                  gamesPlayed: stats.gamesPlayed,
                  wins: stats.wins,
                  winPercent: (stats.wins / stats.gamesPlayed) * 100,
                  isHighlightedAddition: true,
                });
                playerAdded = true;
                break;
              }
            }
          }
        }
      }
    }

    // Sort final list by win rate (highlighted additions go at the end)
    finalPlayers.sort((a, b) => {
      // Highlighted additions always at the end
      if (a.isHighlightedAddition && !b.isHighlightedAddition) return 1;
      if (!a.isHighlightedAddition && b.isHighlightedAddition) return -1;
      return b.winPercent - a.winPercent || b.gamesPlayed - a.gamesPlayed;
    });

    // Build BarRacePlayer[] with rank and delta info
    const prevRanks = prevRanksRef.current;
    const newRanks = new Map<string, number>();
    
    const barRaceData: BarRacePlayer[] = finalPlayers.map((p, index) => {
      newRanks.set(p.name, index);
      const prevRank = prevRanks.has(p.name) ? prevRanks.get(p.name)! : null;
      const isNew = prevRank === null && isAnimating && currentGameIndex > 1;
      
      let rankDelta: number | null = null;
      if (prevRank !== null && isAnimating) {
        rankDelta = prevRank - index; // positive = moved up
      }

      return {
        name: p.name,
        winPercent: p.winPercent,
        gamesPlayed: p.gamesPlayed,
        wins: p.wins,
        rank: index,
        prevRank,
        rankDelta,
        isNew,
        isHighlightedAddition: p.isHighlightedAddition,
      };
    });

    // Update prevRanks for next frame
    prevRanksRef.current = newRanks;

    return {
      barRacePlayers: barRaceData,
      highlightedPlayerAdded: playerAdded,
      averageWinRate: avgWinRate,
      minGamesRequired: minGames,
      effectiveTotalGames: effectiveTotal,
      currentGame: latestGame,
    };
  }, [currentMonthData, settings.highlightedPlayer, currentGameIndex]);

  // Navigation handlers
  const currentIndex = effectiveMonth ? monthKeys.indexOf(effectiveMonth) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < monthKeys.length - 1;

  const goToPrevMonth = useCallback(() => {
    if (canGoPrev) {
      setSelectedMonth(monthKeys[currentIndex - 1]);
    }
  }, [canGoPrev, currentIndex, monthKeys]);

  const goToNextMonth = useCallback(() => {
    if (canGoNext) {
      setSelectedMonth(monthKeys[currentIndex + 1]);
    }
  }, [canGoNext, currentIndex, monthKeys]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !currentMonthData) return;

    intervalRef.current = setInterval(() => {
      setCurrentGameIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex > currentMonthData.totalGames) {
          setIsPlaying(false); // Auto-stop at end
          return 0; // Reset to show all games
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
  }, [isPlaying, playSpeed, currentMonthData]);

  // Playback control handlers
  const handlePlayPause = useCallback(() => {
    if (currentGameIndex === 0 && !isPlaying) {
      // Starting animation from the end - begin at game 1
      setCurrentGameIndex(1);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentGameIndex]);

  const handleStepBackward = useCallback(() => {
    setIsPlaying(false);
    if (!currentMonthData) return;
    setCurrentGameIndex(prev => {
      if (prev === 0) {
        // From all-games view, step to the last game
        return currentMonthData.totalGames;
      }
      return Math.max(1, prev - 1);
    });
  }, [currentMonthData]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentGameIndex(prev => {
      if (!currentMonthData) return prev;
      if (prev === 0) return 1; // From all-games view, start at game 1
      if (prev >= currentMonthData.totalGames) return 0; // At last game, go to full view
      return prev + 1;
    });
  }, [currentMonthData]);

  // Seek handler for the timeline slider
  const handleTimelineSeek = useCallback((index: number) => {
    setCurrentGameIndex(index);
  }, []);

  const handleTimelinePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Player click handler — navigate to game details
  const handlePlayerClick = useCallback((playerName: string) => {
    navigateToGameDetails({
      selectedPlayer: playerName,
      selectedPlayerWinMode: 'wins-only',
      fromComponent: `Classement Mensuel — ${currentMonthData?.label || ''}`
    });
  }, [navigateToGameDetails, currentMonthData]);

  // Game context click handler
  const handleGameClick = useCallback((gameId: string) => {
    navigateToGameDetails({
      selectedGame: gameId,
      fromComponent: `Classement Mensuel — ${currentMonthData?.label || ''}`
    });
  }, [navigateToGameDetails, currentMonthData]);

  // Transition duration = 80% of play speed for smooth overlap
  const transitionDuration = Math.round(playSpeed * 0.8);
  const isAnimating = currentGameIndex > 0;

  if (!gameData || gameData.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée disponible pour le classement mensuel</div>;
  }

  if (monthKeys.length === 0) {
    return <div className="donnees-manquantes">Aucun mois avec des parties trouvé</div>;
  }

  return (
    <div className="lycans-players-stats">
      <h2>Classement Mensuel</h2>
      <p className="lycans-stats-info">
        Classement des joueurs par taux de victoire pour chaque mois
        <br />
        <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
          Seuls les joueurs ayant participé à au moins 40% des parties du mois sont classés
        </span>
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>Classement Mensuel — Taux de Victoire</h3>
            {highlightedPlayerAdded && settings.highlightedPlayer && (
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--accent-primary)',
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du classement
              </p>
            )}
          </div>

          {/* Month navigation controls */}
          <div className="monthly-nav">
            <button onClick={goToPrevMonth} disabled={!canGoPrev}>◀</button>
            <select
              value={effectiveMonth || ''}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthKeys.map(key => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
            <button onClick={goToNextMonth} disabled={!canGoNext}>▶</button>
          </div>

          {/* Animation controls */}
          {currentMonthData && currentMonthData.totalGames > 0 && (
            <>
              <div className="monthly-controls">
                <button onClick={handleStepBackward}>
                  ◀ Précédente
                </button>

                <button
                  className={`monthly-play-btn ${isPlaying ? 'monthly-play-btn--active' : ''}`}
                  onClick={handlePlayPause}
                  disabled={currentMonthData.totalGames === 0}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>

                <button
                  onClick={handleStepForward}
                >
                  Suivante ▶
                </button>

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
                totalGames={currentMonthData.totalGames}
                currentGameIndex={currentGameIndex}
                isPlaying={isPlaying}
                onSeek={handleTimelineSeek}
                onPause={handleTimelinePause}
              />
            </>
          )}

          {/* Game context panel — shows info about the latest game during playback */}
          {isAnimating && currentGame && (
            <MonthlyRankingGameContext
              game={currentGame}
              onGameClick={handleGameClick}
            />
          )}

          {/* Bar race chart */}
          <FullscreenChart title={`Classement Mensuel — ${currentMonthData?.label || ''}`}>
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
            {currentMonthData && (
              <>
                {barRacePlayers.filter(p => !p.isHighlightedAddition).length} joueur{barRacePlayers.filter(p => !p.isHighlightedAddition).length > 1 ? 's' : ''} classé{barRacePlayers.filter(p => !p.isHighlightedAddition).length > 1 ? 's' : ''} sur{' '}
                {effectiveTotalGames} partie{effectiveTotalGames > 1 ? 's' : ''}{currentGameIndex > 0 ? ' (animation)' : ' ce mois'}
                {' '}(min. {minGamesRequired} partie{minGamesRequired > 1 ? 's' : ''} — {Math.round(MIN_PARTICIPATION_RATIO * 100)}%)
                {averageWinRate !== '0' && (
                  <> · Moyenne: {averageWinRate}%</>
                )}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
