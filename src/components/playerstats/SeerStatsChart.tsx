import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useSeerStats, type SeerKillerStat, type SeerVictimStat } from '../../hooks/useSeerStats';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { CHART_LIMITS, MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS } from '../../config/chartConstants';

type ChartKillerStat = SeerKillerStat & { isHighlightedAddition?: boolean };
type ChartVictimStat = SeerVictimStat & { isHighlightedAddition?: boolean };

export function SeerStatsChart() {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { data, isLoading, error } = useSeerStats();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  const [hoveredKiller, setHoveredKiller] = useState<string | null>(null);
  const [hoveredVictim, setHoveredVictim] = useState<string | null>(null);
  const [minLoupGames, setMinLoupGames] = useState<number>(MIN_GAMES_DEFAULTS.LOW);
  const [minVillageoisGames, setMinVillageoisGames] = useState<number>(MIN_GAMES_DEFAULTS.LOW);

  // --- Killers chart data ---
  const { killersChartData, killerHighlightedAdded } = useMemo(() => {
    if (!data?.killers.length) return { killersChartData: [], killerHighlightedAdded: false };

    const sorted = [...data.killers]
      .filter(k => k.gamesAsLoup >= minLoupGames)
      .sort((a, b) => b.killRate - a.killRate)
      .slice(0, CHART_LIMITS.TOP_20);

    const inTop = settings.highlightedPlayer && sorted.some(k => k.player === settings.highlightedPlayer);
    let chartData: ChartKillerStat[] = [...sorted];
    let added = false;

    if (settings.highlightedPlayer && !inTop) {
      const extra = data.killers.find(k => k.player === settings.highlightedPlayer);
      if (extra) {
        chartData.push({ ...extra, isHighlightedAddition: true });
        added = true;
      }
    }

    return { killersChartData: chartData, killerHighlightedAdded: added };
  }, [data, settings.highlightedPlayer, minLoupGames]);

  // --- Victims chart data ---
  const { victimsChartData, victimHighlightedAdded } = useMemo(() => {
    if (!data?.victims.length) return { victimsChartData: [], victimHighlightedAdded: false };

    const sorted = [...data.victims]
      .filter(v => v.gamesAsVillageois >= minVillageoisGames)
      .sort((a, b) => b.deathRate - a.deathRate)
      .slice(0, CHART_LIMITS.TOP_20);

    const inTop = settings.highlightedPlayer && sorted.some(v => v.player === settings.highlightedPlayer);
    let chartData: ChartVictimStat[] = [...sorted];
    let added = false;

    if (settings.highlightedPlayer && !inTop) {
      const extra = data.victims.find(v => v.player === settings.highlightedPlayer);
      if (extra) {
        chartData.push({ ...extra, isHighlightedAddition: true });
        added = true;
      }
    }

    return { victimsChartData: chartData, victimHighlightedAdded: added };
  }, [data, settings.highlightedPlayer, minVillageoisGames]);

  if (isLoading) return <div className="donnees-attente">Récupération des statistiques Boule de Cristal...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!data) return <div className="donnees-manquantes">Aucune donnée disponible</div>;

  return (
    <div className="lycans-players-stats">
      <h2>Boule de Cristal</h2>
      <p className="lycans-stats-info">
        Statistiques des kills et morts par boule de cristal  — uniquement les parties en version 0.284+.
        {' '}{data.eligibleGamesCount} partie{data.eligibleGamesCount > 1 ? 's' : ''} éligible{data.eligibleGamesCount > 1 ? 's' : ''}.
      </p>

      <div className="lycans-graphiques-groupe">

        {/* --- Chart 1: Killers (Loup camp) --- */}
        <div className="lycans-graphique-section">
          <h3>🐺 Top Tueurs par Boule de Cristal (Camp Loup)</h3>
          {killerHighlightedAdded && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary-text)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              🎯 &quot;{settings.highlightedPlayer}&quot; affiché en plus du top 20
            </p>
          )}

          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="min-loup-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Parties min. en Loup :
            </label>
            <select
              id="min-loup-games-select"
              value={minLoupGames}
              onChange={(e) => setMinLoupGames(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              {MIN_GAMES_OPTIONS.COMPACT.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {killersChartData.length === 0 ? (
            <p className="donnees-manquantes">Aucun kill boule de cristal enregistré pour les parties en version 0.284+.</p>
          ) : (
            <FullscreenChart title="Top Tueurs par Boule de Cristal (Camp Loup)">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={killersChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="player"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                          fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                          fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                      label={{
                        value: '% de parties Loup avec kill boule de cristal',
                        angle: 270,
                        position: 'left',
                        offset: 15,
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as ChartKillerStat;
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                            <div>Taux : <strong>{d.killRate.toFixed(1)}%</strong></div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.seerKills} kill{d.seerKills > 1 ? 's' : ''} boule de cristal sur {d.gamesAsLoup} partie{d.gamesAsLoup > 1 ? 's' : ''} en Loup</div>
                            {d.isHighlightedAddition && (
                              <div style={{ marginTop: '4px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                🎯 Affiché via sélection personnelle
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="killRate"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as ChartKillerStat;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHovered = hoveredKiller === entry.player;
                        const playerColor = playersColor[entry.player] || 'var(--chart-primary)';
                        return (
                          <Rectangle
                            x={x} y={y} width={width} height={height}
                            fill={playerColor}
                            stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHovered ? '#000000' : 'none'}
                            strokeWidth={isHighlightedFromSettings ? 3 : isHovered ? 2 : 0}
                            strokeDasharray={entry.isHighlightedAddition ? '5,5' : 'none'}
                            opacity={entry.isHighlightedAddition ? 0.8 : 1}
                            onClick={() => navigateToGameDetails({ selectedPlayer: entry.player, fromComponent: 'Boule de Cristal - Tueurs' })}
                            onMouseEnter={() => setHoveredKiller(entry.player)}
                            onMouseLeave={() => setHoveredKiller(null)}
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            % de parties jouées en Loup avec au moins un kill Boule de Cristal — version ≥ 0.284
          </p>
        </div>

        {/* --- Chart 2: Victims (Villageois camp) --- */}
        <div className="lycans-graphique-section">
          <h3>🔮 Top Morts par Boule de Cristal (Camp Villageois)</h3>
          {victimHighlightedAdded && settings.highlightedPlayer && (
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary-text)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              🎯 &quot;{settings.highlightedPlayer}&quot; affiché en plus du top 20
            </p>
          )}

          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="min-villageois-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Parties min. en Villageois :
            </label>
            <select
              id="min-villageois-games-select"
              value={minVillageoisGames}
              onChange={(e) => setMinVillageoisGames(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              {MIN_GAMES_OPTIONS.COMPACT.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {victimsChartData.length === 0 ? (
            <p className="donnees-manquantes">Aucune mort Boule de Cristal enregistrée pour les parties en version 0.284+.</p>
          ) : (
            <FullscreenChart title="Top Morts par Boule de Cristal (Camp Villageois)">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={victimsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="player"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                          fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                          fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                      label={{
                        value: '% de parties Villageois mort par boule de cristal',
                        angle: 270,
                        position: 'left',
                        offset: 15,
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as ChartVictimStat;
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '8px',
                            fontSize: '0.85rem'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                            <div>Taux : <strong>{d.deathRate.toFixed(1)}%</strong></div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.seerDeaths} mort{d.seerDeaths > 1 ? 's' : ''} boule de cristal sur {d.gamesAsVillageois} partie{d.gamesAsVillageois > 1 ? 's' : ''} en Villageois</div>
                            {d.isHighlightedAddition && (
                              <div style={{ marginTop: '4px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                🎯 Affiché via sélection personnelle
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="deathRate"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as ChartVictimStat;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHovered = hoveredVictim === entry.player;
                        const playerColor = playersColor[entry.player] || 'var(--chart-primary)';
                        return (
                          <Rectangle
                            x={x} y={y} width={width} height={height}
                            fill={playerColor}
                            stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHovered ? '#000000' : 'none'}
                            strokeWidth={isHighlightedFromSettings ? 3 : isHovered ? 2 : 0}
                            strokeDasharray={entry.isHighlightedAddition ? '5,5' : 'none'}
                            opacity={entry.isHighlightedAddition ? 0.8 : 1}
                            onClick={() => navigateToGameDetails({ selectedPlayer: entry.player, fromComponent: 'Boule de Cristal - Victimes' })}
                            onMouseEnter={() => setHoveredVictim(entry.player)}
                            onMouseLeave={() => setHoveredVictim(null)}
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            % de parties jouées en Villageois terminées par une mort boule de cristal — version ≥ 0.284
          </p>
        </div>

      </div>
    </div>
  );
}
