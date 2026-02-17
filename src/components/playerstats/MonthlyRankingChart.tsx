import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Rectangle } from 'recharts';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useCombinedFilteredRawData, type GameLogEntry } from '../../hooks/useCombinedRawData';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { CHART_LIMITS } from '../../config/chartConstants';
import { getPlayerId } from '../../utils/playerIdentification';
import { FullscreenChart } from '../common/FullscreenChart';

// Threshold: player must have played at least 40% of month's games to be ranked
const MIN_PARTICIPATION_RATIO = 0.40;

interface MonthlyPlayerStat {
  player: string;
  gamesPlayed: number;
  wins: number;
  winPercent: string;
  isHighlightedAddition?: boolean;
}

interface MonthData {
  key: string;        // "YYYY-MM" for sorting
  label: string;      // "Février 2026" for display
  totalGames: number;
  players: MonthlyPlayerStat[];
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
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  
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

    // Build player stats per month
    const monthsMap = new Map<string, MonthData>();
    for (const [key, games] of monthGames) {
      const totalGames = games.length;
      const minGamesRequired = Math.ceil(totalGames * MIN_PARTICIPATION_RATIO);

      // Aggregate player stats for this month
      const playerMap = new Map<string, { displayName: string; gamesPlayed: number; wins: number }>();
      for (const game of games) {
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

      // Filter to players meeting 40% threshold and build stats
      const players: MonthlyPlayerStat[] = [];
      for (const [, stats] of playerMap) {
        if (stats.gamesPlayed >= minGamesRequired) {
          players.push({
            player: stats.displayName,
            gamesPlayed: stats.gamesPlayed,
            wins: stats.wins,
            winPercent: stats.gamesPlayed > 0
              ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
              : '0.0',
          });
        }
      }

      // Sort by win rate descending
      players.sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));

