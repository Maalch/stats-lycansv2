import { useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie 
} from 'recharts';
import { useGlobalVotingStatsFromRaw } from '../../hooks/useGlobalVotingStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor } from '../../types/api';

export function GlobalVotingStatsChart() {
  const { data, isLoading, error } = useGlobalVotingStatsFromRaw();
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  // Prepare data for meeting day evolution chart
  const meetingDayData = useMemo(() => {
    if (!data?.meetingDayStats) return [];
    
    return data.meetingDayStats.map(day => ({
      ...day,
      meetingLabel: `Meeting ${day.meetingDay}`,
      votingRate: parseFloat(day.averageVotingRate.toFixed(1)),
      skipRate: parseFloat(day.averageSkipRate.toFixed(1)),
      abstentionRate: parseFloat(day.averageAbstentionRate.toFixed(1))
    }));
  }, [data]);

  // Prepare data for camp accuracy chart
  const campAccuracyData = useMemo(() => {
    if (!data?.campVotingStats) return [];
    
    // Only show the two main opposing camps (Villageois vs Loups including Traître/Louveteau)
    const mainCamps = ['Villageois', 'Loup'];
    
    return data.campVotingStats
      .filter(camp => mainCamps.includes(camp.campName))
      .map(camp => ({
        camp: camp.campName,
        accuracyRate: parseFloat(camp.accuracyRate.toFixed(1)),
        friendlyFireRate: parseFloat(camp.friendlyFireRate.toFixed(1)),
        totalVotes: camp.totalVotes
      }));
  }, [data]);

  // Prepare data for camp elimination pie chart
  const campEliminationData = useMemo(() => {
    if (!data?.campEliminationStats) return [];
    
    return data.campEliminationStats.map(camp => ({
      name: camp.campName,
      value: camp.eliminations,
      percentage: camp.percentage,
      fill: camp.campName === 'Villageois' 
        ? lycansColorScheme.Villageois 
        : camp.campName === 'Loup' 
          ? lycansColorScheme.Loup 
          : lycansOtherCategoryColor
    }));
  }, [data, lycansColorScheme]);

  // Prepare data for vote diversity distribution chart (distinct players voted per meeting)
  const voteDiversityData = useMemo(() => {
    if (!data?.voteDiversityStats) return [];

    return data.voteDiversityStats.map(entry => ({
      distinctTargetsCount: entry.distinctTargetsCount,
      label: `${entry.distinctTargetsCount}`,
      meetingCount: entry.meetingCount,
      percentage: parseFloat(entry.percentage.toFixed(1))
    }));
  }, [data]);

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement des statistiques de vote...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
      Erreur lors du chargement : {error}
    </div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      Aucune donnée de vote disponible
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        <SummaryCard
          title="Meetings Totaux"
          value={data.totalMeetings}
          color={lycansColorScheme.Villageois}
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        <SummaryCard
          title="Taux de Vote Moyen"
          value={`${data.averageVotingRate.toFixed(1)}%`}
          color={lycansColorScheme.Villageois}
          subtitle="% de joueurs votant activement"
        />
        <SummaryCard
          title="Taux de Passe Moyen"
          value={`${data.averageSkipRate.toFixed(1)}%`}
          color="#FF9800"
          subtitle="% de joueurs passant"
        />
        <SummaryCard
          title="Taux de Non-Vote Moyen"
          value={`${data.averageAbstentionRate.toFixed(1)}%`}
          color="#9E9E9E"
          subtitle="% de joueurs ne participant pas"
        />
      </div>

      {/* Meeting Day Evolution */}
      <div className="lycans-graphique-section">
        <div>
          <h3>📅 Évolution des Comportements par Jour de Meeting</h3>
        </div>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          marginBottom: '1rem' 
        }}>
          Tendance moyenne des comportements de vote au fil des meetings successifs d'une partie: activité de vote, passes et non-votes.
        </p>
        <FullscreenChart title="Évolution des Comportements par Jour de Meeting">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={meetingDayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis 
              dataKey="meetingLabel" 
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="var(--text-secondary)"
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={16}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  fontSize={13}
                  transform={`rotate(-45 ${x} ${y})`}
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis 
              label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }}
              stroke="var(--text-secondary)"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px',
                color: 'var(--text-primary)'
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              formatter={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                if (Number.isNaN(numericValue)) {
                  return `${value}%`;
                }
                return `${numericValue.toFixed(1)}%`;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="votingRate" 
              name="Taux de Vote"
              stroke={lycansColorScheme.Villageois}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="skipRate" 
              name="Taux de Passe"
              stroke="#FF9800"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="abstentionRate" 
              name="Taux de Non-Vote"
              stroke="#9E9E9E"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* Camp Accuracy */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🛡️ Précision de Vote par Camp</h3>
        </div>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          marginBottom: '1rem' 
        }}>
          Pourcentage moyen de votes dirigés contre un camp adverse comparé au taux de "tir allié" (votes contre son propre camp) pour chaque camp.
        </p>
        <FullscreenChart title="Précision de Vote par Camp">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={campAccuracyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis 
              dataKey="camp" 
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="var(--text-secondary)"
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={16}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  fontSize={16}
                  transform={`rotate(-45 ${x} ${y})`}
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis 
              label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft' }}
              stroke="var(--text-secondary)"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px',
                color: 'var(--text-primary)'
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              formatter={(value, name) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                const displayName = name === 'accuracyRate' ? 'Vote Camp Opposé' : 'Tir Allié';
                if (Number.isNaN(numericValue)) {
                  return [`${value}%`, displayName];
                }
                return [`${numericValue.toFixed(1)}%`, displayName];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'accuracyRate') return 'Vote Camp Opposé';
                if (value === 'friendlyFireRate') return 'Tir Allié';
                return value;
              }}
            />
            <Bar 
              dataKey="accuracyRate" 
              name="accuracyRate"
              fill={lycansColorScheme.Villageois}
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="friendlyFireRate" 
              name="friendlyFireRate"
              fill={lycansColorScheme.Loup}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* Camp Elimination Distribution */}
      {campEliminationData.length > 0 && (
        <div className="lycans-graphique-section">
          <div>
            <h3>⚰️ Répartition des Éliminations par Camp</h3>
          </div>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            textAlign: 'center', 
            marginBottom: '1rem' 
          }}>
            Distribution des {data?.totalEliminations || 0} joueurs éliminés par vote selon leur camp. Les rôles solo (Amoureux, Agent, etc.) sont regroupés en "Solo Rôles".
          </p>
          <FullscreenChart title="Répartition des Éliminations par Camp">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={campEliminationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  dataKey="value"
                  label={({ payload }) => {
                    const p = payload as { name: string; percentage: number };
                    return `${p.name}: ${p.percentage.toFixed(1)}%`;
                  }}
                  labelLine={true}
                />
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
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{data.name}</div>
                          <div>Éliminations: <strong>{data.value}</strong></div>
                          <div>Pourcentage: <strong>{data.percentage.toFixed(1)}%</strong></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => {
                    const entry = campEliminationData.find(d => d.name === value);
                    return `${value} (${entry?.value || 0})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
      )}

      {/* Vote Diversity Distribution */}
      {voteDiversityData.length > 0 && (
        <div className="lycans-graphique-section">
          <div>
            <h3>🎯 Nombre de Joueurs Différents Votés par Meeting</h3>
          </div>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            textAlign: 'center', 
            marginBottom: '1rem' 
          }}>
            Nombre de meetings ayant vu 0, 1, 2, 3... joueurs différents recevoir des votes (hors passes).
          </p>
          <FullscreenChart title="Nombre de Joueurs Différents Votés par Meeting">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={voteDiversityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis 
                  dataKey="label" 
                  label={{ value: 'Joueurs différents votés', position: 'insideBottom', offset: -10 }}
                  stroke="var(--text-secondary)"
                />
                <YAxis 
                  label={{ value: 'Nombre de meetings', angle: -90, position: 'insideLeft' }}
                  stroke="var(--text-secondary)"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: 'var(--text-primary)'
                  }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value, name, item) => {
                    if (name === 'meetingCount') {
                      const percentage = item.payload.percentage;
                      return [`${value} (${percentage.toFixed(1)}%)`, 'Meetings'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${label} joueur(s) différent(s) voté(s)`}
                />
                <Bar 
                  dataKey="meetingCount" 
                  name="meetingCount"
                  fill={lycansColorScheme.Villageois}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>
      )}
    </div>
  );
}

// Helper component for summary cards
interface SummaryCardProps {
  title: string;
  value: string | number;
  color: string;
  subtitle?: string;
}

function SummaryCard({ title, value, color, subtitle }: SummaryCardProps) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'var(--background-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ 
        fontSize: '0.875rem', 
        color: 'var(--text-secondary)',
        marginBottom: '0.5rem'
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold',
        color: color,
        marginBottom: subtitle ? '0.25rem' : '0'
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-tertiary)',
          fontStyle: 'italic'
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
