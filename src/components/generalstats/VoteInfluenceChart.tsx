import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { useVoteInfluenceFromRaw } from '../../hooks/useVoteInfluenceFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';

export function VoteInfluenceChart() {
  const { data, isLoading, error } = useVoteInfluenceFromRaw();
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  // Colors
  const accentColor = lycansColorScheme.Villageois || '#4CAF50';
  const secondaryColor = lycansColorScheme.Loup || '#f44336';
  const neutralColor = '#FF9800';
  const baselineColor = '#9E9E9E';

  // ─── Chart A: First Voter Effect ──────────────────────────────────────
  const firstVoterData = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: '1er votant',
        taux: parseFloat(data.firstVoterEffect.firstVoterSuccessRate.toFixed(1)),
        fill: accentColor
      },
      {
        name: 'Votant moyen',
        taux: parseFloat(data.firstVoterEffect.averageVoterSuccessRate.toFixed(1)),
        fill: baselineColor
      }
    ];
  }, [data, accentColor]);

  // ─── Chart B: Speaker vs Eliminated ───────────────────────────────────
  const speakerBucketData = useMemo(() => {
    if (!data) return [];
    return data.speakerElimination.talkTimeBuckets.map(bucket => ({
      name: bucket.range,
      eliminationRate: parseFloat(bucket.eliminationRate.toFixed(1)),
      joueurs: bucket.totalPlayers
    }));
  }, [data]);

  // ─── Chart C: Top Speaker Influence ───────────────────────────────────
  const topSpeakerData = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Plus gros parleur',
        taux: parseFloat(data.topSpeakerInfluence.topSpeakerSuccessRate.toFixed(1)),
        fill: accentColor
      },
      {
        name: 'Joueur moyen',
        taux: parseFloat(data.topSpeakerInfluence.averagePlayerSuccessRate.toFixed(1)),
        fill: baselineColor
      }
    ];
  }, [data, accentColor]);

  // ─── Chart D: Vote Timing vs Success ──────────────────────────────────
  const timingData = useMemo(() => {
    if (!data) return [];
    return data.voteTimingSuccess.timingBuckets.map(bucket => ({
      name: bucket.position,
      successRate: parseFloat(bucket.successRate.toFixed(1)),
      votes: bucket.voteCount
    }));
  }, [data]);

  // ─── Chart E: Follow the Leader ───────────────────────────────────────
  const followData = useMemo(() => {
    if (!data) return [];
    return data.followTheLeader.bandwagonByFirstVoterTalkTime.map(bucket => ({
      name: bucket.talkTimeBucket,
      followRate: parseFloat(bucket.followRate.toFixed(1)),
      meetings: bucket.meetingCount
    }));
  }, [data]);

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement des statistiques d'influence...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
      Erreur lors du chargement : {error}
    </div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      Aucune donnée d'influence disponible (nécessite des parties moddées avec votes horodatés, Version ≥ 0.201)
    </div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      {/* Disclaimer */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-tertiary, var(--background-secondary))',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }}>
        📊 Analyse basée sur <strong>{data.totalTimedGames}</strong> parties moddées avec votes horodatés
        ({data.totalMeetingsAnalyzed} meetings analysés). Le temps de parole est normalisé par meeting fréquenté.
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <SummaryCard
          title="Succès du 1er Votant"
          value={`${data.firstVoterEffect.firstVoterSuccessRate.toFixed(1)}%`}
          color={accentColor}
          subtitle={`vs ${data.firstVoterEffect.averageVoterSuccessRate.toFixed(1)}% pour un votant moyen`}
        />
        <SummaryCard
          title="Influence du + Gros Parleur"
          value={`${data.topSpeakerInfluence.topSpeakerSuccessRate.toFixed(1)}%`}
          color={secondaryColor}
          subtitle={`vs ${data.topSpeakerInfluence.averagePlayerSuccessRate.toFixed(1)}% pour un joueur moyen`}
        />
        <SummaryCard
          title="Taux de Suivi du + Gros Parleur"
          value={`${data.topSpeakerInfluence.topSpeakerFollowRate.toFixed(1)}%`}
          color={neutralColor}
          subtitle="des votants suivent le plus gros parleur"
        />
        <SummaryCard
          title="Effet Bandwagon"
          value={`${data.followTheLeader.overallBandwagonRate.toFixed(1)}%`}
          color={accentColor}
          subtitle="des votants suivent le 1er votant"
        />
      </div>

      {/* A: First Voter Effect */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🗳️ Effet du Premier Votant</h3>
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          Taux de réussite du premier votant (sa cible est éliminée) comparé au taux attendu par hasard.
          Basé sur {data.firstVoterEffect.meetingsAnalyzed} meetings.
        </p>
        <FullscreenChart title="Effet du Premier Votant">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={firstVoterData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis
                label={{ value: 'Taux de succès (%)', angle: -90, position: 'insideLeft' }}
                stroke="var(--text-secondary)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isNaN(v) ? value : v.toFixed(1)}%`, 'Taux'];
                }}
              />
              <Bar dataKey="taux" name="Taux de succès" radius={[8, 8, 0, 0]}>
                {firstVoterData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* B: Speaker vs Eliminated */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🔇 Temps de Parole et Élimination</h3>
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          Taux d'élimination par quartile de temps de parole (normalisé par meeting).
          Percentile moyen des éliminés : <strong>{data.speakerElimination.eliminatedAvgTalkPercentile.toFixed(0)}%</strong> vs
          survivants : <strong>{data.speakerElimination.survivorAvgTalkPercentile.toFixed(0)}%</strong>.
        </p>
        <FullscreenChart title="Temps de Parole et Élimination">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={speakerBucketData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                label={{ value: 'Quartile de temps de parole', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: "Taux d'élimination (%)", angle: -90, position: 'insideLeft' }}
                stroke="var(--text-secondary)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isNaN(v) ? value : v.toFixed(1)}%`, 'Élimination'];
                }}
              />
              <Bar dataKey="eliminationRate" name="Taux d'élimination" fill={secondaryColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* C: Top Speaker Influence */}
      <div className="lycans-graphique-section">
        <div>
          <h3>🎤 Influence du Plus Gros Parleur</h3>
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          Quand le joueur qui parle le plus vote pour quelqu'un, cette personne est-elle éliminée plus souvent ?
          Taux de suivi : <strong>{data.topSpeakerInfluence.topSpeakerFollowRate.toFixed(1)}%</strong> des autres votants suivent son choix.
        </p>
        <FullscreenChart title="Influence du Plus Gros Parleur">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSpeakerData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis
                label={{ value: 'Taux de succès (%)', angle: -90, position: 'insideLeft' }}
                stroke="var(--text-secondary)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
              formatter={(value) => {
                const v = typeof value === 'number' ? value : Number(value);
                return [`${Number.isNaN(v) ? value : v.toFixed(1)}%`, 'Taux'];
              }}
              />
              <Bar dataKey="taux" name="Taux de succès" radius={[8, 8, 0, 0]}>
                {topSpeakerData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* D: Vote Timing vs Success */}
      <div className="lycans-graphique-section">
        <div>
          <h3>⏱️ Timing de Vote et Succès</h3>
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          Les votants rapides ont-ils plus souvent raison ? Taux de succès (cible éliminée) par quartile de rapidité de vote.
        </p>
        <FullscreenChart title="Timing de Vote et Succès">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={timingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                angle={-20}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'Taux de succès (%)', angle: -90, position: 'insideLeft' }}
                stroke="var(--text-secondary)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isNaN(v) ? value : v.toFixed(1)}%`, 'Succès'];
                }}
              />
              <ReferenceLine
                y={data.topSpeakerInfluence.averagePlayerSuccessRate}
                stroke={baselineColor}
                strokeDasharray="5 5"
                label={{ value: 'Moyenne', position: 'right', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Bar dataKey="successRate" name="Taux de succès" fill={neutralColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>

      {/* E: Follow the Leader */}
      <div className="lycans-graphique-section">
        <div>
          <h3>👥 Effet Bandwagon</h3>
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          Le premier votant est-il plus suivi quand il parle beaucoup ?
          Taux global : <strong>{data.followTheLeader.overallBandwagonRate.toFixed(1)}%</strong> des votants suivent le premier votant.
        </p>
        <FullscreenChart title="Effet Bandwagon">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={followData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey="name"
                stroke="var(--text-secondary)"
                label={{ value: 'Temps de parole du 1er votant (quartile)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'Taux de suivi (%)', angle: -90, position: 'insideLeft' }}
                stroke="var(--text-secondary)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(value) => {
                  const v = typeof value === 'number' ? value : Number(value);
                  return [`${Number.isNaN(v) ? value : v.toFixed(1)}%`, 'Suivi'];
                }}
              />
              <ReferenceLine
                y={data.followTheLeader.overallBandwagonRate}
                stroke={baselineColor}
                strokeDasharray="5 5"
                label={{ value: 'Moyenne', position: 'right', fill: 'var(--text-secondary)', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="followRate" name="Taux de suivi" fill={accentColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FullscreenChart>
      </div>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '10px',
  color: 'var(--text-primary)'
};

const tooltipLabelStyle = { color: 'var(--text-primary)', fontWeight: 'bold' as const };
const tooltipItemStyle = { color: 'var(--text-primary)' };

// ─── Summary Card ───────────────────────────────────────────────────────────

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
