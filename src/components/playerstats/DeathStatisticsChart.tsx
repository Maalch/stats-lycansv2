import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDeathStatisticsFromRaw, useAvailableCampsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedPlayersColor } from '../../types/api';

// Extended type for chart data with highlighting info
type ChartKillerData = {
  name: string;
  value: number;
  victims: number;
  percentage: number;
  gamesPlayed: number;
  averageKillsPerGame: number;
  isHighlightedAddition?: boolean;
};

export function DeathStatisticsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathStatsSelectedCamp || 'Tous les camps'
  );
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw(selectedCamp);
  const { settings } = useSettings();
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  const playersColor = useThemeAdjustedPlayersColor();

  // Function to handle camp selection change with persistence
  const handleCampChange = (newCamp: string) => {
    setSelectedCamp(newCamp);
    updateNavigationState({ deathStatsSelectedCamp: newCamp });
  };

  // Process killer data for both total and average charts
  const { totalKillsData, averageKillsData, highlightedPlayerAddedToTotal, highlightedPlayerAddedToAverage, gamesWithKillers } = useMemo(() => {
    if (!deathStats) return { 
      totalKillsData: [], 
      averageKillsData: [], 
      highlightedPlayerAddedToTotal: false, 
      highlightedPlayerAddedToAverage: false, 
      gamesWithKillers: 0 
    };
    
    // Process total kills data
    const sortedByTotal = deathStats.killerStats
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 20);
    
    const highlightedPlayerInTotalTop20 = settings.highlightedPlayer && 
      sortedByTotal.some(k => k.killerName === settings.highlightedPlayer);
    
    const totalBaseData: ChartKillerData[] = sortedByTotal.map(killer => ({
      name: killer.killerName,
      value: killer.kills,
      victims: killer.victims.length,
      percentage: killer.percentage,
      gamesPlayed: killer.gamesPlayed,
      averageKillsPerGame: killer.averageKillsPerGame,
      isHighlightedAddition: false
    }));
    
    let highlightedPlayerAddedTotal = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTotalTop20) {
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        totalBaseData.push({
          name: highlightedKiller.killerName,
          value: highlightedKiller.kills,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedTotal = true;
      }
    }
    
    // Process average kills data
    const sortedByAverage = deathStats.killerStats
      .sort((a, b) => b.averageKillsPerGame - a.averageKillsPerGame)
      .slice(0, 20);
    
    const highlightedPlayerInAverageTop20 = settings.highlightedPlayer && 
      sortedByAverage.some(k => k.killerName === settings.highlightedPlayer);
    
    const averageBaseData: ChartKillerData[] = sortedByAverage.map(killer => ({
      name: killer.killerName,
      value: killer.averageKillsPerGame,
      victims: killer.victims.length,
      percentage: killer.percentage,
      gamesPlayed: killer.gamesPlayed,
      averageKillsPerGame: killer.averageKillsPerGame,
      isHighlightedAddition: false
    }));
    
    let highlightedPlayerAddedAverage = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInAverageTop20) {
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        averageBaseData.push({
          name: highlightedKiller.killerName,
          value: highlightedKiller.averageKillsPerGame,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        });
        highlightedPlayerAddedAverage = true;
      }
    }
    
    return { 
      totalKillsData: totalBaseData,
      averageKillsData: averageBaseData,
      highlightedPlayerAddedToTotal: highlightedPlayerAddedTotal,
      highlightedPlayerAddedToAverage: highlightedPlayerAddedAverage,
      gamesWithKillers: deathStats.gamesWithDeaths
    };
  }, [deathStats, settings.highlightedPlayer]);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!deathStats) return <div className="donnees-manquantes">Aucune donnée de mort disponible</div>;

  const TotalKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--accent-secondary)', margin: '4px 0' }}>
            <strong>Victimes totales:</strong> {data.value}
          </p>
          <p style={{ color: 'var(--accent-tertiary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          <p style={{ color: 'var(--chart-color-5)', margin: '4px 0' }}>
            <strong>Victimes uniques:</strong> {data.victims}
          </p>
          <p style={{ color: 'var(--chart-color-2)', margin: '4px 0' }}>
            <strong>Moyenne par partie:</strong> {data.averageKillsPerGame.toFixed(2)}
          </p>
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
  };

  const AverageKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--accent-secondary)', margin: '4px 0' }}>
            <strong>Moyenne par partie:</strong> {data.value.toFixed(2)}
          </p>
          <p style={{ color: 'var(--accent-tertiary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          <p style={{ color: 'var(--chart-color-5)', margin: '4px 0' }}>
            <strong>Victimes uniques:</strong> {data.victims}
          </p>
          <p style={{ color: 'var(--chart-color-2)', margin: '4px 0' }}>
            <strong>Victimes totales:</strong> {Math.round(data.averageKillsPerGame * data.gamesPlayed)}
          </p>
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
  };

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Tueurs (VERSION PROTOTYPE)</h2>

      {/* Camp Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Camp du tueur :
        </label>
        <select
          id="camp-select"
          value={selectedCamp}
          onChange={(e) => handleCampChange(e.target.value)}
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '0.5rem',
            fontSize: '0.9rem',
            minWidth: '150px'
          }}
        >
          <option value="Tous les camps">Tous les camps</option>
          {availableCamps?.map(camp => (
            <option key={camp} value={camp}>
              {camp}
            </option>
          ))}
        </select>
      </div>

      {/* Summary statistics using lycans styling */}
      <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
        <div className="lycans-stat-carte">
          <h3>Total des morts</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
            {deathStats.totalDeaths}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Tueurs identifiés</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
            {deathStats.killerStats.length}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Nombre de parties enregistrées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
            {gamesWithKillers}
          </div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>Top Tueurs (Total)</h3>
            {highlightedPlayerAddedToTotal && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>
          <FullscreenChart title="Top Tueurs (Total)">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalKillsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  onMouseEnter={() => {}}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Nombre total de victimes', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<TotalKillsTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Victimes"
                    onMouseEnter={(data) => setHoveredPlayer(data?.name || null)}
                  >
                    {totalKillsData.map((entry) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                      const isHoveredPlayer = hoveredPlayer === entry.name;
                      const isHighlightedAddition = entry.isHighlightedAddition;
                      
                      return (
                        <Cell
                          key={`cell-total-${entry.name}`}
                          fill={playersColor[entry.name] || "#e53e3e"}
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
                            const navigationFilters: any = {
                              selectedPlayer: entry.name,
                              fromComponent: 'Statistiques de Mort'
                            };
                            
                            // If a specific camp is selected, add camp filter
                            if (selectedCamp !== 'Tous les camps') {
                              navigationFilters.campFilter = {
                                selectedCamp: selectedCamp,
                                campFilterMode: 'all-assignments'
                              };
                            }
                            
                            navigateToGameDetails(navigationFilters);
                          }} 
                          onMouseEnter={() => setHoveredPlayer(entry.name)}
                          onMouseLeave={() => setHoveredPlayer(null)}
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
            Top {Math.min(20, totalKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus actifs (total)
          </p>
        </div>

        <div className="lycans-graphique-section">
          <div>
            <h3>Top Tueurs (Moyenne par Partie)</h3>
            {highlightedPlayerAddedToAverage && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>
          <FullscreenChart title="Top Tueurs (Moyenne par Partie)">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={averageKillsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  onMouseEnter={() => {}}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Moyenne de victimes par partie', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<AverageKillsTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Moyenne"
                    onMouseEnter={(data) => setHoveredPlayer(data?.name || null)}
                  >
                    {averageKillsData.map((entry) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                      const isHoveredPlayer = hoveredPlayer === entry.name;
                      const isHighlightedAddition = entry.isHighlightedAddition;
                      
                      return (
                        <Cell
                          key={`cell-average-${entry.name}`}
                          fill={playersColor[entry.name] || "#8884d8"}
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
                            const navigationFilters: any = {
                              selectedPlayer: entry.name,
                              fromComponent: 'Statistiques de Mort'
                            };
                            
                            // If a specific camp is selected, add camp filter
                            if (selectedCamp !== 'Tous les camps') {
                              navigationFilters.campFilter = {
                                selectedCamp: selectedCamp,
                                campFilterMode: 'all-assignments'
                              };
                            }
                            
                            navigateToGameDetails(navigationFilters);
                          }} 
                          onMouseEnter={() => setHoveredPlayer(entry.name)}
                          onMouseLeave={() => setHoveredPlayer(null)}
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
            Top {Math.min(20, averageKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus efficaces (moyenne)
          </p>
        </div>
      </div>

      {/* Insights section using lycans styling */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>Note : </strong> 
          {`Les morts lors de votes aux conseils ne sont pas comptabilisées ici. `}
          {`Données en cours de récupération (données partielles).`}
        </p>
      </div>
    </div>
  );
}