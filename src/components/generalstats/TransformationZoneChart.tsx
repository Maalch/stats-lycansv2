import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useTransformationZoneStatsFromRaw } from '../../hooks/useTransformationZoneStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';

// A stable color per zone for visual consistency across both charts
const ZONE_COLORS: Record<string, string> = {
  'Village Principal': '#e07b5f',
  'Ferme': '#7ecba1',
  'Village Pêcheur': '#5b9bd5',
  'Ruines': '#c4a24d',
  'Reste de la Carte': '#9e9e9e',
};

const CustomTooltipTransform = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{label}</div>
      <div>Transformations : <strong>{d.transformCount}</strong></div>
      <div>Part : <strong>{d.percentage.toFixed(1)}%</strong></div>
    </div>
  );
};

const CustomTooltipKills = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{label}</div>
      <div>Kills moyens / timing : <strong>{d.avgKills.toFixed(2)}</strong></div>
      <div>Total kills : <strong>{d.totalKills}</strong></div>
      <div>Transformations : <strong>{d.sampleSize}</strong></div>
    </div>
  );
};

const CustomTooltipWinRate = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{label}</div>
      <div>Taux de victoire Loups : <strong>{d.wolfWinRate.toFixed(1)}%</strong></div>
      <div>Victoires : <strong>{d.wolfWinCount}</strong> / {d.sampleSize} transform.</div>
    </div>
  );
};

