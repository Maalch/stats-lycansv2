import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTalkingTimeStats } from '../../hooks/useTalkingTimeStats';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { formatSecondsToMinutesSeconds } from '../../utils/durationFormatters';
import type { PlayerTalkingTimeStats } from '../../hooks/utils/talkingTimeUtils';

// Extended type for chart data with highlighting info
type ChartTalkingTimeStat = PlayerTalkingTimeStats & {
  isHighlightedAddition?: boolean;
};

type TalkingTimeMode = 'total' | 'outside' | 'during';

const minGamesOptions = [3, 5, 15, 25, 50, 100];

export function TalkingTimeChart() {
  const { data: talkingTimeData, isLoading: dataLoading, error: fetchError } = useTalkingTimeStats();
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();

  // Use navigationState to restore state from achievement navigation, with fallbacks to defaults
  const [minGames, setMinGames] = useState<number>(
    navigationState.talkingTimeState?.minGames || 5
  );
  const [displayMode, setDisplayMode] = useState<TalkingTimeMode>(
    navigationState.talkingTimeState?.displayMode || 'total'
  );
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Save state to navigation context when it changes
  useEffect(() => {
    const currentNavState = navigationState.talkingTimeState;
    if (!currentNavState || 
        currentNavState.minGames !== minGames ||
        currentNavState.displayMode !== displayMode) {
      updateNavigationState({
        talkingTimeState: {
          minGames,
          displayMode,
          focusChart: currentNavState?.focusChart
        }
      });
    }
  }, [minGames, displayMode, updateNavigationState]);

  // Data processing with highlighting support
  const { chartData, highlightedPlayerAdded } = useMemo(() => {
    if (!talkingTimeData?.playerStats) {
      return {
        chartData: [],
        highlightedPlayerAdded: false
      };
    }

    const stats = talkingTimeData.playerStats;

    // Filter players by minimum games threshold
    const eligiblePlayers = stats.filter(player => player.gamesPlayed >= minGames);

    // Determine which stat to sort by based on display mode
    const getSortValue = (player: PlayerTalkingTimeStats): number => {
      switch (displayMode) {
        case 'outside':
          return player.secondsOutsidePer60Min;
        case 'during':
          return player.secondsDuringPer60Min;
        case 'total':
        default:
          return player.secondsAllPer60Min;
      }
    };

    // Sort and take top 20
    const sortedPlayers = eligiblePlayers
      .sort((a, b) => getSortValue(b) - getSortValue(a))
      .slice(0, 20);

    // Check if highlighted player is in top 20
    const highlightedInTop20 = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    // Add highlighted player if not in top 20 or doesn't meet min games
    let finalChartData: ChartTalkingTimeStat[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop20) {
      const highlightedPlayerData = stats.find(p => p.player === settings.highlightedPlayer);

      if (highlightedPlayerData) {
        finalChartData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        playerAdded = true;
      }
    }

    return {
      chartData: finalChartData,
      highlightedPlayerAdded: playerAdded
    };
  }, [talkingTimeData, minGames, displayMode, settings.highlightedPlayer]);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des statistiques de temps de parole...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!talkingTimeData) {
    return <div className="donnees-manquantes">Aucune donnée de temps de parole disponible</div>;
  }

  // Get display value based on mode
  const getDisplayValue = (player: ChartTalkingTimeStat): number => {
    switch (displayMode) {
      case 'outside':
        return player.secondsOutsidePer60Min;
      case 'during':
        return player.secondsDuringPer60Min;
      case 'total':
      default:
        return player.secondsAllPer60Min;
    }
  };

  // Get chart title based on mode
  const getChartTitle = (): string => {
    switch (displayMode) {
      case 'outside':
        return 'Temps de Parole Hors Meeting (par 60 min)';
      case 'during':
        return 'Temps de Parole En Meeting (par 60 min)';
      case 'total':
      default:
        return 'Temps de Parole Total (par 60 min)';
    }
  };

  // Get Y-axis label based on mode
  const getYAxisLabel = (): string => {
    switch (displayMode) {
      case 'outside':
        return 'Temps hors meeting (par 60 min)';
      case 'during':
        return 'Temps en meeting (par 60 min)';
      case 'total':
      default:
        return 'Temps de parole (par 60 min)';
    }
  };

  const eligiblePlayersCount = talkingTimeData.playerStats.filter(
    p => p.gamesPlayed >= minGames
  ).length;

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Temps de Parole</h2>
      <p className="lycans-stats-info">
        {talkingTimeData.gamesWithTalkingData} parties avec données de temps de parole (depuis la version 0.215 uniquement) 
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>{getChartTitle()}</h3>
            {highlightedPlayerAdded && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary-text)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>

          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="display-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Mode d'affichage:
            </label>
            <select
              id="display-mode-select"
              value={displayMode}
              onChange={e => setDisplayMode(e.target.value as TalkingTimeMode)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              <option value="total">Temps Total</option>
              <option value="outside">Hors Meeting</option>
              <option value="during">En Meeting</option>
            </select>

            <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-select"
              value={minGames}
              onChange={(e) => setMinGames(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              {minGamesOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <FullscreenChart title={getChartTitle()}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                    label={{ 
                      value: getYAxisLabel(), 
                      angle: 270, 
                      position: 'left', 
                      offset: 15,
                      style: { textAnchor: 'middle' } 
                    }}
                    tickFormatter={(value) => formatSecondsToMinutesSeconds(value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload as ChartTalkingTimeStat;
                        const isHighlightedAddition = d.isHighlightedAddition;

                        return (
                          <div
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                            <div>Parties jouées: {d.gamesPlayed}</div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                              <strong>Par 60 minutes:</strong>
                            </div>
                            <div>Total: {formatSecondsToMinutesSeconds(d.secondsAllPer60Min)}</div>
                            <div>Hors meeting: {formatSecondsToMinutesSeconds(d.secondsOutsidePer60Min)}</div>
                            <div>En meeting: {formatSecondsToMinutesSeconds(d.secondsDuringPer60Min)}</div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                              <strong>Temps cumulés:</strong>
                            </div>
                            <div>Total: {formatSecondsToMinutesSeconds(d.totalSecondsAll)}</div>
                            <div>Hors meeting: {formatSecondsToMinutesSeconds(d.totalSecondsOutside)}</div>
                            <div>En meeting: {formatSecondsToMinutesSeconds(d.totalSecondsDuring)}</div>
                            {isHighlightedAddition && (
                              <div style={{ 
                                marginTop: '4px', 
                                paddingTop: '4px', 
                                borderTop: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                fontStyle: 'italic'
                              }}>
                                🎯 Affiché via sélection personnelle
                                {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey={(entry: ChartTalkingTimeStat) => getDisplayValue(entry)}>
                    {chartData.map((entry, index) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                      const isHoveredPlayer = highlightedPlayer === entry.player;
                      const isHighlightedAddition = entry.isHighlightedAddition;

                      const playerColor = playersColor[entry.player] || 'var(--chart-primary)';

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            isHighlightedFromSettings ? 'var(--accent-primary)' :
                            isHighlightedAddition ? 'var(--accent-secondary)' :
                            playerColor
                          }
                          stroke={
                            isHighlightedFromSettings ? "var(--accent-primary)" :
                            isHoveredPlayer ? "#000000" : 
                            "none"
                          }
                          strokeWidth={
                            isHighlightedFromSettings ? 3 :
                            isHoveredPlayer ? 2 : 
                            0
                          }
                          strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                          opacity={isHighlightedAddition ? 0.8 : 1}
                          onClick={() => navigateToGameDetails({ selectedPlayer: entry.player })}
                          onMouseEnter={() => setHighlightedPlayer(entry.player)}
                          onMouseLeave={() => setHighlightedPlayer(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {chartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            Temps normalisé par 60 minutes de jeu · Calculé sur {talkingTimeData.gamesWithTalkingData} parties avec données
          </p>
        </div>
      </div>
    </div>
  );
}
