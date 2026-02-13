import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { usePlayerTalkingTimeStats } from '../../../hooks/usePlayerTalkingTimeStats';
import { getRoleBreakdownTopN } from '../../../hooks/utils/playerTalkingTimeUtils';
import { useThemeAdjustedLycansColorScheme, getCampColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { formatSecondsToMinutesSeconds } from '../../../utils/durationFormatters';

interface PlayerHistoryTalkingTimeProps {
  selectedPlayerName: string;
}

type MeetingFilter = 'both' | 'meeting' | 'outside';

export function PlayerHistoryTalkingTime({ selectedPlayerName }: PlayerHistoryTalkingTimeProps) {
  const { data, isLoading, error } = usePlayerTalkingTimeStats(selectedPlayerName);
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>('both');

  // Prepare camp comparison data for bar chart
  const campComparisonData = useMemo(() => {
    if (!data?.campBreakdown) return [];

    return data.campBreakdown.map(camp => ({
      camp: camp.camp,
      'Hors réunion': Math.round(camp.secondsOutsidePer60Min),
      'En réunion': Math.round(camp.secondsDuringPer60Min),
      total: Math.round(camp.secondsAllPer60Min),
      gamesPlayed: camp.gamesPlayed,
      meetingRatio: camp.meetingRatio.toFixed(1)
    }));
  }, [data]);

  // Prepare meeting distribution data for pie chart
  const meetingDistributionData = useMemo(() => {
    if (!data) return [];

    return [
      { name: 'En réunion', value: data.totalSecondsDuring, color: '#2196F3' },
      { name: 'Hors réunion', value: data.totalSecondsOutside, color: '#FF9800' }
    ];
  }, [data]);

  // Note: Using getCampColor from api.ts for consistent color management across components

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de temps de parole...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return (
      <div className="donnees-manquantes">
        <p>Aucune donnée de temps de parole disponible pour ce joueur.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Les données de temps de parole ne sont disponibles que pour les parties récentes.
        </p>
      </div>
    );
  }

  // Calculate talk time difference from average
  const diffFromAverage = data.secondsAllPer60Min - data.globalAverageSecondsAllPer60Min;
  const diffPercentage = data.globalAverageSecondsAllPer60Min > 0 
    ? ((diffFromAverage / data.globalAverageSecondsAllPer60Min) * 100).toFixed(0)
    : '0';
  const isAboveAverage = diffFromAverage > 0;

  // Win correlation insight
  const winRateDiff = data.winCorrelation.winRateAboveAverage - data.winCorrelation.winRateBelowAverage;

  return (
    <div className="lycans-graphiques-groupe">
      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
          <h3>🎤 Temps de parole / 60min</h3>
          <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
            {formatSecondsToMinutesSeconds(data.secondsAllPer60Min)}
          </div>
          <p style={{ fontSize: '0.8rem', color: isAboveAverage ? 'var(--success-color, #4CAF50)' : 'var(--warning-color, #FF9800)' }}>
            {isAboveAverage ? '+' : ''}{diffPercentage}% vs moyenne
          </p>
        </div>

        <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
          <h3>📊 Classement</h3>
          <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
            #{data.playerRank} / {data.totalPlayersWithData}
          </div>
          <p>Top {100 - data.percentile + 1}% {data.percentile >= 50 ? 'bavard' : 'discret'}</p>
        </div>

        <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
          <h3>📈 Parties analysées</h3>
          <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
            {data.gamesPlayed}
          </div>
          <p>sur {data.gamesWithTalkingData} avec données</p>
        </div>

        <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
          <h3>🗣️ Ratio en réunion</h3>
          <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
            {data.meetingRatio.toFixed(1)}%
          </div>
          <p>du temps de parole</p>
        </div>
      </div>

      {/* Camp Comparison Chart */}
      {campComparisonData.length > 0 && (
        <div className="lycans-graphique-section">
          <FullscreenChart title="Temps de parole par camp (par 60min de jeu)">
            {/* Meeting Type Filter */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setMeetingFilter('meeting')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: meetingFilter === 'meeting' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: meetingFilter === 'meeting' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: meetingFilter === 'meeting' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: meetingFilter === 'meeting' ? 'bold' : 'normal'
                }}
              >
                En réunion
              </button>
              <button
                onClick={() => setMeetingFilter('outside')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: meetingFilter === 'outside' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: meetingFilter === 'outside' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: meetingFilter === 'outside' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: meetingFilter === 'outside' ? 'bold' : 'normal'
                }}
              >
                Hors réunion
              </button>
              <button
                onClick={() => setMeetingFilter('both')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: meetingFilter === 'both' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: meetingFilter === 'both' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: meetingFilter === 'both' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: meetingFilter === 'both' ? 'bold' : 'normal'
                }}
              >
                Les deux
              </button>
            </div>

            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="camp" 
                    tick={{ fill: 'var(--text-primary)' }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => {
                      const numericValue = typeof value === 'number' ? value : Number(value);
                      const displayValue = Number.isNaN(numericValue)
                        ? `${value}`
                        : formatSecondsToMinutesSeconds(numericValue);
                      return [displayValue, name];
                    }}
                    labelFormatter={(label) => {
                      const campData = campComparisonData.find(c => c.camp === label);
                      return `${label} (${campData?.gamesPlayed || 0} parties)`;
                    }}
                  />
                  <Legend />
                  {(meetingFilter === 'both' || meetingFilter === 'outside') && (
                    <Bar dataKey="Hors réunion" stackId="talk" fill="#FF9800" />
                  )}
                  {(meetingFilter === 'both' || meetingFilter === 'meeting') && (
                    <Bar dataKey="En réunion" stackId="talk" fill="#2196F3" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          
          {/* Insight text - Always compare Villageois vs Loup */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            {(() => {
              const villageoisData = campComparisonData.find(c => c.camp === 'Villageois');
              const loupsData = campComparisonData.find(c => c.camp === 'Loup');
              
              if (!villageoisData || !loupsData) {
                return (
                  <p>
                    💡 Pas assez de données pour comparer les camps Villageois et Loups.
                  </p>
                );
              }

              const diff = villageoisData.total - loupsData.total;
              const percentage = loupsData.total > 0 
                ? ((Math.abs(diff) / loupsData.total) * 100).toFixed(0)
                : '0';
              
              if (diff > 0) {
                return (
                  <p>
                    💡 <strong>{selectedPlayerName}</strong> parle{' '}
                    <strong style={{ color: getCampColor('Villageois') }}>
                      {formatSecondsToMinutesSeconds(diff)} de plus (+{percentage}%)
                    </strong>{' '}
                    en tant que <strong>Villageois</strong> qu'en tant que{' '}
                    <strong>Loup</strong> (par heure de jeu).
                  </p>
                );
              } else if (diff < 0) {
                return (
                  <p>
                    💡 <strong>{selectedPlayerName}</strong> parle{' '}
                    <strong style={{ color: getCampColor('Loup') }}>
                      {formatSecondsToMinutesSeconds(Math.abs(diff))} de plus (+{percentage}%)
                    </strong>{' '}
                    en tant que <strong>Loup</strong> qu'en tant que{' '}
                    <strong>Villageois</strong> (par heure de jeu).
                  </p>
                );
              } else {
                return (
                  <p>
                    💡 <strong>{selectedPlayerName}</strong> parle exactement autant en tant que{' '}
                    <strong>Villageois</strong> qu'en tant que <strong>Loup</strong> (par heure de jeu).
                  </p>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Meeting Distribution Pie Chart */}
      <div className="lycans-graphique-section">
        <FullscreenChart title="Répartition du temps de parole">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={meetingDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(1)}%`}
                >
                  {meetingDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => {
                    const numericValue = typeof value === 'number' ? value : Number(value);
                    return Number.isNaN(numericValue)
                      ? `${value}`
                      : formatSecondsToMinutesSeconds(numericValue);
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>

      {/* Role Breakdown */}
      {data && data.roleBreakdown.length > 0 && (
        <div className="lycans-graphique-section">
          <FullscreenChart title={(isFullscreen) => isFullscreen ? "Top 15 rôles les plus bavards (par 60min)" : "Top 5 rôles les plus bavards (par 60min)"}>
            {(isFullscreen) => {
              const topN = isFullscreen ? 15 : 5;
              const roleBreakdownData = getRoleBreakdownTopN(data, topN).map(role => ({
                role: role.role,
                secondsPer60Min: Math.round(role.secondsAllPer60Min),
                gamesPlayed: role.gamesPlayed
              }));
              
              return (
                <div style={{ height: isFullscreen ? 400 : 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleBreakdownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis 
                        dataKey="role" 
                        tick={{ fill: 'var(--text-primary)', fontSize: 12 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fill: 'var(--text-secondary)' }}
                        tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => {
                          const numericValue = typeof value === 'number' ? value : Number(value);
                          const displayValue = Number.isNaN(numericValue)
                            ? `${value}`
                            : formatSecondsToMinutesSeconds(numericValue);
                          return [displayValue, 'Temps de parole'];
                        }}
                        labelFormatter={(label) => {
                          const roleData = roleBreakdownData.find(r => r.role === label);
                          return `${label} (${roleData?.gamesPlayed || 0} parties)`;
                        }}
                      />
                      <Bar dataKey="secondsPer60Min" fill="var(--accent-primary, #8884d8)">
                        {roleBreakdownData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={lycansColorScheme[entry.role as keyof typeof lycansColorScheme] || lycansColorScheme.Villageois}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            }}
          </FullscreenChart>
        </div>
      )}

      {/* Win Correlation Insight */}
      {(data.winCorrelation.gamesAboveAverage > 0 || data.winCorrelation.gamesBelowAverage > 0) && (
        <div className="lycans-graphique-section">
          <h3>🎯 Corrélation avec les victoires</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Quand parle + que sa moyenne
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {data.winCorrelation.winRateAboveAverage.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                de victoires ({data.winCorrelation.winsAboveAverage}/{data.winCorrelation.gamesAboveAverage} parties)
              </div>
            </div>

            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Quand parle - que sa moyenne
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {data.winCorrelation.winRateBelowAverage.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                de victoires ({data.winCorrelation.winsBelowAverage}/{data.winCorrelation.gamesBelowAverage} parties)
              </div>
            </div>
          </div>

          {Math.abs(winRateDiff) > 5 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
              <p>
                💡 <strong>{selectedPlayerName}</strong> a un taux de victoire{' '}
                <strong style={{ color: winRateDiff > 0 ? 'var(--success-color, #4CAF50)' : 'var(--warning-color, #FF9800)' }}>
                  {winRateDiff > 0 ? 'supérieur' : 'inférieur'} de {Math.abs(winRateDiff).toFixed(1)}%
                </strong>{' '}
                quand il/elle parle plus que sa moyenne.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
