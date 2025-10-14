import { useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { useGlobalVotingStatsFromRaw } from '../../hooks/useGlobalVotingStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';

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
    
    // Only show camps that can have multiple members (for friendly fire to be meaningful)
    const multiMemberCamps = ['Amoureux', 'Villageois', 'Agent', 'Loup'];
    
    return data.campVotingStats
      .filter(camp => multiMemberCamps.includes(camp.campName))
      .map(camp => ({
        camp: camp.campName,
        accuracyRate: parseFloat(camp.accuracyRate.toFixed(1)),
        friendlyFireRate: parseFloat(camp.friendlyFireRate.toFixed(1)),
        totalVotes: camp.totalVotes
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
          title="Meetings Totales"
          value={data.totalMeetings}
          color={lycansColorScheme.Villageois}
        />
        <SummaryCard
          title="Votes Totaux"
          value={data.totalVotes}
          color={lycansColorScheme.Loup}
        />
        <SummaryCard
          title="Passes Totales"
          value={data.totalSkips}
          color="#FF9800"
        />
        <SummaryCard
          title="Abstentions Totales"
          value={data.totalAbstentions}
          color="#9E9E9E"
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
          title="Taux d'Abstention Moyen"
          value={`${data.averageAbstentionRate.toFixed(1)}%`}
          color="#9E9E9E"
          subtitle="% de joueurs ne participant pas"
        />
      </div>

      {/* Meeting Day Evolution */}
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
              formatter={(value: number) => `${value.toFixed(1)}%`}
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
              name="Taux d'Abstention"
              stroke="#9E9E9E"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </FullscreenChart>

      {/* Camp Accuracy */}
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
              formatter={(value: number, name: string) => {
                const displayName = name === 'accuracyRate' ? 'Vote Camp Opposé' : 'Tir Allié';
                return [`${value.toFixed(1)}%`, displayName];
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
