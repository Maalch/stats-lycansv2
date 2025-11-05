import { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useFilteredRawBRData, useFilteredRawBRGlobalData } from '../../hooks/useRawBRData';
import { useSettings } from '../../context/SettingsContext';

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

// Min games options for BR
const minGamesOptions = [3, 10, 25, 50, 100];

export function BRWinRateChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredRawBRData();
  const { data: globalData, isLoading: globalLoading, error: globalError } = useFilteredRawBRGlobalData();
  const { settings } = useSettings();
  
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [minGamesForWinRate, setMinGamesForWinRate] = useState<number>(3);

  // Chart colors using CSS custom properties
  const chartColors = [
    'var(--chart-color-1)',
    'var(--chart-color-2)', 
    'var(--chart-color-3)',
    'var(--chart-color-4)',
    'var(--chart-color-5)',
    'var(--chart-color-6)'
  ];

  const stats = useMemo(() => {
    if (!brData || !globalData) return null;
    
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

    // Top joueurs par participations (needed for highlighted player lookup)
    const sortedByParticipations = Object.values(playerStats)
      .sort((a: any, b: any) => b.participations - a.participations);

    // Top joueurs par victoires - use minGamesForWinRate state
    const eligibleForWinRate = Object.values(playerStats)
      .filter((p: any) => p.participations >= minGamesForWinRate);
    
    const sortedByWinRate = eligibleForWinRate
      .sort((a: any, b: any) => b.winRate - a.winRate);
    
    const top15WinRate = sortedByWinRate.slice(0, 15);

    // Check if highlighted player is in top 15 win rate (among eligible players)
    const highlightedPlayerInTop15WinRate = settings.highlightedPlayer && 
      top15WinRate.some(p => p.name === settings.highlightedPlayer);

    // If highlighted player is not in top 15 but exists in all stats, add them
    let highlightedPlayerAddedToWinRate = false;
    let topPlayersByWins: ChartPlayerStat[] = [...top15WinRate];

    if (settings.highlightedPlayer && !highlightedPlayerInTop15WinRate) {
      // Search in all player stats, not just eligible ones
      const highlightedPlayerData = sortedByParticipations.find(p => p.name === settings.highlightedPlayer);
      if (highlightedPlayerData) {
        topPlayersByWins.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedToWinRate = true;
      }
    }

    return {
      topPlayersByWins,
      highlightedPlayerInWinRate: highlightedPlayerAddedToWinRate,
      totalEligiblePlayers: eligibleForWinRate.length
    };
  }, [brData, globalData, settings.highlightedPlayer, minGamesForWinRate]);

  if (brLoading || globalLoading) {
    return <div className="statistiques-chargement">Chargement des données Battle Royale...</div>;
  }

  if (brError || globalError) {
    return <div className="statistiques-erreur">Erreur: {brError || globalError}</div>;
  }

  if (!stats) {
    return <div className="statistiques-vide">Aucune donnée Battle Royale disponible</div>;
  }

  return (
    <div className="lycans-chart-container">
      <div className="lycans-chart-header">
        <h2>Taux de Victoire - Battle Royale</h2>
      </div>

      {/* Top joueurs par taux de victoire */}
      <div className="lycans-chart-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3>Taux de Victoire</h3>
            {stats.highlightedPlayerInWinRate && settings.highlightedPlayer && (
              <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
                🎯 {settings.highlightedPlayer} affiché en plus du top 15
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="min-games-br-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-br-select"
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
        </div>
        <FullscreenChart
          title="Taux de Victoire - Battle Royale"
          className="lycans-chart-wrapper"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={stats.topPlayersByWins}
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
                    fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
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
                          <div>Taux de victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
                          <div>Victoires: <strong>{d.wins}</strong> / {d.participations}</div>
                        </div>
                        {isHighlightedAddition && !meetsMinParticipations && (
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
                        {isHighlightedAddition && meetsMinParticipations && (
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
              <Bar dataKey="winRate" name="Taux de victoire (%)">
                {stats.topPlayersByWins.map((entry, index) => {
                  const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                  const isHoveredPlayer = hoveredPlayer === entry.name;
                  const isHighlightedAddition = entry.isHighlightedAddition;
                  
                  return (
                    <Cell 
                      key={`cell-${index}`}
                      fill={
                        isHighlightedFromSettings ? 'var(--accent-primary)' :
                        isHighlightedAddition ? 'var(--accent-secondary)' :
                        chartColors[index % chartColors.length]
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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Top {stats.topPlayersByWins.length} des joueurs (sur {stats.totalEligiblePlayers} ayant au moins {minGamesForWinRate} partie{minGamesForWinRate > 1 ? 's' : ''})
        </p>
      </div>
    </div>
  );
}
