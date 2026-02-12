import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { CHART_LIMITS } from '../../config/chartConstants';
import { getPlayerId } from '../../utils/playerIdentification';
import { FullscreenChart } from '../common/FullscreenChart';

// Threshold: player must have played at least 40% of month's games to be ranked
const MIN_PARTICIPATION_RATIO = 0.4;

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

interface MonthlyRankingViewProps {
  selectedMonth: string | null;
  onMonthChange: (month: string) => void;
}

export function MonthlyRankingView({ selectedMonth, onMonthChange }: MonthlyRankingViewProps) {
  const { gameData } = useCombinedFilteredRawData();
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

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

  // Build chart data with highlighted player logic
  const { chartData, highlightedPlayerAdded, averageWinRate, minGamesRequired } = useMemo(() => {
    if (!currentMonthData) {
      return { chartData: [], highlightedPlayerAdded: false, averageWinRate: '0', minGamesRequired: 0 };
    }

    const minGames = Math.ceil(currentMonthData.totalGames * MIN_PARTICIPATION_RATIO);
    const topPlayers = currentMonthData.players.slice(0, CHART_LIMITS.TOP_15);

    // Average win rate across eligible players
    let totalWinPercent = 0;
    for (const p of currentMonthData.players) {
      totalWinPercent += parseFloat(p.winPercent);
    }
    const avgWinRate = currentMonthData.players.length > 0
      ? (totalWinPercent / currentMonthData.players.length).toFixed(1)
      : '0';

    // Check if highlighted player is in top 15
    let finalData: MonthlyPlayerStat[] = [...topPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer) {
      const inTop = topPlayers.some(p => p.player === settings.highlightedPlayer);
      if (!inTop) {
        // Search in all month data (even below threshold)
        const fromEligible = currentMonthData.players.find(p => p.player === settings.highlightedPlayer);
        if (fromEligible) {
          finalData.push({ ...fromEligible, isHighlightedAddition: true });
          playerAdded = true;
        } else if (gameData) {
          // Player might not meet threshold - find them anyway
          const date = new Date(effectiveMonth + '-01');
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

          let gp = 0;
          let wins = 0;
          for (const game of gameData) {
            const gDate = new Date(game.StartDate);
            if (gDate >= monthStart && gDate <= monthEnd) {
              for (const ps of game.PlayerStats) {
                if (ps.Username === settings.highlightedPlayer) {
                  gp++;
                  if (ps.Victorious) wins++;
                }
              }
            }
          }
          if (gp > 0) {
            finalData.push({
              player: settings.highlightedPlayer,
              gamesPlayed: gp,
              wins,
              winPercent: ((wins / gp) * 100).toFixed(1),
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
    };
  }, [currentMonthData, settings.highlightedPlayer, gameData, effectiveMonth]);

  // Navigation handlers
  const currentIndex = effectiveMonth ? monthKeys.indexOf(effectiveMonth) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < monthKeys.length - 1;

  const goToPrevMonth = useCallback(() => {
    if (canGoPrev) {
      onMonthChange(monthKeys[currentIndex - 1]);
    }
  }, [canGoPrev, currentIndex, monthKeys, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    if (canGoNext) {
      onMonthChange(monthKeys[currentIndex + 1]);
    }
  }, [canGoNext, currentIndex, monthKeys, onMonthChange]);

  if (!gameData || gameData.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée disponible pour le classement mensuel</div>;
  }

  if (monthKeys.length === 0) {
    return <div className="donnees-manquantes">Aucun mois avec des parties trouvé</div>;
  }

  return (
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
          onChange={(e) => onMonthChange(e.target.value)}
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
                >
                  {chartData.map((entry) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                    const isHoveredPlayer = hoveredPlayer === entry.player;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    return (
                      <Cell
                        key={`cell-monthly-${entry.player}`}
                        fill={playersColor[entry.player] || "#8884d8"}
                        stroke={
                          isHighlightedFromSettings
                            ? "var(--accent-primary)"
                            : isHoveredPlayer
                              ? "var(--text-primary)"
                              : "none"
                        }
                        strokeWidth={
                          isHighlightedFromSettings
                            ? 3
                            : isHoveredPlayer
                              ? 2
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
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
                  })}
                </Bar>
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
            {currentMonthData.totalGames} partie{currentMonthData.totalGames > 1 ? 's' : ''} ce mois
            {' '}(min. {minGamesRequired} partie{minGamesRequired > 1 ? 's' : ''} — {Math.round(MIN_PARTICIPATION_RATIO * 100)}%)
          </>
        )}
      </p>
    </div>
  );
}
