import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTopSurvivorsForDay, getWorstSurvivorsForDay, type SurvivalStatistics } from '../../../hooks/utils/survivalStatisticsUtils';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { minGamesOptions } from '../../../types/api';

// Type for chart data with highlighting support
type ChartSurvivalData = {
  name: string;
  value: number;
  gamesPlayed: number;
  timesReachedDay: number;
  timesSurvivedDay: number;
  isHighlightedAddition?: boolean;
};

interface SurvivalViewProps {
  survivalStats: SurvivalStatistics | null;
  selectedCamp: string;
  minGamesForAverage: number;
  onMinGamesChange: (value: number) => void;
  isLoading: boolean;
  error: string | null;
}

export function SurvivalView({
  survivalStats,
  selectedCamp: _selectedCamp, // Keep for interface compatibility but mark as unused
  minGamesForAverage,
  onMinGamesChange,
  isLoading,
  error
}: SurvivalViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // State for day selection and hover
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  // Get available days from the data
  const availableDays = useMemo(() => {
    if (!survivalStats) return [];
    
    const days = survivalStats.dayStats
      .filter(day => day.totalGamesReachingDay > 0)
      .map(day => day.dayNumber)
      .sort((a, b) => a - b);
      
    return days;
  }, [survivalStats]);

  // Ensure selected day is valid
  const validSelectedDay = useMemo(() => {
    if (availableDays.includes(selectedDay)) {
      return selectedDay;
    }
    return availableDays.length > 0 ? availableDays[0] : 1;
  }, [selectedDay, availableDays]);

  // Process data for highest survival rates chart
  const { highestSurvivalData, highlightedPlayerAddedToHighest } = useMemo(() => {
    if (!survivalStats) return { 
      highestSurvivalData: [], 
      highlightedPlayerAddedToHighest: false 
    };

    const topSurvivors = getTopSurvivorsForDay(survivalStats, validSelectedDay, minGamesForAverage);
    
    const highlightedPlayerInTop15 = settings.highlightedPlayer && 
      topSurvivors.some(p => p.playerName === settings.highlightedPlayer);
    
    const baseData: ChartSurvivalData[] = topSurvivors.map(player => ({
      name: player.playerName,
      value: player.survivalRate,
      gamesPlayed: player.gamesPlayed,
      timesReachedDay: player.timesReachedDay,
      timesSurvivedDay: player.timesSurvivedDay,
      isHighlightedAddition: false
    }));

    let highlightedPlayerAdded = false;

    // Add highlighted player if not in top 15 but meets minimum criteria
    if (settings.highlightedPlayer && !highlightedPlayerInTop15) {
      const highlightedPlayerStats = survivalStats.playerSurvivalStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      
      if (highlightedPlayerStats && 
          highlightedPlayerStats.totalGames >= minGamesForAverage &&
          (highlightedPlayerStats.gamesPlayedByDay[validSelectedDay] || 0) > 0) {
        const highlightedSurvivalRate = highlightedPlayerStats.survivalRatesByDay[validSelectedDay] || 0;
        
        baseData.push({
          name: settings.highlightedPlayer,
          value: highlightedSurvivalRate,
          gamesPlayed: highlightedPlayerStats.totalGames,
          timesReachedDay: highlightedPlayerStats.gamesPlayedByDay[validSelectedDay] || 0,
          timesSurvivedDay: highlightedPlayerStats.survivalsByDay[validSelectedDay] || 0,
          isHighlightedAddition: true
        });
        
        highlightedPlayerAdded = true;
      }
    }

    return { 
      highestSurvivalData: baseData, 
      highlightedPlayerAddedToHighest: highlightedPlayerAdded 
    };
  }, [survivalStats, validSelectedDay, minGamesForAverage, settings.highlightedPlayer]);

  // Process data for lowest survival rates chart
  const { lowestSurvivalData, highlightedPlayerAddedToLowest } = useMemo(() => {
    if (!survivalStats) return { 
      lowestSurvivalData: [], 
      highlightedPlayerAddedToLowest: false 
    };

    const worstSurvivors = getWorstSurvivorsForDay(survivalStats, validSelectedDay, minGamesForAverage);
    
    const highlightedPlayerInWorst15 = settings.highlightedPlayer && 
      worstSurvivors.some(p => p.playerName === settings.highlightedPlayer);
    
    const baseData: ChartSurvivalData[] = worstSurvivors.map(player => ({
      name: player.playerName,
      value: player.survivalRate,
      gamesPlayed: player.gamesPlayed,
      timesReachedDay: player.timesReachedDay,
      timesSurvivedDay: player.timesSurvivedDay,
      isHighlightedAddition: false
    }));

    let highlightedPlayerAdded = false;

    // Add highlighted player if not in worst 15 but meets minimum criteria
    if (settings.highlightedPlayer && !highlightedPlayerInWorst15) {
      const highlightedPlayerStats = survivalStats.playerSurvivalStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      
      if (highlightedPlayerStats && 
          highlightedPlayerStats.totalGames >= minGamesForAverage &&
          (highlightedPlayerStats.gamesPlayedByDay[validSelectedDay] || 0) > 0) {
        const highlightedSurvivalRate = highlightedPlayerStats.survivalRatesByDay[validSelectedDay] || 0;
        
        baseData.push({
          name: settings.highlightedPlayer,
          value: highlightedSurvivalRate,
          gamesPlayed: highlightedPlayerStats.totalGames,
          timesReachedDay: highlightedPlayerStats.gamesPlayedByDay[validSelectedDay] || 0,
          timesSurvivedDay: highlightedPlayerStats.survivalsByDay[validSelectedDay] || 0,
          isHighlightedAddition: true
        });
        
        highlightedPlayerAdded = true;
      }
    }

    return { 
      lowestSurvivalData: baseData, 
      highlightedPlayerAddedToLowest: highlightedPlayerAdded 
    };
  }, [survivalStats, validSelectedDay, minGamesForAverage, settings.highlightedPlayer]);

  // Handle bar click to navigate to game details
  const handleBarClick = (playerName: string) => {
    navigateToGameDetails({ 
      selectedPlayer: playerName,
      fromComponent: 'Statistiques de Survie'
    });
  };

  // Custom tooltip for survival charts
  const SurvivalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const isHighlightedAddition = (data as ChartSurvivalData).isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;
      const timesNotSurvived = data.timesReachedDay - data.timesSurvivedDay;
      
      return (
        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
          <div><strong>{label}</strong></div>
          <div>
            <span style={{ color: 'var(--accent-primary)' }}>
              Taux de survie Jour {validSelectedDay}: {data.value.toFixed(1)}%
            </span>
          </div>
          <div>Parties atteignant le Jour {validSelectedDay}: {data.timesReachedDay}</div>
          <div>A survécu au Jour {validSelectedDay}: {data.timesSurvivedDay}</div>
          <div>N'a pas survécu au Jour {validSelectedDay}: {timesNotSurvived}</div>
          <div>Total de parties: {data.gamesPlayed}</div>
          {isHighlightedAddition && !meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (&lt; {minGamesForAverage} parties au total)
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
  };

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de survie...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!survivalStats) return <div className="donnees-manquantes">Aucune donnée de survie disponible</div>;

  return (
    <div className="lycans-survival-stats">
      {/* Explanation (moved above charts) */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          Un "Jour" représente un cycle complet composé d'une phase de jour, d'une phase de nuit, et d'une réunion. Par exemple, le Jour 2 signifie que le joueur a survécu au deuxième cycle jour/nuit/réunion.
        </p>
        <p>
          Les statistiques de survie montrent le pourcentage de fois qu'un joueur survit au Jour {validSelectedDay} parmi toutes les parties qu'il a jouées et qui ont atteint ce jour. {highlightedPlayerAddedToHighest || highlightedPlayerAddedToLowest ?
          'Les joueurs mis en évidence apparaissent même s\'ils ne sont pas dans le top 15.' : ''}
        </p>
      </div>

      {/* Controls */}
      <div className="lycans-graphique-controles" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Day Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="day-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Jour :
            </label>
            <select
              id="day-select"
              value={validSelectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                minWidth: '80px'
              }}
            >
              {availableDays.map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Minimum Games Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="min-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Min. parties :
            </label>
            <select
              id="min-games-select"
              value={minGamesForAverage}
              onChange={(e) => onMinGamesChange(parseInt(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                minWidth: '80px'
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
      </div>

      {/* Summary for selected day */}
      {validSelectedDay && survivalStats.dayStats.find(d => d.dayNumber === validSelectedDay) && (
        <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
          <div className="lycans-stat-carte">
            <h3>{validSelectedDay === 1 ? 'Total des parties enregistrées' : `Parties atteignant le Jour ${validSelectedDay}`}</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
              {survivalStats.dayStats.find(d => d.dayNumber === validSelectedDay)?.totalGamesReachingDay || 0}
            </div>
          </div>
          <div className="lycans-stat-carte">
            <h3>Taux de survie moyen Jour {validSelectedDay}</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
              {(survivalStats.dayStats.find(d => d.dayNumber === validSelectedDay)?.averageSurvivalRate || 0).toFixed(1)}%
            </div>
          </div>
          <div className="lycans-stat-carte">
            <h3>Joueurs éligibles (min. {minGamesForAverage} parties)</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
              {survivalStats.playerSurvivalStats.filter(p => 
                p.totalGames >= minGamesForAverage && 
                (p.gamesPlayedByDay[validSelectedDay] || 0) > 0
              ).length}
            </div>
          </div>
        </div>
      )}

      {/* Highest Survival Rates Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🛡️ Meilleurs Taux de Survie - Jour {validSelectedDay}</h3>
          {highlightedPlayerAddedToHighest && settings.highlightedPlayer && (
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
        <FullscreenChart title={`🛡️ Meilleurs Taux de Survie - Jour ${validSelectedDay}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={highestSurvivalData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}              
                      dy={16}
                      textAnchor="end"
                      transform={`rotate(-45, ${x}, ${y})`}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis 
                  tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                  tick={{ fill: 'var(--text-secondary)' }}
                  label={{ value: 'Taux de survie (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                />
                <Tooltip content={<SurvivalTooltip />} />
                <Bar 
                  dataKey="value" 
                  name="Taux de survie"
                  cursor="pointer"
                >
                  {highestSurvivalData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-highest-${index}`}
                        fill={playersColor[entry.name] || 'var(--chart-primary)'}
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
                        onClick={() => handleBarClick(entry.name)}
                        onMouseEnter={() => setHighlightedPlayer(entry.name)}
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
      </div>

      {/* Lowest Survival Rates Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>⚰️ Plus Faibles Taux de Survie - Jour {validSelectedDay}</h3>
          {highlightedPlayerAddedToLowest && settings.highlightedPlayer && (
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
        <FullscreenChart title={`⚰️ Plus Faibles Taux de Survie - Jour ${validSelectedDay}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lowestSurvivalData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      transform={`rotate(-45, ${x}, ${y})`}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis 
                  tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                  tick={{ fill: 'var(--text-secondary)' }}
                  label={{ value: 'Taux de survie (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                />
                <Tooltip content={<SurvivalTooltip />} />
                <Bar 
                  dataKey="value" 
                  name="Taux de survie"
                  cursor="pointer"
                >
                  {lowestSurvivalData.map((entry, index) => {
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;
                    
                    return (
                      <Cell 
                        key={`cell-lowest-${index}`}
                        fill={playersColor[entry.name] || 'var(--chart-color-4)'}
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
                        onClick={() => handleBarClick(entry.name)}
                        onMouseEnter={() => setHighlightedPlayer(entry.name)}
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
      </div>
    </div>
  );
}