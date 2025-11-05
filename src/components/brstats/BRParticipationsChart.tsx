import { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useFilteredRawBRData, useFilteredRawBRGlobalData } from '../../hooks/useRawBRData';
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

export function BRParticipationsChart() {
  const { data: brData, isLoading: brLoading, error: brError } = useFilteredRawBRData();
  const { data: globalData, isLoading: globalLoading, error: globalError } = useFilteredRawBRGlobalData();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

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
      winRate: (((totalWins as number) / totalParticipations) * 100).toFixed(1),
      averageParticipantsPerGame: ((totalParticipations as number) / totalGames).toFixed(1),
      topPlayersByParticipations,
      participantData,
      highlightedPlayerInParticipations: highlightedPlayerAddedToParticipations,
    };
  }, [brData, globalData, settings.highlightedPlayer]);

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
        <h2>Participations - Battle Royale</h2>
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
        {/* Top joueurs par participations */}
        <div className="lycans-graphique-section">
          <h3>Participations</h3>
          {stats.highlightedPlayerInParticipations && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: '0.5rem 0' }}>
              🎯 {settings.highlightedPlayer} affiché en plus du top 15
            </p>
          )}
          <FullscreenChart
            title="Participations - Battle Royale"
            className="lycans-chart-wrapper"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={stats.topPlayersByParticipations}
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
                            <div>Taux de victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
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
                <Bar dataKey="wins" fill="var(--chart-color-2)" name="Victoires">
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
                          'var(--chart-color-2)'
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
            title="Répartition par Nombre de Participants - Battle Royale"
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
                            {data.participants} {data.participants === 1 ? 'participant' : 'participants'}
                          </div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <div>Nombre de parties: <strong>{data.games}</strong></div>
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
      </div>
    </div>
  );
}
