import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Rectangle } from 'recharts';
import { usePlayerStatsFromRaw } from '../../hooks/usePlayerStatsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { minGamesOptions } from '../../types/api';
import { MIN_GAMES_DEFAULTS, CHART_LIMITS } from '../../config/chartConstants';
import type { PlayerStat } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { MonthlyRankingView } from './MonthlyRankingView';

// Extended type for chart data with highlighting info
type ChartPlayerStat = PlayerStat & {
  isHighlightedAddition?: boolean;
};

// Consistent chart height for both charts
const CHART_HEIGHT = 400;

export function PlayersGeneralStatisticsChart() {
  const { data: playerStatsData, isLoading: dataLoading, error: fetchError } = usePlayerStatsFromRaw();
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  
  // Use navigationState to restore state from ranking navigation, with fallbacks to defaults
  const [minGamesForWinRate, setMinGamesForWinRate] = useState<number>(
    navigationState.playersGeneralState?.minGamesForWinRate || MIN_GAMES_DEFAULTS.MEDIUM
  );
  const [winRateOrder, setWinRateOrder] = useState<'best' | 'worst'>(
    navigationState.playersGeneralState?.winRateOrder || 'best'
  );
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    navigationState.playersGeneralState?.selectedMonth || null
  );

  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Save state to navigation context when it changes (for back/forward navigation persistence)
  useEffect(() => {
    // Only update if state differs from navigation state
    const currentNavState = navigationState.playersGeneralState;
    if (!currentNavState || 
        currentNavState.minGamesForWinRate !== minGamesForWinRate ||
        currentNavState.winRateOrder !== winRateOrder ||
        currentNavState.selectedMonth !== selectedMonth) {
      updateNavigationState({
        playersGeneralState: {
          minGamesForWinRate,
          winRateOrder,
          focusChart: currentNavState?.focusChart, // Preserve focus chart from ranking navigation
          selectedMonth: selectedMonth || undefined
        }
      });
    }
  }, [minGamesForWinRate, winRateOrder, selectedMonth, updateNavigationState]);

  // Optimized data processing - combine multiple operations to reduce iterations
  const { participationData, winRateData, averageWinRate, totalEligiblePlayers, highlightedPlayerInParticipation, highlightedPlayerInWinRate } = useMemo(() => {
    if (!playerStatsData?.playerStats) {
      return {
        participationData: [],
        winRateData: [],
        averageWinRate: '0',
        totalEligiblePlayers: 0,
        highlightedPlayerInParticipation: false,
        highlightedPlayerInWinRate: false
      };
    }

    const stats = playerStatsData.playerStats;
    
    // Single pass to filter and calculate what we need
    const eligibleForWinRate = [];
    const eligibleForParticipation = [];
    let totalWinPercentSum = 0;
    
    for (const player of stats) {
      totalWinPercentSum += parseFloat(player.winPercent);
      
      // Only include players who actually meet the minimum games criteria
      if (player.gamesPlayed >= minGamesForWinRate) {
        eligibleForWinRate.push(player);
      }
      
      if (player.gamesPlayed > 2) {
        eligibleForParticipation.push(player);
      }
    }

    // Calculate average win rate
    const avgWinRate = stats.length > 0 ? (totalWinPercentSum / stats.length).toFixed(1) : '0';
    
    // Sort and slice for participation data
    const sortedParticipation = eligibleForParticipation
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, CHART_LIMITS.TOP_15);
    
    // Check if highlighted player is in the top 15 participation
    const highlightedPlayerInTop15 = settings.highlightedPlayer && 
      sortedParticipation.some(p => p.player === settings.highlightedPlayer);
    
    // If highlighted player is not in top 15 but exists in eligible data, add them
    let finalParticipationData: ChartPlayerStat[] = [...sortedParticipation];
    let highlightedPlayerAddedToParticipation = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTop15) {
      const highlightedPlayerData = eligibleForParticipation.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        // Add highlighted player with a special flag
        finalParticipationData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        } as ChartPlayerStat);
        highlightedPlayerAddedToParticipation = true;
      }
    }
    
    // Sort and slice for win rate data
    const sortedWinRate = eligibleForWinRate
      .sort((a, b) =>
        winRateOrder === 'best'
          ? parseFloat(b.winPercent) - parseFloat(a.winPercent)
          : parseFloat(a.winPercent) - parseFloat(b.winPercent)
      )
      .slice(0, CHART_LIMITS.TOP_15);

    // Check if highlighted player is in the top 15 win rate
    const highlightedPlayerInWinRateTop15 = settings.highlightedPlayer && 
      sortedWinRate.some(p => p.player === settings.highlightedPlayer);
    
    // If highlighted player is not in top 15 OR doesn't meet min games criteria, add them
    let finalWinRateData: ChartPlayerStat[] = [...sortedWinRate];
    let highlightedPlayerAddedToWinRate = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInWinRateTop15) {
      // Search for highlighted player in all stats (not just eligible)
      const highlightedPlayerData = stats.find(p => p.player === settings.highlightedPlayer);
      
      if (highlightedPlayerData) {
        // Add highlighted player with a special flag
        finalWinRateData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        } as ChartPlayerStat);
        highlightedPlayerAddedToWinRate = true;
      }
    }

    return {
      participationData: finalParticipationData,
      winRateData: finalWinRateData,
      averageWinRate: avgWinRate,
      totalEligiblePlayers: eligibleForWinRate.length,
      highlightedPlayerInParticipation: highlightedPlayerAddedToParticipation,
      highlightedPlayerInWinRate: highlightedPlayerAddedToWinRate
    };
  }, [playerStatsData, minGamesForWinRate, winRateOrder, settings.highlightedPlayer]);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des statistiques des joueurs...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!playerStatsData) {
    return <div className="donnees-manquantes">Aucune donnée de joueur disponible</div>;
  }

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques des Joueurs</h2>
      <p className="lycans-stats-info">
        Total de {playerStatsData.totalGames} parties analysées avec {playerStatsData.playerStats.length} joueurs
      </p>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>Top Participations</h3>
            {highlightedPlayerInParticipation && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <FullscreenChart title="Top Participations">
          <div style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={participationData}
                margin={{ top: 100, right: 30, left: 20, bottom: 10 }}
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
                <YAxis label={{ value: 'Nombre de parties', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      const isHighlightedAddition = (d as ChartPlayerStat).isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.player;
                      
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.player}</strong></div>
                          <div>Parties jouées : {d.gamesPlayed}</div>
                          <div>Pourcentage : {d.gamesPlayedPercent}%</div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection personnelle
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
                  dataKey="gamesPlayed"
                  name="Parties jouées"
                  fill="#00C49F"
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as ChartPlayerStat;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                    const isHoveredPlayer = highlightedPlayer === entry.player;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[entry.player] || '#00C49F'}
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
                            fromComponent: 'Statistiques Joueurs'
                          });
                        }}
                        onMouseEnter={() => setHighlightedPlayer(entry.player)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </FullscreenChart>
        </div>

        <div className="lycans-graphique-section">
          <div>
            <h3>
              {winRateOrder === 'best'
                ? 'Meilleurs Taux de Victoire'
                : 'Moins Bons Taux de Victoire'}
            </h3>
            {highlightedPlayerInWinRate && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary-text)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>

              <select
                value={winRateOrder}
                onChange={e => setWinRateOrder(e.target.value as 'best' | 'worst')}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <option value="best">Meilleurs Taux de Victoire</option>
                <option value="worst">Moins Bons Taux de Victoire</option>
              </select>
              <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. parties:
              </label>
              <select
                id="min-games-select"
                value={minGamesForWinRate}
                onChange={(e) => setMinGamesForWinRate(Number(e.target.value))}
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
          <FullscreenChart title={winRateOrder === 'best'
                ? 'Meilleurs Taux de Victoire'
                : 'Moins Bons Taux de Victoire'}>
          
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={winRateData}
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
                      const d = payload[0].payload;
                      const isHighlightedAddition = (d as ChartPlayerStat).isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.player;
                      const meetsMinGames = d.gamesPlayed >= minGamesForWinRate;
                      
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.player}</strong></div>
                          <div>Taux de victoire : {d.winPercent}%</div>
                          <div>Victoires : {d.wins} / {d.gamesPlayed}</div>
                          {isHighlightedAddition && !meetsMinGames && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              🎯 Affiché via sélection (&lt; {minGamesForWinRate} parties)
                            </div>
                          )}
                          {isHighlightedAddition && meetsMinGames && (
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
                    const entry = payload as ChartPlayerStat;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                    const isHoveredPlayer = highlightedPlayer === entry.player;
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
                            fromComponent: 'Taux de Victoire'
                          });
                        }}
                        onMouseEnter={() => setHighlightedPlayer(entry.player)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              {/* Add the average win rate reference line */}
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
          </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {winRateData.length} des joueurs (sur {totalEligiblePlayers} ayant au moins {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
          </p>
        </div>

        <MonthlyRankingView
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>
    </div>
  );
}