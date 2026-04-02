import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { usePlayerColorRankingFromRaw } from '../../hooks/usePlayerColorRankingFromRaw';
import { useThemeAdjustedFrenchColorMapping, useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { useJoueursData } from '../../hooks/useJoueursData';
import { FullscreenChart } from '../common/FullscreenChart';
import { CHART_LIMITS, MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS } from '../../config/chartConstants';
import { useSettings } from '../../context/SettingsContext';

export function PlayerColorRankingChart() {
  const { data, isLoading, error } = usePlayerColorRankingFromRaw();
  const frenchColorMapping = useThemeAdjustedFrenchColorMapping();
  const { settings } = useSettings();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [minGames, setMinGames] = useState<number>(MIN_GAMES_DEFAULTS.MEDIUM);

  // Set default color once data loads
  const colors = data?.colors ?? [];
  const activeColor = selectedColor ?? colors[0] ?? null;

  // Data for games played chart (no min games filter)
  const gamesChartData = useMemo(() => {
    if (!data || !activeColor) return [];
    const entries = data.byColor.get(activeColor) ?? [];
    return [...entries]
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, CHART_LIMITS.TOP_20);
  }, [data, activeColor]);

  // Data for win rate chart (with min games filter)
  const winRateChartData = useMemo(() => {
    if (!data || !activeColor) return [];
    const entries = data.byColor.get(activeColor) ?? [];
    return [...entries]
      .filter(e => e.gamesPlayed >= minGames)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, CHART_LIMITS.TOP_20);
  }, [data, activeColor, minGames]);

  if (isLoading) return <div className="statistiques-chargement">Chargement...</div>;
  if (error) return <div className="statistiques-erreur">Erreur : {error}</div>;
  if (!data || colors.length === 0) return <div className="statistiques-vide">Aucune donnée disponible</div>;

  const barFill = frenchColorMapping[activeColor ?? ''] || '#888888';

  return (
    <div className="color-statistics-container">
      <h2>Classement par Couleur</h2>

      {/* Color selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Couleur
          <select
            value={activeColor ?? ''}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {colors.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Games played chart */}
        <div className="lycans-graphique-section">
          <h3>Nombre de Parties en {activeColor}</h3>
          <FullscreenChart title={`Nombre de Parties en ${activeColor}`}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={gamesChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="playerName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis
                  label={{ value: 'Parties', angle: 270, position: 'left', style: { fill: 'var(--text-secondary)', textAnchor: 'middle' } }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.playerName}</strong></div>
                          <div>Parties en {activeColor}: <strong>{d.gamesPlayed}</strong></div>
                          <div>Victoires: {d.wins}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="gamesPlayed"
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const isHighlighted = settings.highlightedPlayer === payload.playerName;
                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[payload.playerName] || barFill}
                        stroke={isHighlighted ? 'var(--accent-primary)' : 'none'}
                        strokeWidth={isHighlighted ? 3 : 0}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </FullscreenChart>
        </div>

        {/* Win rate chart */}
        <div className="lycans-graphique-section">
          <h3>Taux de Victoire en {activeColor}</h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              Min. parties
              <select
                value={minGames}
                onChange={(e) => setMinGames(Number(e.target.value))}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {MIN_GAMES_OPTIONS.EXTENDED.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <FullscreenChart title={`Taux de Victoire en ${activeColor}`}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={winRateChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="playerName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={16}
                      textAnchor="end"
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis
                  label={{ value: 'Taux de Victoire (%)', angle: 270, position: 'left', style: { fill: 'var(--text-secondary)', textAnchor: 'middle' } }}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div><strong>{d.playerName}</strong></div>
                          <div>Taux de Victoire: <strong>{d.winRate.toFixed(1)}%</strong></div>
                          <div>Victoires: {d.wins} / {d.gamesPlayed} parties</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="winRate"
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const isHighlighted = settings.highlightedPlayer === payload.playerName;
                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[payload.playerName] || barFill}
                        stroke={isHighlighted ? 'var(--accent-primary)' : 'none'}
                        strokeWidth={isHighlighted ? 3 : 0}
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
    </div>
  );
}
