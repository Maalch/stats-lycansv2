import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { getTopSurvivorsForDay, getWorstSurvivorsForDay, getTopTimeAliveStats, getWorstTimeAliveStats, type SurvivalStatistics } from '../../../hooks/utils/survivalStatisticsUtils';
import { useTimeAliveStatisticsFromRaw } from '../../../hooks/useSurvivalStatisticsFromRaw';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { minGamesOptions } from '../../../types/api';
import { CHART_DEFAULTS } from '../../../config/chartConstants';

// Type for chart data with highlighting support
type ChartSurvivalData = {
  name: string;
  value: number;
  gamesPlayed: number;
  timesReachedDay: number;
  timesSurvivedDay: number;
  isHighlightedAddition?: boolean;
};

// Type for time-alive chart data with highlighting support
type ChartTimeAliveData = {
  name: string;
  value: number;
  gamesPlayed: number;
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
  selectedCamp,
  minGamesForAverage,
  onMinGamesChange,
  isLoading,
  error
}: SurvivalViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const { data: timeAliveStats, isLoading: timeAliveLoading, error: timeAliveError } = useTimeAliveStatisticsFromRaw(selectedCamp);

  // State for day selection and hover
  const [selectedDay, setSelectedDay] = useState<number>(CHART_DEFAULTS.DEFAULT_SELECTED_DAY);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'highest' | 'lowest'>('highest');
  const [timeAliveSortMode, setTimeAliveSortMode] = useState<'highest' | 'lowest'>('highest');
  const [hoveredTimeAlivePlayer, setHoveredTimeAlivePlayer] = useState<string | null>(null);

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

  // Process data for highest percentage-of-time-alive chart
  const { timeAliveHighestData, timeAliveHighlightedAddedToHighest } = useMemo(() => {
    if (!timeAliveStats) return { 
      timeAliveHighestData: [], 
      timeAliveHighlightedAddedToHighest: false 
    };

    const topPlayers = getTopTimeAliveStats(timeAliveStats, minGamesForAverage);
    const highlightedPlayerInTop15 = settings.highlightedPlayer && 
      topPlayers.some(p => p.playerName === settings.highlightedPlayer);

    const baseData: ChartTimeAliveData[] = topPlayers.map(player => ({
      name: player.playerName,
      value: player.averagePercentageAlive,
      gamesPlayed: player.gamesAnalyzed,
      isHighlightedAddition: false
    }));

    let highlightedPlayerAdded = false;
    if (settings.highlightedPlayer && !highlightedPlayerInTop15) {
      const highlightedPlayerStats = timeAliveStats.playerTimeAliveStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerStats && highlightedPlayerStats.gamesAnalyzed >= minGamesForAverage) {
        baseData.push({
          name: settings.highlightedPlayer,
          value: highlightedPlayerStats.averagePercentageAlive,
          gamesPlayed: highlightedPlayerStats.gamesAnalyzed,
          isHighlightedAddition: true
        });
        highlightedPlayerAdded = true;
      }
    }

    return { 
      timeAliveHighestData: baseData, 
      timeAliveHighlightedAddedToHighest: highlightedPlayerAdded 
    };
  }, [timeAliveStats, minGamesForAverage, settings.highlightedPlayer]);

  // Process data for lowest percentage-of-time-alive chart
  const { timeAliveLowestData, timeAliveHighlightedAddedToLowest } = useMemo(() => {
    if (!timeAliveStats) return { 
      timeAliveLowestData: [], 
      timeAliveHighlightedAddedToLowest: false 
    };

    const worstPlayers = getWorstTimeAliveStats(timeAliveStats, minGamesForAverage);
    const highlightedPlayerInWorst15 = settings.highlightedPlayer && 
      worstPlayers.some(p => p.playerName === settings.highlightedPlayer);

    const baseData: ChartTimeAliveData[] = worstPlayers.map(player => ({
      name: player.playerName,
      value: player.averagePercentageAlive,
      gamesPlayed: player.gamesAnalyzed,
      isHighlightedAddition: false
    }));

    let highlightedPlayerAdded = false;
    if (settings.highlightedPlayer && !highlightedPlayerInWorst15) {
      const highlightedPlayerStats = timeAliveStats.playerTimeAliveStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (highlightedPlayerStats && highlightedPlayerStats.gamesAnalyzed >= minGamesForAverage) {
        baseData.push({
          name: settings.highlightedPlayer,
          value: highlightedPlayerStats.averagePercentageAlive,
          gamesPlayed: highlightedPlayerStats.gamesAnalyzed,
          isHighlightedAddition: true
        });
        highlightedPlayerAdded = true;
      }
    }

    return { 
      timeAliveLowestData: baseData, 
      timeAliveHighlightedAddedToLowest: highlightedPlayerAdded 
    };
  }, [timeAliveStats, minGamesForAverage, settings.highlightedPlayer]);

  // Handle bar click to navigate to game details
  const handleBarClick = (playerName: string) => {
    navigateToGameDetails({ 
      selectedPlayer: playerName,
      fromComponent: 'Statistiques de Survie'
    });
  };

  // Custom tooltip for the percentage-of-time-alive chart
  const TimeAliveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as ChartTimeAliveData;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;

      return (
        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
          <div><strong>{label}</strong></div>
          <div>
            <span style={{ color: 'var(--accent-primary)' }}>
              Temps en vie : {data.value.toFixed(1)}%
            </span>
          </div>
          <div>Parties analysées : {data.gamesPlayed}</div>
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

          {/* Sort Mode Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sort-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Classement :
            </label>
            <select
              id="sort-mode-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'highest' | 'lowest')}
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
              <option value="highest">🛡️ Meilleurs taux</option>
              <option value="lowest">⚰️ Plus faibles taux</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary for selected day */}
      {validSelectedDay && survivalStats.dayStats.find(d => d.dayNumber === validSelectedDay) && (
        <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
          <div className="lycans-stat-carte">
            <h3>{validSelectedDay === 1 ? 'Total des parties enregistrées' : `Parties atteignant le Jour ${validSelectedDay}`}</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary-text)' }}>
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

      {/* Survival Rates Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>{sortMode === 'highest' ? '🛡️ Meilleurs' : '⚰️ Plus Faibles'} Taux de Survie - Jour {validSelectedDay}</h3>
          {((sortMode === 'highest' && highlightedPlayerAddedToHighest) || (sortMode === 'lowest' && highlightedPlayerAddedToLowest)) && settings.highlightedPlayer && (
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
        <FullscreenChart title={`${sortMode === 'highest' ? '🛡️ Meilleurs' : '⚰️ Plus Faibles'} Taux de Survie - Jour ${validSelectedDay}`}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortMode === 'highest' ? highestSurvivalData : lowestSurvivalData}
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
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as ChartSurvivalData;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                    const isHoveredPlayer = highlightedPlayer === entry.name;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[entry.name] || (sortMode === 'highest' ? 'var(--chart-primary)' : 'var(--chart-color-4)')}
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
                        onClick={() => handleBarClick(entry.name)}
                        onMouseEnter={() => setHighlightedPlayer(entry.name)}
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

      {/* Time Alive Percentage Chart */}
      <div className="lycans-section-description" style={{ marginTop: '2rem' }}>
        <p>
          Ce classement compare le pourcentage du temps réel de la partie (entre le début et la fin) pendant lequel chaque joueur était en vie, calculé à partir de l'heure de mort ({'DeathDateIrl'}) par rapport à la durée totale de la partie. Seules les parties en version 0.201 et ultérieures sont prises en compte.
        </p>
      </div>

      <div className="lycans-graphique-controles" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="time-alive-sort-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Classement :
          </label>
          <select
            id="time-alive-sort-mode-select"
            value={timeAliveSortMode}
            onChange={(e) => setTimeAliveSortMode(e.target.value as 'highest' | 'lowest')}
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
            <option value="highest">🛡️ Meilleurs taux</option>
            <option value="lowest">⚰️ Plus faibles taux</option>
          </select>
        </div>
      </div>

      <div className="lycans-graphique-section">
        <div>
          <h3>{timeAliveSortMode === 'highest' ? '🛡️ Meilleur' : '⚰️ Plus Faible'} Pourcentage de Temps en Vie</h3>
          {((timeAliveSortMode === 'highest' && timeAliveHighlightedAddedToHighest) || (timeAliveSortMode === 'lowest' && timeAliveHighlightedAddedToLowest)) && settings.highlightedPlayer && (
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
        {timeAliveLoading && <div className="donnees-attente">Chargement des statistiques de temps en vie...</div>}
        {timeAliveError && <div className="donnees-probleme">Erreur: {timeAliveError}</div>}
        {!timeAliveLoading && !timeAliveError && !timeAliveStats && (
          <div className="donnees-manquantes">Aucune donnée de temps en vie disponible</div>
        )}
        {!timeAliveLoading && !timeAliveError && timeAliveStats && (
          <FullscreenChart title={`${timeAliveSortMode === 'highest' ? '🛡️ Meilleur' : '⚰️ Plus Faible'} Pourcentage de Temps en Vie`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeAliveSortMode === 'highest' ? timeAliveHighestData : timeAliveLowestData}
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
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
                    label={{ value: 'Temps en vie (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                  />
                  <Tooltip content={<TimeAliveTooltip />} />
                  <Bar 
                    dataKey="value" 
                    name="Temps en vie"
                    cursor="pointer"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as ChartTimeAliveData;
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                      const isHoveredPlayer = hoveredTimeAlivePlayer === entry.name;
                      const isHighlightedAddition = entry.isHighlightedAddition;

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={playersColor[entry.name] || (timeAliveSortMode === 'highest' ? 'var(--chart-primary)' : 'var(--chart-color-4)')}
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
                          onClick={() => handleBarClick(entry.name)}
                          onMouseEnter={() => setHoveredTimeAlivePlayer(entry.name)}
                          onMouseLeave={() => setHoveredTimeAlivePlayer(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        )}
      </div>
    </div>
  );
}