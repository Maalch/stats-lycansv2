import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import { FullscreenChart } from '../common/FullscreenChart';
import { useVotingStatisticsFromRaw, useFilteredVotingStatistics } from '../../hooks/useVotingStatisticsFromRaw';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, useThemeAdjustedLycansColorScheme } from '../../types/api';

export function VotingStatisticsChart() {
  const { settings } = useSettings();
  const { navigateToGameDetails } = useNavigation();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  const [selectedView, setSelectedView] = useState<'behavior' | 'accuracy' | 'targets' | 'overview'>('overview');
  const [minMeetings, setMinMeetings] = useState<number>(5);
  
  const { data: allVotingStats, isLoading, error } = useVotingStatisticsFromRaw();
  const { data: filteredVotingStats } = useFilteredVotingStatistics(minMeetings);

  // Handle chart clicks to navigate to game details
  const handlePlayerClick = (data: any) => {
    if (data && data.playerName) {
      navigateToGameDetails({
        selectedPlayer: data.playerName,
        fromComponent: 'Statistiques de Vote'
      });
    }
  };

  // Prepare data for different views
  const behaviorChartData = useMemo(() => {
    if (!filteredVotingStats) return [];
    return filteredVotingStats.playerBehaviorStats
      .map(player => ({
        ...player,
        isHighlightedAddition: settings.highlightedPlayer === player.playerName &&
          !filteredVotingStats.playerBehaviorStats.slice(0, 15).some(p => p.playerName === player.playerName)
      }))
      .sort((a, b) => b.aggressivenessScore - a.aggressivenessScore)
      .slice(0, settings.highlightedPlayer ? 16 : 15);
  }, [filteredVotingStats, settings.highlightedPlayer]);

  const accuracyChartData = useMemo(() => {
    if (!filteredVotingStats) return [];
    return filteredVotingStats.playerAccuracyStats
      .map(player => ({
        ...player,
        isHighlightedAddition: settings.highlightedPlayer === player.playerName &&
          !filteredVotingStats.playerAccuracyStats.slice(0, 15).some(p => p.playerName === player.playerName)
      }))
      .sort((a, b) => b.accuracyRate - a.accuracyRate)
      .slice(0, settings.highlightedPlayer ? 16 : 15);
  }, [filteredVotingStats, settings.highlightedPlayer]);

  const targetChartData = useMemo(() => {
    if (!filteredVotingStats) return [];
    return filteredVotingStats.playerTargetStats
      .map(player => ({
        ...player,
        isHighlightedAddition: settings.highlightedPlayer === player.playerName &&
          !filteredVotingStats.playerTargetStats.slice(0, 15).some(p => p.playerName === player.playerName)
      }))
      .sort((a, b) => b.survivalRate - a.survivalRate)
      .slice(0, settings.highlightedPlayer ? 16 : 15);
  }, [filteredVotingStats, settings.highlightedPlayer]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de vote...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!allVotingStats || !filteredVotingStats) {
    return <div className="donnees-manquantes">Aucune donnée de vote disponible</div>;
  }

  const minMeetingsOptions = [3, 5, 8, 10, 15];

  return (
    <div className="lycans-voting-statistics">
      <h2>📊 Statistiques de Vote</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        gap: '2rem', 
        marginBottom: '2rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="view-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Vue:
          </label>
          <select
            id="view-select"
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '180px'
            }}
          >
            <option value="overview">📊 Vue d'ensemble</option>
            <option value="behavior">🗳️ Comportements de vote</option>
            <option value="accuracy">🎯 Précision des votes</option>
            <option value="targets">🔻 Joueurs ciblés</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="min-meetings-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Min. réunions:
          </label>
          <select
            id="min-meetings-select"
            value={minMeetings}
            onChange={(e) => setMinMeetings(Number(e.target.value))}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              width: '90px'
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

      {/* Overview Cards */}
      {selectedView === 'overview' && (
        <div className="lycans-resume-conteneur">
          <div className="lycans-stat-carte">
            <h3>Total Réunions</h3>
            <div className="lycans-valeur-principale">{allVotingStats.overallMeetingStats.totalMeetings}</div>
            <p>réunions de vote</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Participation Moyenne</h3>
            <div className="lycans-valeur-principale">{allVotingStats.overallMeetingStats.averageParticipationRate.toFixed(1)}%</div>
            <p>des joueurs participent</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Total Votes</h3>
            <div className="lycans-valeur-principale">{allVotingStats.overallMeetingStats.totalVotes}</div>
            <p>votes effectifs</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>Abstentions</h3>
            <div className="lycans-valeur-principale">{allVotingStats.overallMeetingStats.totalSkips + allVotingStats.overallMeetingStats.totalAbstentions}</div>
            <p>passés + absents</p>
          </div>
        </div>
      )}

      <div className="lycans-graphiques-groupe">
        {/* Voting Behavior Chart */}
        {selectedView === 'behavior' && (
          <div className="lycans-graphique-section">
            <h3>🗳️ Comportements de Vote - Score d'Agressivité</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Score basé sur le taux de vote, les abstentions et les "passés". Plus c'est haut, plus le joueur vote activement.
            </p>
            <FullscreenChart title="Comportements de Vote - Score d'Agressivité">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={behaviorChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="playerName"
                      angle={-45}
                      textAnchor="end"
                      height={110}
                      interval={0}
                      fontSize={13}
                      tick={({ x, y, payload }) => {
                        const isHighlighted = settings.highlightedPlayer === payload.value;
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                            fontSize={isHighlighted ? 14 : 13}
                            fontWeight={isHighlighted ? 'bold' : 'italic'}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Score d\'Agressivité (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{dataPoint.playerName}</strong></div>
                              <div>Réunions: {dataPoint.totalMeetings}</div>
                              <div>Votes: {dataPoint.totalVotes} ({dataPoint.votingRate.toFixed(1)}%)</div>
                              <div>Passés: {dataPoint.totalSkips} ({dataPoint.skippingRate.toFixed(1)}%)</div>
                              <div>Absents: {dataPoint.totalAbstentions} ({dataPoint.abstentionRate.toFixed(1)}%)</div>
                              <div><strong>Score: {dataPoint.aggressivenessScore.toFixed(1)}%</strong></div>
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
                      }}
                    />
                    <Bar 
                      dataKey="aggressivenessScore" 
                      style={{ cursor: 'pointer' }}
                      onClick={handlePlayerClick}
                    >
                      {behaviorChartData.map((entry, index) => {
                        const isHighlighted = settings.highlightedPlayer === entry.playerName;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              playersColor[entry.playerName] || 
                              (entry.aggressivenessScore >= 0 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                            }
                            stroke={isHighlighted ? 'var(--accent-primary)' : 'transparent'}
                            strokeWidth={isHighlighted ? 3 : 0}
                            strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Voting Accuracy Chart */}
        {selectedView === 'accuracy' && (
          <div className="lycans-graphique-section">
            <h3>🎯 Précision des Votes - Taux de Votes Justes</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Pourcentage de votes dirigés contre le camp adverse (et non contre son propre camp).
            </p>
            <FullscreenChart title="Précision des Votes - Taux de Votes Justes">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={accuracyChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="playerName"
                      angle={-45}
                      textAnchor="end"
                      height={110}
                      interval={0}
                      fontSize={13}
                      tick={({ x, y, payload }) => {
                        const isHighlighted = settings.highlightedPlayer === payload.value;
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                            fontSize={isHighlighted ? 14 : 13}
                            fontWeight={isHighlighted ? 'bold' : 'italic'}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Taux de Précision (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{dataPoint.playerName}</strong></div>
                              <div>Total votes: {dataPoint.totalVotes}</div>
                              <div>Votes justes: {dataPoint.votesForEnemyCamp} ({dataPoint.accuracyRate.toFixed(1)}%)</div>
                              <div>Feu ami: {dataPoint.votesForOwnCamp} ({dataPoint.friendlyFireRate.toFixed(1)}%)</div>
                              <div>Auto-votes: {dataPoint.votesForSelf}</div>
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
                      }}
                    />
                    <Bar 
                      dataKey="accuracyRate" 
                      style={{ cursor: 'pointer' }}
                      onClick={handlePlayerClick}
                    >
                      {accuracyChartData.map((entry, index) => {
                        const isHighlighted = settings.highlightedPlayer === entry.playerName;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              playersColor[entry.playerName] || 
                              (entry.accuracyRate >= 50 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                            }
                            stroke={isHighlighted ? 'var(--accent-primary)' : 'transparent'}
                            strokeWidth={isHighlighted ? 3 : 0}
                            strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Target Survival Chart */}
        {selectedView === 'targets' && (
          <div className="lycans-graphique-section">
            <h3>🔻 Joueurs Ciblés - Taux de Survie aux Votes</h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              textAlign: 'center', 
              marginBottom: '1rem' 
            }}>
              Pourcentage de fois où le joueur a survécu après avoir été ciblé par des votes.
            </p>
            <FullscreenChart title="Joueurs Ciblés - Taux de Survie aux Votes">
              <div style={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={targetChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="playerName"
                      angle={-45}
                      textAnchor="end"
                      height={110}
                      interval={0}
                      fontSize={13}
                      tick={({ x, y, payload }) => {
                        const isHighlighted = settings.highlightedPlayer === payload.value;
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                            fontSize={isHighlighted ? 14 : 13}
                            fontWeight={isHighlighted ? 'bold' : 'italic'}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Taux de Survie (%)', 
                        angle: 270, 
                        position: 'left', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{dataPoint.playerName}</strong></div>
                              <div>Fois ciblé: {dataPoint.totalTimesTargeted}</div>
                              <div>Éliminé par vote: {dataPoint.eliminationsByVote}</div>
                              <div>Taux de survie: {dataPoint.survivalRate.toFixed(1)}%</div>
                              <div>Par camp ennemi: {dataPoint.timesTargetedByEnemyCamp}</div>
                              <div>Par propre camp: {dataPoint.timesTargetedByOwnCamp}</div>
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
                      }}
                    />
                    <Bar 
                      dataKey="survivalRate" 
                      style={{ cursor: 'pointer' }}
                      onClick={handlePlayerClick}
                    >
                      {targetChartData.map((entry, index) => {
                        const isHighlighted = settings.highlightedPlayer === entry.playerName;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              playersColor[entry.playerName] || 
                              (entry.survivalRate >= 50 ? 'var(--accent-tertiary)' : 'var(--accent-danger)')
                            }
                            stroke={isHighlighted ? 'var(--accent-primary)' : 'transparent'}
                            strokeWidth={isHighlighted ? 3 : 0}
                            strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Overview - Multiple charts */}
        {selectedView === 'overview' && (
          <>
            {/* Participation Overview Pie Chart */}
            <div className="lycans-graphique-section">
              <h3>📊 Répartition des Actions de Vote</h3>
              <FullscreenChart title="Répartition des Actions de Vote">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={[
                          { 
                            name: 'Votes Effectifs', 
                            value: allVotingStats.overallMeetingStats.totalVotes,
                            fill: lycansColorScheme['Villageois'] 
                          },
                          { 
                            name: 'Passés', 
                            value: allVotingStats.overallMeetingStats.totalSkips,
                            fill: lycansColorScheme['Loup'] 
                          },
                          { 
                            name: 'Abstentions', 
                            value: allVotingStats.overallMeetingStats.totalAbstentions,
                            fill: 'var(--accent-danger)' 
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(1)}%)`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>

            {/* Top Aggressive Voters */}
            <div className="lycans-graphique-section">
              <h3>🔥 Voteurs les Plus Agressifs</h3>
              <FullscreenChart title="Voteurs les Plus Agressifs (Top 10)">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={behaviorChartData.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="playerName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score d\'Agressivité']}
                      />
                      <Bar dataKey="aggressivenessScore" fill="var(--accent-tertiary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>

            {/* Most Accurate Voters */}
            <div className="lycans-graphique-section">
              <h3>🎯 Voteurs les Plus Précis</h3>
              <FullscreenChart title="Voteurs les Plus Précis (Top 10)">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={accuracyChartData.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="playerName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taux de Précision']}
                      />
                      <Bar dataKey="accuracyRate" fill="var(--accent-secondary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          </>
        )}
      </div>
    </div>
  );
}