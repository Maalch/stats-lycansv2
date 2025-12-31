import { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useFilteredMiniBRData, useFilteredMiniBRGlobalData } from '../../hooks/useRawBRData';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, getRandomColor } from '../../types/api';

// Extended type for chart data with highlighting info
interface ChartPlayerStat {
  name: string;
  participations: number;
  wins: number;
  totalScore: number;
  averageScore: number;
  winRate: number;
  isHighlightedAddition?: boolean;
}

// Min games options for Mini BR
const minGamesOptions = [1, 2, 3, 5, 10];

export function BRMiniChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredMiniBRData();
  const { data: globalData, isLoading: globalLoading, error: globalError } = useFilteredMiniBRGlobalData();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [winRateView, setWinRateView] = useState<'wins' | 'winRate'>('wins');
  const [killsView, setKillsView] = useState<'total' | 'average'>('total');
  const [minGamesForWinRate, setMinGamesForWinRate] = useState<number>(1);
  const [minGamesForKills, setMinGamesForKills] = useState<number>(1);

  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Chart colors using CSS custom properties
  const chartColors = [
    'var(--chart-color-1)',
    'var(--chart-color-2)', 
    'var(--chart-color-3)',
    'var(--chart-color-4)',
    'var(--chart-color-5)',
    'var(--chart-color-6)'
  ];

  // Helper function to get player color
  const getPlayerColor = (playerName: string) => {
    return playersColor[playerName] || getRandomColor(playerName);
  };

  const stats = useMemo(() => {
    if (!brData || !globalData) return null;

    // Calcul des statistiques générales
    const totalGames = globalData.length;
    const totalParticipations = brData.length;
    const totalWins = brData.filter(p => p.Gagnant).length;
    
    // Statistiques par joueur
    const playerStats = brData.reduce((acc, participation) => {
      const player = participation.Participants;
      if (!acc[player]) {
        acc[player] = {
          name: player,
          participations: 0,
          wins: 0,
          totalScore: 0,
          averageScore: 0,
          winRate: 0
        };
      }
      
      acc[player].participations++;
      acc[player].totalScore += participation.Score;
      if (participation.Gagnant) {
        acc[player].wins++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calcul des moyennes et taux de victoire
    Object.values(playerStats).forEach((player: any) => {
      player.averageScore = player.totalScore / player.participations;
      player.winRate = (player.wins / player.participations) * 100;
    });

    // Top joueurs par participations
    const sortedByParticipations = Object.values(playerStats)
      .sort((a: any, b: any) => b.participations - a.participations);
    
    const top15Participations = sortedByParticipations.slice(0, 15);
    
    // Check if highlighted player is in top 15 participations
    const highlightedPlayerInTop15Participations = settings.highlightedPlayer && 
      top15Participations.some(p => p.name === settings.highlightedPlayer);
    
    // If highlighted player is not in top 15 but exists in all stats, add them
    let highlightedPlayerAddedToParticipations = false;
    let topPlayersByParticipations: ChartPlayerStat[] = [...top15Participations];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15Participations) {
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByParticipations.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToParticipations = true;
      }
    }

    // Top joueurs par victoires
    const sortedByWins = Object.values(playerStats)
      .sort((a: any, b: any) => b.wins - a.wins);
    const top15ByWins = sortedByWins.slice(0, 15);
    
    const highlightedPlayerInTop15Wins = settings.highlightedPlayer && 
      top15ByWins.some(p => p.name === settings.highlightedPlayer);
    
    let highlightedPlayerAddedToWins = false;
    let topPlayersByWins: ChartPlayerStat[] = [...top15ByWins];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15Wins) {
      const highlightedPlayerData = sortedByWins.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByWins.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToWins = true;
      }
    }

    // Top joueurs par taux de victoire
    const eligibleForWinRate = Object.values(playerStats)
      .filter((p: any) => p.participations >= minGamesForWinRate);
    
    const sortedByWinRate = eligibleForWinRate
      .sort((a: any, b: any) => b.winRate - a.winRate);
    
    const top15WinRate = sortedByWinRate.slice(0, 15);

    const highlightedPlayerInTop15WinRate = settings.highlightedPlayer && 
      top15WinRate.some(p => p.name === settings.highlightedPlayer);

    let highlightedPlayerAddedToWinRate = false;
    let topPlayersByWinRate: ChartPlayerStat[] = [...top15WinRate];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15WinRate) {
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByWinRate.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToWinRate = true;
      }
    }

    // Top joueurs par kills totaux
    const sortedByTotalScore = Object.values(playerStats)
      .sort((a: any, b: any) => b.totalScore - a.totalScore);
    const top15TotalScore = sortedByTotalScore.slice(0, 15);
    
    const highlightedPlayerInTop15TotalScore = settings.highlightedPlayer && 
      top15TotalScore.some(p => p.name === settings.highlightedPlayer);
    
    let highlightedPlayerAddedToTotalScore = false;
    let topPlayersByTotalScore: ChartPlayerStat[] = [...top15TotalScore];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15TotalScore) {
      const highlightedPlayerData = sortedByTotalScore.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByTotalScore.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToTotalScore = true;
      }
    }

    // Top joueurs par score moyen
    const eligibleForAverageScore = Object.values(playerStats)
      .filter((p: any) => p.participations >= minGamesForKills);
    
    const sortedByAverageScore = eligibleForAverageScore
      .sort((a: any, b: any) => b.averageScore - a.averageScore);
    
    const top15AverageScore = sortedByAverageScore.slice(0, 15);

    const highlightedPlayerInTop15AverageScore = settings.highlightedPlayer &&
      top15AverageScore.some(p => p.name === settings.highlightedPlayer);

    let highlightedPlayerAddedToAverageScore = false;
    let topPlayersByAverageScore: ChartPlayerStat[] = [...top15AverageScore];
    
    if (settings.highlightedPlayer && !highlightedPlayerInTop15AverageScore) {
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByAverageScore.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToAverageScore = true;
      }
    }

    // Statistiques par nombre de participants
    const participantStats = globalData.reduce((acc, game) => {
      const count = game["Nombre de participants"];
      if (!acc[count]) {
        acc[count] = 0;
      }
      acc[count]++;
      return acc;
    }, {} as Record<number, number>);

    const participantData = Object.entries(participantStats)
      .map(([count, games]) => ({
        participants: parseInt(count),
        games: games,
        percentage: (((games as number) / totalGames) * 100).toFixed(1)
      }))
      .sort((a, b) => a.participants - b.participants);

    return {
      totalGames,
      totalParticipations,
      totalWins,
      averageParticipantsPerGame: ((totalParticipations as number) / totalGames).toFixed(1),
      topPlayersByParticipations,
      highlightedPlayerInParticipations: highlightedPlayerAddedToParticipations,
      topPlayersByWins,
      highlightedPlayerInWins: highlightedPlayerAddedToWins,
      topPlayersByWinRate,
      highlightedPlayerInWinRate: highlightedPlayerAddedToWinRate,
      totalEligiblePlayersForWinRate: eligibleForWinRate.length,
      topPlayersByTotalScore,
      highlightedPlayerInTotalScore: highlightedPlayerAddedToTotalScore,
      topPlayersByAverageScore,
      highlightedPlayerInAverageScore: highlightedPlayerAddedToAverageScore,
      totalEligiblePlayersForKills: eligibleForAverageScore.length,
      participantData,
    };
  }, [brData, globalData, settings.highlightedPlayer, minGamesForWinRate, minGamesForKills]);

  if (brLoading || globalLoading) {
    return <div className="statistiques-chargement">Chargement des données Mini Battle Royale...</div>;
  }

  if (brError || globalError) {
    return <div className="statistiques-erreur">Erreur: {brError || globalError}</div>;
  }

  if (!stats || stats.totalGames === 0) {
    return <div className="statistiques-vide">Aucune donnée Mini Battle Royale disponible (2-5 joueurs)</div>;
  }

  return (
    <div className="lycans-chart-container">
      <div className="lycans-chart-header">
        <h2>Mini Battle Royale (2-5 joueurs)</h2>
      </div>

      {/* Statistiques générales */}
      <div className="lycans-stats-grid">
        <div className="lycans-stat-card">
          <h3>Parties totales</h3>
          <div className="lycans-stat-value">{stats.totalGames}</div>
        </div>
        <div className="lycans-stat-card">
          <h3>Participations</h3>
          <div className="lycans-stat-value">{stats.totalParticipations}</div>
        </div>
        <div className="lycans-stat-card">
          <h3>Moy. participants/partie</h3>
          <div className="lycans-stat-value">{stats.averageParticipantsPerGame}</div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Participations */}
        <div className="lycans-graphique-section">
          <h3>Participations</h3>
          {stats.highlightedPlayerInParticipations && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary-text)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Participations - Mini Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.topPlayersByParticipations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload as ChartPlayerStat;
                      const isHighlightedAddition = d.isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.name;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {d.name}
                            {isHighlightedFromSettings && ' 🎯'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Participations: <strong>{d.participations}</strong></div>
                            <div>Victoires: <strong>{d.wins}</strong></div>
                          </div>
                          {isHighlightedAddition && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="participations" name="Participations">
                  {stats.topPlayersByParticipations.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = hoveredPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          isHighlightedFromSettings ? 'var(--accent-primary)' :
                          isHighlightedAddition ? 'var(--accent-secondary)' :
                          getPlayerColor(entry.name)
                        }
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
                        onMouseEnter={() => setHoveredPlayer(entry.name)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Répartition par nombre de participants */}
        <div className="lycans-graphique-section">
          <h3>Répartition par Nombre de Participants</h3>
          <FullscreenChart
            title="Répartition par Nombre de Participants - Mini BR"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.participantData} margin={{ bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="participants" label={{ value: 'Nombre de participants', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {data.participants} joueur{data.participants > 1 ? 's' : ''}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Parties: <strong>{data.games}</strong></div>
                            <div>Pourcentage: <strong>{data.percentage}%</strong></div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="games" name="Nombre de parties">
                  {stats.participantData.map((_entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartColors[index % chartColors.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Victoires / Taux de victoire with toggle */}
        <div className="lycans-graphique-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3>{winRateView === 'wins' ? 'Victoires' : 'Taux de Victoire'}</h3>
              {((winRateView === 'wins' && stats.highlightedPlayerInWins) || 
                (winRateView === 'winRate' && stats.highlightedPlayerInWinRate)) && 
                settings.highlightedPlayer && (
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
                  🎯 {settings.highlightedPlayer} affiché en plus du top 15
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '350px', justifyContent: 'flex-end' }}>
              {winRateView === 'winRate' && (
                <>
                  <label htmlFor="min-games-winrate-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Min. parties:
                  </label>
                  <select
                    id="min-games-winrate-select"
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
                </>
              )}
              <button
                onClick={() => setWinRateView('wins')}
                style={{
                  background: winRateView === 'wins' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: winRateView === 'wins' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Victoires
              </button>
              <button
                onClick={() => setWinRateView('winRate')}
                style={{
                  background: winRateView === 'winRate' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: winRateView === 'winRate' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Taux de victoire
              </button>
            </div>
          </div>
          <FullscreenChart
            title={`${winRateView === 'wins' ? 'Victoires' : 'Taux de Victoire'} - Mini Battle Royale`}
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={winRateView === 'wins' ? stats.topPlayersByWins : stats.topPlayersByWinRate}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload as ChartPlayerStat;
                      const isHighlightedAddition = d.isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.name;
                      const meetsMinParticipations = d.participations >= minGamesForWinRate;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {d.name}
                            {isHighlightedFromSettings && ' 🎯'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {winRateView === 'wins' ? (
                              <>
                                <div>Victoires: <strong>{d.wins}</strong></div>
                                <div>Participations: <strong>{d.participations}</strong></div>
                                <div>Taux de victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
                              </>
                            ) : (
                              <>
                                <div>Taux de victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
                                <div>Victoires: <strong>{d.wins}</strong> / {d.participations}</div>
                              </>
                            )}
                          </div>
                          {isHighlightedAddition && winRateView === 'winRate' && !meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (&lt; {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
                            </div>
                          )}
                          {isHighlightedAddition && ((winRateView === 'winRate' && meetsMinParticipations) || winRateView === 'wins') && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey={winRateView === 'wins' ? 'wins' : 'winRate'} name={winRateView === 'wins' ? 'Victoires' : 'Taux de victoire (%)'}>
                  {(winRateView === 'wins' ? stats.topPlayersByWins : stats.topPlayersByWinRate).map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = hoveredPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-winrate-${index}`}
                        fill={
                          isHighlightedFromSettings ? 'var(--accent-primary)' :
                          isHighlightedAddition ? 'var(--accent-secondary)' :
                          winRateView === 'wins' ? getPlayerColor(entry.name) : chartColors[index % chartColors.length]
                        }
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
                        onMouseEnter={() => setHoveredPlayer(entry.name)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
          {winRateView === 'winRate' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {stats.topPlayersByWinRate.length} des joueurs (sur {stats.totalEligiblePlayersForWinRate} ayant au moins {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
            </p>
          )}
        </div>

        {/* Kills totaux / Kills moyen par partie with toggle */}
        <div className="lycans-graphique-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3>{killsView === 'total' ? 'Kills Totaux' : 'Kills Moyen par Partie'}</h3>
              {((killsView === 'total' && stats.highlightedPlayerInTotalScore) || 
                (killsView === 'average' && stats.highlightedPlayerInAverageScore)) && 
                settings.highlightedPlayer && (
                <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
                  🎯 {settings.highlightedPlayer} affiché en plus du top 15
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '350px', justifyContent: 'flex-end' }}>
              {killsView === 'average' && (
                <>
                  <label htmlFor="min-games-kills-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Min. parties:
                  </label>
                  <select
                    id="min-games-kills-select"
                    value={minGamesForKills}
                    onChange={(e) => setMinGamesForKills(Number(e.target.value))}
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
                </>
              )}
              <button
                onClick={() => setKillsView('total')}
                style={{
                  background: killsView === 'total' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: killsView === 'total' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Kills Totaux
              </button>
              <button
                onClick={() => setKillsView('average')}
                style={{
                  background: killsView === 'average' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: killsView === 'average' ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Kills Moyen
              </button>
            </div>
          </div>
          <FullscreenChart
            title={`${killsView === 'total' ? 'Kills Totaux' : 'Kills Moyen par Partie'} - Mini Battle Royale`}
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={killsView === 'total' ? stats.topPlayersByTotalScore : stats.topPlayersByAverageScore}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={12}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload as ChartPlayerStat;
                      const isHighlightedAddition = d.isHighlightedAddition;
                      const isHighlightedFromSettings = settings.highlightedPlayer === d.name;
                      const meetsMinParticipations = d.participations >= minGamesForKills;
                      
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: '12px', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1rem' }}>
                            {d.name}
                            {isHighlightedFromSettings && ' 🎯'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Participations: <strong>{d.participations}</strong></div>
                            <div>Kills total: <strong>{d.totalScore}</strong></div>
                            <div>Kills moyen: <strong>{d.averageScore.toFixed(2)}</strong></div>
                          </div>
                          {isHighlightedAddition && killsView === 'average' && !meetsMinParticipations && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (&lt; {minGamesForKills} partie{minGamesForKills > 1 ? 's' : ''})
                            </div>
                          )}
                          {isHighlightedAddition && ((killsView === 'average' && meetsMinParticipations) || killsView === 'total') && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-primary)', 
                              marginTop: '8px',
                              fontStyle: 'italic',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              🎯 Affiché via sélection (hors top 15)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey={killsView === 'total' ? 'totalScore' : 'averageScore'} name={killsView === 'total' ? 'Kills totaux' : 'Kills moyen par partie'}>
                  {(killsView === 'total' ? stats.topPlayersByTotalScore : stats.topPlayersByAverageScore).map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = hoveredPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-kills-${index}`}
                        fill={
                          isHighlightedFromSettings ? 'var(--accent-primary)' :
                          isHighlightedAddition ? 'var(--accent-secondary)' :
                          getPlayerColor(entry.name)
                        }
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
                        onMouseEnter={() => setHoveredPlayer(entry.name)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
          {killsView === 'average' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
              Top {stats.topPlayersByAverageScore.length} des joueurs (sur {stats.totalEligiblePlayersForKills} ayant au moins {minGamesForKills} partie{minGamesForKills > 1 ? 's' : ''})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