      monthsMap.set(key, {
        key,
        label: formatMonthLabel(key),
        totalGames,
        players,
        sortedGames: games, // Already chronologically sorted from source
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

  // Reset animation when month changes
  useEffect(() => {
    setCurrentGameIndex(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [effectiveMonth]);

  // Build chart data with highlighted player logic (supports animation)
  const { chartData, highlightedPlayerAdded, averageWinRate, minGamesRequired, effectiveTotalGames } = useMemo(() => {
    if (!currentMonthData) {
      return { chartData: [], highlightedPlayerAdded: false, averageWinRate: '0', minGamesRequired: 0, effectiveTotalGames: 0 };
    }

    // When animating (currentGameIndex > 0), use subset of games
    const isAnimating = currentGameIndex > 0;
    const gamesToConsider = isAnimating 
      ? currentMonthData.sortedGames.slice(0, currentGameIndex)
      : currentMonthData.sortedGames;
    const effectiveTotal = isAnimating ? currentGameIndex : currentMonthData.totalGames;
    const minGames = Math.ceil(effectiveTotal * MIN_PARTICIPATION_RATIO);

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

    // Build and filter players meeting threshold
    const eligiblePlayers: MonthlyPlayerStat[] = [];
    for (const [, stats] of playerMap) {
      if (stats.gamesPlayed >= minGames) {
        eligiblePlayers.push({
          player: stats.displayName,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          winPercent: stats.gamesPlayed > 0
            ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
            : '0.0',
        });
      }
    }

    // Sort by win rate descending
    eligiblePlayers.sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
    const topPlayers = eligiblePlayers.slice(0, CHART_LIMITS.TOP_15);

    // Average win rate across eligible players
    let totalWinPercent = 0;
    for (const p of eligiblePlayers) {
      totalWinPercent += parseFloat(p.winPercent);
    }
    const avgWinRate = eligiblePlayers.length > 0
      ? (totalWinPercent / eligiblePlayers.length).toFixed(1)
      : '0';

    // Check if highlighted player is in top 15
    let finalData: MonthlyPlayerStat[] = [...topPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer) {
      const inTop = topPlayers.some(p => p.player === settings.highlightedPlayer);
      if (!inTop) {
        // Search in eligible players (even below top 15)
        const fromEligible = eligiblePlayers.find(p => p.player === settings.highlightedPlayer);
        if (fromEligible) {
          finalData.push({ ...fromEligible, isHighlightedAddition: true });
          playerAdded = true;
        } else {
          // Player might not meet threshold - search in gamesToConsider
          const playerStats = playerMap.get(settings.highlightedPlayer);
          if (playerStats && playerStats.gamesPlayed > 0) {
            finalData.push({
              player: settings.highlightedPlayer,
              gamesPlayed: playerStats.gamesPlayed,
              wins: playerStats.wins,
              winPercent: ((playerStats.wins / playerStats.gamesPlayed) * 100).toFixed(1),
              isHighlightedAddition: true,
            });
            playerAdded = true;
          }
        }
      }
    }

    return {
      chartData: finalData,
      highlightedPlayerAdded: playerAdded,
      averageWinRate: avgWinRate,
      minGamesRequired: minGames,
      effectiveTotalGames: effectiveTotal,
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
        // Wrap around from all-games view to second-to-last game (or first game if only 1 game)
        return Math.max(1, currentMonthData.totalGames - 1);
      }
      return Math.max(1, prev - 1);
    });
  }, [currentMonthData]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentGameIndex(prev => {
      if (!currentMonthData) return prev;
      if (prev === 0) return 0; // Already at end
      return Math.min(currentMonthData.totalGames, prev + 1);
    });
  }, [currentMonthData]);

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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <button
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              style={{
                background: 'var(--bg-tertiary)',
                color: canGoPrev ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.4rem 0.8rem',
                fontSize: '1rem',
                cursor: canGoPrev ? 'pointer' : 'not-allowed',
                opacity: canGoPrev ? 1 : 0.5
              }}
            >
              ◀
            </button>

            <select
              value={effectiveMonth || ''}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                minWidth: '180px',
                textAlign: 'center'
              }}
            >
              {monthKeys.map(key => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>

            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              style={{
                background: 'var(--bg-tertiary)',
                color: canGoNext ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.4rem 0.8rem',
                fontSize: '1rem',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                opacity: canGoNext ? 1 : 0.5
              }}
            >
              ▶
            </button>
          </div>

          {/* Animation controls */}
          {currentMonthData && currentMonthData.totalGames > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                onClick={handleStepBackward}
                disabled={!currentMonthData || currentMonthData.totalGames === 0}
                style={{
                  background: 'var(--bg-secondary)',
                  color: (currentMonthData && currentMonthData.totalGames > 0) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.9rem',
                  cursor: (currentMonthData && currentMonthData.totalGames > 0) ? 'pointer' : 'not-allowed',
                  opacity: (currentMonthData && currentMonthData.totalGames > 0) ? 1 : 0.5
                }}
              >
                ◀ Précédente
              </button>

              <button
                onClick={handlePlayPause}
                disabled={currentMonthData.totalGames === 0}
                style={{
                  background: isPlaying ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: isPlaying ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.5rem 1.2rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: currentMonthData.totalGames > 0 ? 'pointer' : 'not-allowed',
                  opacity: currentMonthData.totalGames > 0 ? 1 : 0.5,
                  minWidth: '120px'
                }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              <button
                onClick={handleStepForward}
                disabled={currentGameIndex === 0 || currentGameIndex >= currentMonthData.totalGames}
                style={{
                  background: 'var(--bg-secondary)',
                  color: (currentGameIndex > 0 && currentGameIndex < currentMonthData.totalGames) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.9rem',
                  cursor: (currentGameIndex > 0 && currentGameIndex < currentMonthData.totalGames) ? 'pointer' : 'not-allowed',
                  opacity: (currentGameIndex > 0 && currentGameIndex < currentMonthData.totalGames) ? 1 : 0.5
                }}
              >
                Suivante ▶
              </button>

              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.9rem',
                  marginLeft: '0.5rem'
                }}
              >
                <option value={2000}>Lent (2s)</option>
                <option value={1000}>Normal (1s)</option>
                <option value={500}>Rapide (0.5s)</option>
              </select>

              {currentGameIndex > 0 && (
                <div style={{
                  marginLeft: '1rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  fontWeight: 'bold'
                }}>
                  Partie {currentGameIndex} / {currentMonthData.totalGames}
                </div>
              )}
            </div>
          )}

          <FullscreenChart title={`Classement Mensuel — ${currentMonthData?.label || ''}`}>
            <div style={{ height: 400 }}>
              {chartData.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem'
                }}>
                  Aucun joueur n'a joué au moins {minGamesRequired} partie{minGamesRequired > 1 ? 's' : ''} ce mois-ci
                  ({Math.round(MIN_PARTICIPATION_RATIO * 100)}% de {currentMonthData?.totalGames ?? 0} parties)
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="player"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                          fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                          fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <YAxis
                      label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload as MonthlyPlayerStat;
                          const isHighlightedAddition = d.isHighlightedAddition;
                          const isHighlightedFromSettings = settings.highlightedPlayer === d.player;
                          const meetsThreshold = d.gamesPlayed >= minGamesRequired;

                          return (
                            <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                              <div><strong>{d.player}</strong></div>
                              <div>Taux de victoire : {d.winPercent}%</div>
                              <div>Victoires : {d.wins} / {d.gamesPlayed} parties</div>
                              {isHighlightedAddition && !meetsThreshold && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--accent-primary)',
                                  marginTop: '0.25rem',
                                  fontStyle: 'italic'
                                }}>
                                  🎯 Affiché via sélection (&lt; {minGamesRequired} parties requises)
                                </div>
                              )}
                              {isHighlightedAddition && meetsThreshold && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--accent-primary)',
                                  marginTop: '0.25rem',
                                  fontStyle: 'italic'
                                }}>
                                  🎯 Affiché via sélection (hors top 15)
                                </div>
                              )}
                              {isHighlightedFromSettings && !isHighlightedAddition && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--accent-primary)',
                                  marginTop: '0.25rem',
                                  fontStyle: 'italic'
                                }}>
                                  🎯 Joueur sélectionné
                                </div>
                              )}
                              <div style={{
                                fontSize: '0.8rem',
                                color: 'var(--accent-primary)',
                                marginTop: '0.5rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                animation: 'pulse 1.5s infinite'
                              }}>
                                🖱️ Cliquez pour voir les parties
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="winPercent"
                      name="Taux de Victoire"
                      fill="#8884d8"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as MonthlyPlayerStat;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHoveredPlayer = hoveredPlayer === entry.player;
                        const isHighlightedAddition = entry.isHighlightedAddition;

                        return (
                          <Rectangle
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={playersColor[entry.player] || '#8884d8'}
                            stroke={
                              isHighlightedFromSettings
                                ? 'var(--accent-primary)'
                                : isHoveredPlayer
                                  ? 'var(--text-primary)'
                                  : 'none'
                            }
                            strokeWidth={
                              isHighlightedFromSettings
                                ? 3
                                : isHoveredPlayer
                                  ? 2
                                  : 0
                            }
                            strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                            onClick={() => {
                              navigateToGameDetails({
                                selectedPlayer: entry.player,
                                selectedPlayerWinMode: 'wins-only',
                                fromComponent: `Classement Mensuel — ${currentMonthData?.label || ''}`
                              });
                            }}
                            onMouseEnter={() => setHoveredPlayer(entry.player)}
                            onMouseLeave={() => setHoveredPlayer(null)}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      }}
                    />
                    <ReferenceLine
                      y={parseFloat(averageWinRate)}
                      stroke="red"
                      strokeDasharray="3 3"
                      label={{
                        value: `Moyenne: ${averageWinRate}%`,
                        position: 'insideBottomRight',
                        fill: 'red',
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </FullscreenChart>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            {currentMonthData && (
              <>
                {chartData.filter(p => !p.isHighlightedAddition).length} joueur{chartData.filter(p => !p.isHighlightedAddition).length > 1 ? 's' : ''} classé{chartData.filter(p => !p.isHighlightedAddition).length > 1 ? 's' : ''} sur{' '}
                {effectiveTotalGames} partie{effectiveTotalGames > 1 ? 's' : ''}{currentGameIndex > 0 ? ' (animation)' : ' ce mois'}
                {' '}(min. {minGamesRequired} partie{minGamesRequired > 1 ? 's' : ''} — {Math.round(MIN_PARTICIPATION_RATIO * 100)}%)
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