export function TransformationZoneChart() {
  const { data, isLoading, error } = useTransformationZoneStatsFromRaw();
  const lycansColors = useThemeAdjustedLycansColorScheme();

  const wolfColor = lycansColors['Loup'] ?? '#c0392b';

  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const sortedByTransforms = useMemo(
    () =>
      data?.zoneStats
        ? [...data.zoneStats].sort((a, b) => b.transformCount - a.transformCount)
        : [],
    [data]
  );

  const sortedByKills = useMemo(
    () =>
      data?.zoneStats
        ? [...data.zoneStats]
            .filter(z => z.sampleSize >= 2)
            .sort((a, b) => b.avgKills - a.avgKills)
        : [],
    [data]
  );

  const sortedByWinRate = useMemo(
    () =>
      data?.zoneStats
        ? [...data.zoneStats]
            .filter(z => z.sampleSize >= 2)
            .sort((a, b) => b.wolfWinRate - a.wolfWinRate)
        : [],
    [data]
  );

  if (isLoading) return <div className="statistiques-chargement">Chargement des données...</div>;
  if (error) return <div className="statistiques-erreur">Erreur : {error}</div>;
  if (!data || data.totalTransformations === 0) {
    return (
      <div className="statistiques-vide">
        Aucune donnée de transformation disponible pour la carte Village.
      </div>
    );
  }

  return (
    <div className="transformation-zone-container">
      <h2>Zones de Transformation (Village)</h2>

      <div className="lycans-graphiques-groupe">
        {/* ── Chart 1 : Zones de transformation ── */}
        <div className="lycans-graphique-section">
          <h3>Zones de Transformation des Loups</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0.5rem' }}>
            {data.totalTransformations} transformation{data.totalTransformations > 1 ? 's' : ''} au total sur la carte Village
          </p>
          <FullscreenChart title="Zones de Transformation des Loups (Village)">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={sortedByTransforms}
                margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="zone"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={hoveredZone === payload.value ? 'var(--text-primary)' : 'var(--text-secondary)'}
                      fontSize={hoveredZone === payload.value ? 14 : 12}
                      fontWeight={hoveredZone === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-25 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  label={{
                    value: 'Transformations',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--text-secondary)',
                    fontSize: 12,
                  }}
                />
                <Tooltip content={<CustomTooltipTransform />} />
                <Bar dataKey="transformCount" radius={[4, 4, 0, 0]}>
                  {sortedByTransforms.map(entry => (
                    <Cell
                      key={entry.zone}
                      fill={ZONE_COLORS[entry.zone] ?? wolfColor}
                      stroke={hoveredZone === entry.zone ? 'var(--text-primary)' : 'none'}
                      strokeWidth={hoveredZone === entry.zone ? 2 : 0}
                      onMouseEnter={() => setHoveredZone(entry.zone)}
                      onMouseLeave={() => setHoveredZone(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="top"
                    formatter={(v: unknown) => `${(v as number).toFixed(0)}%`}
                    style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* ── Chart 2 : Kills moyens par zone de transformation ── */}
        <div className="lycans-graphique-section">
          <h3>Kills Moyens par Zone de Transformation</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0.5rem' }}>
            Kills moyens par événement de transformation : seules les morts survenues au même Timing (ex. N3) que la transformation sont comptabilisées
            {sortedByKills.length < sortedByTransforms.length && (
              <span style={{ marginLeft: '0.5rem' }}>(zones avec {'<'} 2 transformations masquées)</span>
            )}
          </p>
          {sortedByKills.length === 0 ? (
            <div className="statistiques-vide">
              Pas assez de données pour calculer les moyennes par zone.
            </div>
          ) : (
            <FullscreenChart title="Kills Moyens par Zone de Transformation (Village)">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={sortedByKills}
                  margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="zone"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill={hoveredZone === payload.value ? 'var(--text-primary)' : 'var(--text-secondary)'}
                        fontSize={hoveredZone === payload.value ? 14 : 12}
                        fontWeight={hoveredZone === payload.value ? 'bold' : 'normal'}
                        transform={`rotate(-25 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    label={{
                      value: 'Kills moyens',
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'var(--text-secondary)',
                      fontSize: 12,
                    }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltipKills />} />
                  <Bar dataKey="avgKills" radius={[4, 4, 0, 0]}>
                    {sortedByKills.map(entry => (
                      <Cell
                        key={entry.zone}
                        fill={ZONE_COLORS[entry.zone] ?? wolfColor}
                        stroke={hoveredZone === entry.zone ? 'var(--text-primary)' : 'none'}
                        strokeWidth={hoveredZone === entry.zone ? 2 : 0}
                        onMouseEnter={() => setHoveredZone(entry.zone)}
                        onMouseLeave={() => setHoveredZone(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                    <LabelList
                      dataKey="avgKills"
                      position="top"
                      formatter={(v: unknown) => (v as number).toFixed(2)}
                      style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </FullscreenChart>
          )}
        </div>

        {/* ── Chart 3 : Taux de victoire Loups par zone ── */}
        <div className="lycans-graphique-section">
          <h3>Taux de Victoire Loups par Zone de Transformation</h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0.5rem' }}>
            Taux de victoire du camp Loups par zone de transformation (une valeur par événement de transformation)
            {sortedByWinRate.length < sortedByTransforms.length && (
              <span style={{ marginLeft: '0.5rem' }}>(zones avec {'<'} 2 transformations masquées)</span>
            )}
          </p>
          {sortedByWinRate.length === 0 ? (
            <div className="statistiques-vide">
              Pas assez de données pour calculer les taux de victoire par zone.
            </div>
          ) : (
            <FullscreenChart title="Taux de Victoire Loups par Zone de Transformation (Village)">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={sortedByWinRate}
                  margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="zone"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill={hoveredZone === payload.value ? 'var(--text-primary)' : 'var(--text-secondary)'}
                        fontSize={hoveredZone === payload.value ? 14 : 12}
                        fontWeight={hoveredZone === payload.value ? 'bold' : 'normal'}
                        transform={`rotate(-25 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    label={{
                      value: 'Taux de victoire (%)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'var(--text-secondary)',
                      fontSize: 12,
                    }}
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltipWinRate />} />
                  <Bar dataKey="wolfWinRate" radius={[4, 4, 0, 0]}>
                    {sortedByWinRate.map(entry => (
                      <Cell
                        key={entry.zone}
                        fill={ZONE_COLORS[entry.zone] ?? wolfColor}
                        stroke={hoveredZone === entry.zone ? 'var(--text-primary)' : 'none'}
                        strokeWidth={hoveredZone === entry.zone ? 2 : 0}
                        onMouseEnter={() => setHoveredZone(entry.zone)}
                        onMouseLeave={() => setHoveredZone(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                    <LabelList
                      dataKey="wolfWinRate"
                      position="top"
                      formatter={(v: unknown) => `${(v as number).toFixed(0)}%`}
                      style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </FullscreenChart>
          )}
        </div>

        {/* Legend */}
        <div className="lycans-section-description" style={{ flex: '1 1 100%', marginTop: '1rem' }}>
          <h4>À propos de cette page</h4>
          <p>
            Analyse des transformations en loup sur la carte <strong>Village</strong> uniquement.
            Seuls les joueurs du camp <strong>Loups</strong> avec au moins une action de
            type <em>Transform</em> enregistrée sont pris en compte.
          </p>
          <p style={{ marginTop: '0.4rem' }}>
            <strong>Graphique 1 :</strong> Répartition du nombre de transformations par zone de la
            carte Village.
          </p>
          <p style={{ marginTop: '0.4rem' }}>
            <strong>Graphique 2 :</strong> Pour chaque zone, moyenne des kills effectués au même
            Timing que la transformation (ex. : si le loup se transforme en N3 dans cette zone,
            seules les morts en N3 de ce loup sont comptabilisées). Chaque événement de transformation
            est un point de donnée indépendant.
          </p>
          <p style={{ marginTop: '0.4rem' }}>
            <strong>Graphique 3 :</strong> Taux de victoire du camp Loups par zone. Chaque
            événement de transformation contribue 1 si la partie a été gagnée par les Loups, 0 sinon.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginTop: '0.75rem',
            }}
          >
            {Object.entries(ZONE_COLORS).map(([zone, color]) => (
              <span
                key={zone}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: color,
                  }}
                />
                {zone}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
