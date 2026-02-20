import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import type { MeetingSurvivalStatistics } from '../../../hooks/utils/meetingSurvivalUtils';
import { MIN_GAMES_OPTIONS } from '../../../config/chartConstants';

// Type for chart data with highlighting support
type ChartMeetingSurvivalData = {
  name: string;
  value: number;
  totalMeetings: number;
  totalDeaths: number;
  villageoisRate: number | null;
  loupRate: number | null;
  soloRate: number | null;
  isHighlightedAddition?: boolean;
};

type ChartRawDeathsData = {
  name: string;
  value: number; // deaths at meetings (voted out)
  totalMeetings: number;
  survivalRate: number;
  isHighlightedAddition?: boolean;
};

interface MeetingSurvivalViewProps {
  meetingSurvivalStats: MeetingSurvivalStatistics | null;
  selectedCamp: string;
  minGamesForAverage: number;
  onMinGamesChange: (value: number) => void;
  isLoading: boolean;
  error: string | null;
}

export function MeetingSurvivalView({
  meetingSurvivalStats,
  selectedCamp,
  minGamesForAverage: _minGamesForAverage, // Keep for interface compatibility but mark as unused
  onMinGamesChange: _onMinGamesChange, // Keep for interface compatibility but mark as unused
  isLoading,
  error
}: MeetingSurvivalViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [minMeetings, setMinMeetings] = useState<number>(5);
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest'>('highest');

  // Minimum meetings options
  const minMeetingsOptions = MIN_GAMES_OPTIONS.MEETINGS;

  // Process data for survival rates chart (highest first)
  const { survivalData, highlightedPlayerAdded } = useMemo(() => {
    if (!meetingSurvivalStats) return { 
      survivalData: [], 
      highlightedPlayerAdded: false 
    };

    const eligiblePlayers = meetingSurvivalStats.playerStats
      .filter(player => player.totalMeetingsParticipated >= minMeetings)
      .sort((a, b) => sortOrder === 'highest' ? b.survivalRate - a.survivalRate : a.survivalRate - b.survivalRate)
      .slice(0, 20);
    
    const highlightedPlayerInTop = settings.highlightedPlayer && 
      eligiblePlayers.some(p => p.playerName === settings.highlightedPlayer);
    
    const baseData: ChartMeetingSurvivalData[] = eligiblePlayers.map(player => ({
      name: player.playerName,
      value: player.survivalRate,
      totalMeetings: player.totalMeetingsParticipated,
      totalDeaths: player.totalDeathsAtMeetings,
      villageoisRate: player.campBreakdown.villageois.survivalRate,
      loupRate: player.campBreakdown.loups.survivalRate,
      soloRate: player.campBreakdown.solo.survivalRate,
      isHighlightedAddition: false
    }));

    let highlightedPlayerAdded = false;

    // Add highlighted player if not in top 20 but meets minimum criteria
    if (settings.highlightedPlayer && !highlightedPlayerInTop) {
      const highlightedPlayerStats = meetingSurvivalStats.playerStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      
      if (highlightedPlayerStats && 
          highlightedPlayerStats.totalMeetingsParticipated >= minMeetings) {
        baseData.push({
          name: settings.highlightedPlayer,
          value: highlightedPlayerStats.survivalRate,
          totalMeetings: highlightedPlayerStats.totalMeetingsParticipated,
          totalDeaths: highlightedPlayerStats.totalDeathsAtMeetings,
          villageoisRate: highlightedPlayerStats.campBreakdown.villageois.survivalRate,
          loupRate: highlightedPlayerStats.campBreakdown.loups.survivalRate,
          soloRate: highlightedPlayerStats.campBreakdown.solo.survivalRate,
          isHighlightedAddition: true
        });
        
        highlightedPlayerAdded = true;
      }
    }

    return { 
      survivalData: baseData, 
      highlightedPlayerAdded 
    };
  }, [meetingSurvivalStats, settings.highlightedPlayer, selectedCamp, minMeetings, sortOrder]);

  // Raw deaths chart data (no min-meetings filter, camp filter already applied in stats)
  const { rawDeathsData, rawDeathsHighlightedAdded } = useMemo(() => {
    if (!meetingSurvivalStats) return { rawDeathsData: [], rawDeathsHighlightedAdded: false };

    const sorted = [...meetingSurvivalStats.playerStats]
      .filter(p => p.totalDeathsAtMeetings > 0)
      .sort((a, b) => b.totalDeathsAtMeetings - a.totalDeathsAtMeetings)
      .slice(0, 20);

    const inTop = settings.highlightedPlayer &&
      sorted.some(p => p.playerName === settings.highlightedPlayer);

    const baseData: ChartRawDeathsData[] = sorted.map(player => ({
      name: player.playerName,
      value: player.totalDeathsAtMeetings,
      totalMeetings: player.totalMeetingsParticipated,
      survivalRate: player.survivalRate,
      isHighlightedAddition: false
    }));

    let rawDeathsHighlightedAdded = false;

    if (settings.highlightedPlayer && !inTop) {
      const hp = meetingSurvivalStats.playerStats.find(
        p => p.playerName === settings.highlightedPlayer
      );
      if (hp && hp.totalDeathsAtMeetings > 0) {
        baseData.push({
          name: hp.playerName,
          value: hp.totalDeathsAtMeetings,
          totalMeetings: hp.totalMeetingsParticipated,
          survivalRate: hp.survivalRate,
          isHighlightedAddition: true
        });
        rawDeathsHighlightedAdded = true;
      }
    }

    return { rawDeathsData: baseData, rawDeathsHighlightedAdded };
  }, [meetingSurvivalStats, settings.highlightedPlayer]);

  // Handle bar click to navigate to player's games
  const handleBarClick = (data: any) => {
    if (data && data.name) {
      navigateToGameDetails({
        selectedPlayer: data.name,
        fromComponent: 'Survie aux meetings'
      });
    }
  };

  // Custom tooltip for raw deaths chart
  const CustomTooltipDeaths = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as ChartRawDeathsData;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const isHighlightedAddition = data.isHighlightedAddition;

      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
            fontSize: isHighlightedFromSettings ? '1.1rem' : '1rem'
          }}>
            {data.name}
          </div>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 'bold',
            color: 'var(--danger, #e05252)',
            marginBottom: '0.5rem'
          }}>
            💀 {data.value} mort{data.value > 1 ? 's' : ''} en meeting
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Meetings participés : {data.totalMeetings}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Taux de survie global : {data.survivalRate.toFixed(1)}%</div>
          {isHighlightedAddition && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--accent-primary)',
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (hors top 20)
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
            textAlign: 'center'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for survival rate chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as ChartMeetingSurvivalData;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const isHighlightedAddition = data.isHighlightedAddition;
      const meetsMinMeetings = data.totalMeetings >= minMeetings;
      const timesSurvived = data.totalMeetings - data.totalDeaths;

      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)',
            fontSize: isHighlightedFromSettings ? '1.1rem' : '1rem'
          }}>
            {data.name}
          </div>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            color: 'var(--accent-secondary)',
            marginBottom: '0.5rem'
          }}>
            Taux de survie aux meetings: {data.value.toFixed(1)}%
          </div>
          <div>Meetings participants: {data.totalMeetings}</div>
          <div>A survécu: {timesSurvived}</div>
          <div>Mort en meeting: {data.totalDeaths}</div>
          {selectedCamp === 'Tous les camps' && (
            <>
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Par camp:</div>
                {data.villageoisRate !== null && (
                  <div>Villageois: {data.villageoisRate.toFixed(1)}%</div>
                )}
                {data.loupRate !== null && (
                  <div>Loup: {data.loupRate.toFixed(1)}%</div>
                )}
                {data.soloRate !== null && (
                  <div>Solo: {data.soloRate.toFixed(1)}%</div>
                )}
              </div>
            </>
          )}
          {isHighlightedAddition && !meetsMinMeetings && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (&lt; {minMeetings} meetings)
            </div>
          )}
          {isHighlightedAddition && meetsMinMeetings && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (hors top 20)
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

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de survie aux meetings...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!meetingSurvivalStats) return <div className="donnees-manquantes">Aucune donnée de survie aux meetings disponible</div>;

  return (
    <div className="lycans-meeting-survival-stats">
      {/* Explanation */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          Les statistiques de survie aux meetings montrent le pourcentage de fois qu'un joueur survit après la réunion parmi tous les meetings auxquels il a participé. 
          Un joueur "participe" à un meeting s'il était vivant au début de celui-ci. Seules les morts par vote comptent ici.
        </p>
        <p>
          {highlightedPlayerAdded && 'Les joueurs mis en évidence apparaissent même s\'ils ne sont pas dans le top 20.'}
        </p>
      </div>

      {/* Controls */}
      <div className="lycans-graphique-controles" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sort-order-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Tri :
            </label>
            <select
              id="sort-order-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'highest' | 'lowest')}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                minWidth: '200px'
              }}
            >
              <option value="highest">Plus haut taux de survie</option>
              <option value="lowest">Plus bas taux de survie</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="min-meetings-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Min. meetings :
            </label>
            <select
              id="min-meetings-select"
              value={minMeetings}
              onChange={(e) => setMinMeetings(parseInt(e.target.value))}
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
              {minMeetingsOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
        <div className="lycans-stat-carte">
          <h3>Total des parties analysées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary-text)' }}>
            {meetingSurvivalStats.totalGames}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Total des meetings</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
            {meetingSurvivalStats.totalMeetings}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Joueurs éligibles (min. {minMeetings} meetings)</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
            {meetingSurvivalStats.playerStats.filter(p => 
              p.totalMeetingsParticipated >= minMeetings
            ).length}
          </div>
        </div>
      </div>

      {/* Survival rate chart */}
      <FullscreenChart title={sortOrder === 'highest' ? '🛡️ Taux de Survie aux Meetings (Plus Haut)' : '💀 Taux de Survie aux Meetings (Plus Bas)'}>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart 
            data={survivalData}
            margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis 
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              stroke="var(--text-secondary)"
              tick={(props) => {
                const { x, y, payload } = props;
                const isHighlighted = settings.highlightedPlayer === payload.value;
                return (
                  <text
                    x={x}
                    y={y}
                    dy={10}
                    textAnchor="end"
                    fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                    fontSize={isHighlighted ? 14 : 12}
                    fontWeight={isHighlighted ? 'bold' : 'normal'}
                    transform={`rotate(-45 ${x} ${y})`}
                  >
                    {payload.value}
                  </text>
                );
              }}
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Taux de survie (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-primary)' }}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }}
            />
            <Bar 
              dataKey="value" 
              fill="var(--chart-primary)"
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const entry = payload as ChartMeetingSurvivalData;
                const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                const isHighlightedAddition = entry.isHighlightedAddition;
                const isHovered = highlightedPlayer === entry.name;
                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={
                      isHighlightedFromSettings ? 'var(--accent-primary)' :
                      isHighlightedAddition ? 'var(--accent-secondary)' :
                      isHovered ? 'var(--accent-primary-text)' :
                      playersColor[entry.name] || 'var(--chart-primary)'
                    }
                    stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : 'none'}
                    strokeWidth={isHighlightedFromSettings ? 3 : 0}
                    strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                    opacity={isHighlightedAddition ? 0.8 : 1}
                    onClick={() => handleBarClick(entry)}
                    onMouseEnter={() => setHighlightedPlayer(entry.name)}
                    onMouseLeave={() => setHighlightedPlayer(null)}
                    style={{ cursor: 'pointer' }}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </FullscreenChart>

      {/* Raw vote deaths record chart */}
      <div>
        <div className="lycans-section-description" style={{ marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🏆 Record de morts en meeting</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Nombre total de fois où chaque joueur a été éliminé par un vote de meeting.
            {selectedCamp !== 'Tous les camps' && ` Filtré sur le camp : ${selectedCamp}.`}
            {' '}Aucun filtre de meetings minimum appliqué — tous les joueurs apparaissent.
            {rawDeathsHighlightedAdded && ' Le joueur sélectionné est affiché même s\'il n\'est pas dans le top 20.'}
          </p>
        </div>
        <FullscreenChart title="🏆 Record de Morts en Meeting (Votes)">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={rawDeathsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                stroke="var(--text-secondary)"
                tick={(props) => {
                  const { x, y, payload } = props;
                  const isHighlighted = settings.highlightedPlayer === payload.value;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={10}
                      textAnchor="end"
                      fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={isHighlighted ? 14 : 12}
                      fontWeight={isHighlighted ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <YAxis
                allowDecimals={false}
                label={{ value: 'Morts en meeting', angle: -90, position: 'insideLeft', fill: 'var(--text-primary)' }}
                stroke="var(--text-secondary)"
                tick={{ fill: 'var(--text-secondary)' }}
              />
              <Tooltip
                content={<CustomTooltipDeaths />}
                cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }}
              />
              <Bar
                dataKey="value"
                fill="var(--danger, #e05252)"
                label={{
                  position: 'top',
                  fill: 'var(--text-secondary)',
                  fontSize: 11
                }}
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as ChartRawDeathsData;
                  const isHighlightedFromSettings = settings.highlightedPlayer === entry.name;
                  const isHighlightedAddition = entry.isHighlightedAddition;
                  const isHovered = highlightedPlayer === entry.name;
                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={
                        isHighlightedFromSettings ? 'var(--accent-primary)' :
                        isHighlightedAddition ? 'var(--accent-secondary)' :
                        isHovered ? 'var(--accent-primary-text)' :
                        playersColor[entry.name] || 'var(--danger, #e05252)'
                      }
                      stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : 'none'}
                      strokeWidth={isHighlightedFromSettings ? 3 : 0}
                      strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                      opacity={isHighlightedAddition ? 0.8 : 1}
                      onClick={() => handleBarClick(entry)}
                      onMouseEnter={() => setHighlightedPlayer(entry.name)}
                      onMouseLeave={() => setHighlightedPlayer(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>
    </div>
  );
}
