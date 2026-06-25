import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useEventStatsFromRaw } from '../../hooks/useEventStatsFromRaw';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import type { EventStatsResult } from '../../utils/eventStatsUtils';
import { EVENT_LOW_SAMPLE_THRESHOLD, EVENT_MIN_VERSION } from '../../utils/eventStatsUtils';

// Shape for Recharts data: one entry per event row
interface ChartEntry {
  label: string;
  gameCount: number;
  lowSample: boolean;
  [camp: string]: number | string | boolean;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function deltaColor(delta: number): string {
  if (delta > 2) return '#4caf50';
  if (delta < -2) return '#f44336';
  return 'var(--text-secondary)';
}

function buildTooltip(
  campColors: Record<string, string>,
  data: EventStatsResult,
  chartData: ChartEntry[]
) {
  return function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length || !label) return null;
    const entry = chartData.find(d => d.label === label);
    if (!entry) return null;
    const eventRow = data.events.find(ev => `${ev.emoji} ${ev.frenchName}` === label);

    return (
      <div style={{
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        minWidth: '220px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '15px' }}>{label}</div>
        <div style={{ opacity: 0.75, fontSize: '12px', marginBottom: '10px' }}>
          {entry.gameCount} partie{(entry.gameCount as number) > 1 ? 's' : ''}
          {entry.lowSample && <span style={{ marginLeft: '6px' }}>⚠️ données insuffisantes</span>}
        </div>
        {data.displayCamps.map(camp => {
          const rate = (entry[camp] as number) ?? 0;
          const delta = eventRow?.campRates[camp]?.delta ?? 0;
          const color = campColors[camp] || '#607D8B';
          return (
            <div key={camp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', gap: '16px' }}>
              <span style={{ color, fontWeight: 600 }}>■ {camp}</span>
              <span>
                <strong>{rate.toFixed(1)}%</strong>{' '}
                <span style={{ color: deltaColor(delta), fontSize: '12px' }}>
                  ({formatDelta(delta)})
                </span>
              </span>
            </div>
          );
        })}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '8px', paddingTop: '6px', opacity: 0.6, fontSize: '11px' }}>
          Δ = écart vs baseline (toutes parties)
        </div>
      </div>
    );
  };
}

export function EventsStatsChart() {
  const { data, isLoading, error } = useEventStatsFromRaw();
  const campColors = useThemeAdjustedLycansColorScheme();

  const chartData = useMemo<ChartEntry[]>(() => {
    if (!data) return [];
    return data.events.map(ev => {
      const entry: ChartEntry = {
        label: `${ev.emoji} ${ev.frenchName}`,
        gameCount: ev.gameCount,
        lowSample: ev.lowSample,
      };
      for (const camp of data.displayCamps) {
        entry[camp] = ev.campRates[camp]?.winRate ?? 0;
      }
      return entry;
    });
  }, [data]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement des évènements...</div>;
  }
  if (error) {
    return <div className="donnees-probleme">Erreur : {error}</div>;
  }
  if (!data || data.events.length === 0) {
    return (
      <div className="donnees-manquantes">
        Aucune donnée d'évènement journalier disponible dans les parties sélectionnées.
      </div>
    );
  }

  const regularHeight = data.events.length * 72 + 60;
  const CustomTooltip = buildTooltip(campColors, data, chartData);

  const renderChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 10, right: 60, left: 170, bottom: 10 }}
        barCategoryGap="25%"
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        {/* Dashed baseline reference lines (one per camp) */}
        {data.displayCamps.map(camp => (
          <ReferenceLine
            key={`ref-${camp}`}
            x={data.baseline[camp]?.winRate ?? 0}
            stroke={campColors[camp] || '#607D8B'}
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
        ))}

        {/* One bar per camp */}
        {data.displayCamps.map(camp => (
          <Bar
            key={camp}
            dataKey={camp}
            name={camp}
            fill={campColors[camp] || '#607D8B'}
            barSize={14}
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={`cell-${camp}-${idx}`}
                fill={campColors[camp] || '#607D8B'}
                opacity={entry.lowSample ? 0.35 : 0.85}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <FullscreenChart title="Impact des Évènements Journaliers sur les Victoires">
      {(isFullscreen: boolean) => (
        <div>
          {/* Description */}
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            Taux de victoire par camp lorsque l'évènement s'est produit au moins une fois dans la partie,
            sur {data.totalGames} parties (version {EVENT_MIN_VERSION}+). Les lignes tiretées indiquent le taux de référence global.
          </p>

          {/* Baseline summary pills */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {data.displayCamps.map(camp => {
              const b = data.baseline[camp];
              const color = campColors[camp] || '#607D8B';
              return (
                <div key={camp} style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ color, fontWeight: 700 }}>— {camp}</span>
                  <span>baseline : {b?.winRate.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>

          {renderChart(isFullscreen ? Math.max(500, data.events.length * 90 + 60) : regularHeight)}

          {data.events.some(ev => ev.lowSample) && (
            <p style={{ color: 'var(--text-tertiary, var(--text-secondary))', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
              ⚠️ Les barres transparentes correspondent à moins de {EVENT_LOW_SAMPLE_THRESHOLD} parties — résultats peu représentatifs.
            </p>
          )}
        </div>
      )}
    </FullscreenChart>
  );
}
