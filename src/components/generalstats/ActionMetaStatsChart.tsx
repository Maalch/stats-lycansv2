import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle, ReferenceLine } from 'recharts';
import { useActionMetaStatsFromRaw } from '../../hooks/useActionMetaStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';
import { getEffectCategory } from '../../hooks/utils/potionScrollStatsUtils';

type ViewType = 'gadgets' | 'potions' | 'parchemins' | 'accessories' | 'wolfTiming' | 'hunter';
type CampFilterAction = 'all' | 'villageois' | 'loups' | 'autres';

export function ActionMetaStatsChart() {
  const { actionMetaStats, isLoading, error } = useActionMetaStatsFromRaw();
  const [selectedView, setSelectedView] = useState<ViewType>('gadgets');
  const [campFilter, setCampFilter] = useState<CampFilterAction>('all');
  const lycansColors = useThemeAdjustedLycansColorScheme();

  const minUsages = 10; // Hardcoded minimum usages filter

  // Filter data based on minimum usages and camp filter
  const filteredGadgetStats = useMemo(() => {
    if (!actionMetaStats) return [];
    return actionMetaStats.gadgetStats
      .map(g => {
        if (campFilter === 'all') {
          return g.totalUses >= minUsages ? {
            name: g.itemName,
            delta: g.delta,
            winRate: g.winRate,
            uses: g.totalUses,
          } : null;
        }
        // Use pre-calculated aggregated stats for camp filters
        const campStats = g.aggregatedCampStats[campFilter];
        return campStats.uses >= minUsages ? {
          name: g.itemName,
          delta: campStats.delta,
          winRate: campStats.winRate,
          uses: campStats.uses,
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.uses - a.uses);
  }, [actionMetaStats, minUsages, campFilter]);

  const filteredPotionStats = useMemo(() => {
    if (!actionMetaStats) return [];
    return actionMetaStats.potionStats
      .map(p => {
        if (campFilter === 'all') {
          return p.totalUses >= minUsages ? {
            name: p.itemName,
            delta: p.delta,
            winRate: p.winRate,
            uses: p.totalUses,
            effectCategory: getEffectCategory(p.itemName),
          } : null;
        }
        // Use pre-calculated aggregated stats for camp filters
        const campStats = p.aggregatedCampStats[campFilter];
        return campStats.uses >= minUsages ? {
          name: p.itemName,
          delta: campStats.delta,
          winRate: campStats.winRate,
          uses: campStats.uses,
          effectCategory: getEffectCategory(p.itemName),
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.uses - a.uses);
  }, [actionMetaStats, minUsages, campFilter]);

  const filteredAccessoryStats = useMemo(() => {
    if (!actionMetaStats) return [];
    return actionMetaStats.accessoryStats
      .map(a => {
        if (campFilter === 'all') {
          return a.totalUses >= minUsages ? {
            name: a.itemName,
            delta: a.delta,
            winRate: a.winRate,
            uses: a.totalUses,
          } : null;
        }
        const campStats = a.aggregatedCampStats[campFilter];
        return campStats.uses >= minUsages ? {
          name: a.itemName,
          delta: campStats.delta,
          winRate: campStats.winRate,
          uses: campStats.uses,
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.uses - a.uses);
  }, [actionMetaStats, minUsages, campFilter]);

  const filteredParcheminStats = useMemo(() => {
    if (!actionMetaStats) return [];
    return actionMetaStats.parcheminStats
      .map(p => {
        if (campFilter === 'all') {
          return p.totalUses >= minUsages ? {
            name: p.effectName,
            delta: p.delta,
            winRate: p.winRate,
            uses: p.totalUses,
            effectCategory: p.effectCategory,
          } : null;
        }
        const campStats = p.aggregatedCampStats[campFilter];
        return campStats.uses >= minUsages ? {
          name: p.effectName,
          delta: campStats.delta,
          winRate: campStats.winRate,
          uses: campStats.uses,
          effectCategory: p.effectCategory,
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.uses - a.uses);
  }, [actionMetaStats, minUsages, campFilter]);

  if (isLoading) {
    return <div className="lycans-chargement">Chargement des statistiques d'actions...</div>;
  }

  if (error) {
    return <div className="lycans-erreur">Erreur: {error}</div>;
  }

  if (!actionMetaStats) {
    return <div className="donnees-manquantes">Aucune donnée disponible</div>;
  }

  const renderOverviewCards = () => (
    <div className="lycans-resume-conteneur">
      <div className="lycans-stat-carte">
        <h3>🎮 Parties analysées</h3>
        <div className="lycans-valeur-principale">{actionMetaStats.overallStats.totalGamesAnalyzed}</div>
        <p>parties moddées</p>
      </div>
      <div className="lycans-stat-carte">
        <h3>⚡ Actions totales</h3>
        <div className="lycans-valeur-principale">{actionMetaStats.overallStats.totalActionsRecorded}</div>
        <p>{actionMetaStats.overallStats.averageActionsPerGame.toFixed(1)} par partie</p>
      </div>
    </div>
  );

  const renderGadgetsView = () => {
    if (filteredGadgetStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucun objet avec au moins {minUsages} utilisations.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Réduisez le filtre d'utilisations minimales pour voir plus de données.
          </p>
        </div>
      );
    }

    return (
      <FullscreenChart title="Impact des Objets sur le Taux de Victoire">
        <div style={{ height: Math.max(400, filteredGadgetStats.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredGadgetStats}
              layout="vertical"
              margin={{ top: 20, right: 100, left: 150, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                type="number"
                label={{ value: 'Différence du taux de victoire (%)', position: 'bottom', style: { textAnchor: 'middle' } }}
                domain={[-20, 20]}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <YAxis 
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--text-secondary)" strokeWidth={2} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                      }}>
                        <div><strong>{data.name}</strong></div>
                        <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                        <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                        <div>Utilisations: {data.uses}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="delta"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as { delta: number };
                  const fillColor = entry.delta > 0
                    ? 'var(--success-color, #82ca9d)'
                    : 'var(--danger-color, #ff6b6b)';

                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>💡 Les valeurs positives (en vert) indiquent que l'utilisation de l'objet est corrélée à un taux de victoire supérieur à la moyenne.</p>
          <p>💡 Les valeurs négatives (en rouge) indiquent que l'utilisation de l'objet est corrélée à un taux de victoire inférieur à la moyenne.</p>
        </div>
      </FullscreenChart>
    );
  };

  const renderPotionsView = () => {
    if (filteredPotionStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucune potion avec au moins {minUsages} utilisations.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Réduisez le filtre d'utilisations minimales pour voir plus de données.
          </p>
        </div>
      );
    }

    return (
      <FullscreenChart title="Impact des Potions sur le Taux de Victoire">
        <div style={{ height: Math.max(400, filteredPotionStats.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredPotionStats}
              layout="vertical"
              margin={{ top: 20, right: 100, left: 150, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                type="number"
                label={{ value: 'Différence du taux de victoire (%)', position: 'bottom', style: { textAnchor: 'middle' } }}
                domain={[-20, 20]}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <YAxis 
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--text-secondary)" strokeWidth={2} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                      }}>
                        <div><strong>{data.name}</strong></div>
                        <div>Type d'effet: {getEffectCategoryLabel(data.effectCategory)}</div>
                        <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                        <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                        <div>Utilisations: {data.uses}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="delta"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as { effectCategory: string | null };
                  const fillColor = getEffectCategoryColor(entry.effectCategory);

                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                      fillOpacity={0.85}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>🧪 Les barres sont colorées selon le type d'effet de la potion :
            <span style={{ color: '#4caf50', fontWeight: 'bold' }}> vert = positif</span>,
            <span style={{ color: '#9e9e9e', fontWeight: 'bold' }}> gris = neutre</span>,
            <span style={{ color: '#f44336', fontWeight: 'bold' }}> rouge = négatif</span>.
          </p>
          <p>💡 La position de la barre (gauche/droite de 0) indique l'impact sur le taux de victoire, indépendamment du type d'effet.</p>
        </div>
      </FullscreenChart>
    );
  };

  const renderAccessoriesView = () => {
    if (filteredAccessoryStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucun accessoire avec au moins {minUsages} récupérations.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Réduisez le filtre d'utilisations minimales pour voir plus de données.
          </p>
        </div>
      );
    }

    return (
      <FullscreenChart title="Impact des Accessoires sur le Taux de Victoire">
        <div style={{ height: Math.max(400, filteredAccessoryStats.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredAccessoryStats}
              layout="vertical"
              margin={{ top: 20, right: 100, left: 150, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                type="number"
                label={{ value: 'Différence du taux de victoire (%)', position: 'bottom', style: { textAnchor: 'middle' } }}
                domain={[-20, 20]}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <YAxis 
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--text-secondary)" strokeWidth={2} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                      }}>
                        <div><strong>{data.name}</strong></div>
                        <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                        <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                        <div>Récupérations: {data.uses}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="delta"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as { delta: number };
                  const fillColor = entry.delta > 0
                    ? 'var(--success-color, #82ca9d)'
                    : 'var(--danger-color, #ff6b6b)';

                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>💡 Les valeurs positives indiquent que la récupération de l'accessoire est corrélée à un taux de victoire supérieur à la moyenne.</p>
          <p>Les valeurs négatives suggèrent une corrélation avec un taux de victoire inférieur.</p>
        </div>
      </FullscreenChart>
    );
  };

  const getEffectCategoryColor = (category: string | null): string => {
    switch (category) {
      case 'positive': return '#4caf50';
      case 'neutral': return '#9e9e9e';
      case 'negative': return '#f44336';
      default: return '#607d8b';
    }
  };

  const getEffectCategoryLabel = (category: string | null): string => {
    switch (category) {
      case 'positive': return '✅ Positif';
      case 'neutral': return '⚪ Neutre';
      case 'negative': return '❌ Négatif';
      default: return '❓ Inconnu';
    }
  };

  const renderParcheminsView = () => {
    if (filteredParcheminStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucun parchemin avec au moins {minUsages} utilisations.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Réduisez le filtre d'utilisations minimales pour voir plus de données.
          </p>
        </div>
      );
    }

    return (
      <FullscreenChart title="Impact des Parchemins sur le Taux de Victoire">
        <div style={{ height: Math.max(400, filteredParcheminStats.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredParcheminStats}
              layout="vertical"
              margin={{ top: 20, right: 100, left: 150, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                type="number"
                label={{ value: 'Différence du taux de victoire (%)', position: 'bottom', style: { textAnchor: 'middle' } }}
                domain={[-20, 20]}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <YAxis 
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--text-secondary)" strokeWidth={2} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                      }}>
                        <div><strong>{data.name}</strong></div>
                        <div>Type d'effet: {getEffectCategoryLabel(data.effectCategory)}</div>
                        <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                        <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                        <div>Utilisations: {data.uses}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="delta"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const entry = payload as { effectCategory: string | null };
                  const fillColor = getEffectCategoryColor(entry.effectCategory);

                  return (
                    <Rectangle
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                      fillOpacity={0.85}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>📜 Les barres sont colorées selon le type d'effet du parchemin :
            <span style={{ color: '#4caf50', fontWeight: 'bold' }}> vert = positif</span>,
            <span style={{ color: '#9e9e9e', fontWeight: 'bold' }}> gris = neutre</span>,
            <span style={{ color: '#f44336', fontWeight: 'bold' }}> rouge = négatif</span>.
          </p>
          <p>💡 La position de la barre (gauche/droite de 0) indique l'impact sur le taux de victoire, indépendamment du type d'effet.</p>
        </div>
      </FullscreenChart>
    );
  };

  const renderHunterView = () => {
    const stats = actionMetaStats.hunterShootStats;
    if (stats.totalShots === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucune donnée de tir du chasseur disponible.</p>
        </div>
      );
    }

    return (
      <div>
        {/* Summary Cards */}
        <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>
          <div className="lycans-stat-carte">
            <h3>🎯 Tirs totaux</h3>
            <div className="lycans-valeur-principale">{stats.totalShots}</div>
            <p>en {stats.totalHunterGames} parties</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>✅ Précision</h3>
            <div className="lycans-valeur-principale" style={{ color: 'var(--success-color, #82ca9d)' }}>
              {stats.accuracy.toFixed(1)}%
            </div>
            <p>{stats.successfulShots} touchés / {stats.missedShots} manqués</p>
          </div>
          <div className="lycans-stat-carte">
            <h3>🏆 Victoire chasseur</h3>
            <div className="lycans-valeur-principale">{stats.hunterWinRate.toFixed(1)}%</div>
            <p>{stats.hunterWins} victoires / {stats.totalHunterGames} parties</p>
          </div>
        </div>

        {/* Hit vs Miss Win Rate Chart */}
        <FullscreenChart title="Impact du Tir du Chasseur sur le Taux de Victoire">
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  ...(stats.hitsCount > 0 ? [{
                    name: 'Tir réussi',
                    winRate: stats.winRateWhenHit,
                    delta: stats.winRateWhenHit - stats.hunterWinRate,
                    count: stats.hitsCount,
                  }] : []),
                  ...(stats.missesCount > 0 ? [{
                    name: 'Tir manqué',
                    winRate: stats.winRateWhenMiss,
                    delta: stats.winRateWhenMiss - stats.hunterWinRate,
                    count: stats.missesCount,
                  }] : []),
                ]}
                margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" fontSize={14} />
                <YAxis
                  label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <ReferenceLine
                  y={stats.hunterWinRate}
                  stroke="var(--text-secondary)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: 'Baseline', position: 'right', fill: 'var(--text-secondary)', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                        }}>
                          <div><strong>{data.name}</strong></div>
                          <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                          <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                          <div>Occurrences: {data.count}</div>
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
                    const entry = payload as { delta: number };
                    const fillColor = entry.delta > 0
                      ? 'var(--success-color, #82ca9d)'
                      : 'var(--danger-color, #ff6b6b)';
                    return (
                      <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <p>🎯 Compare le taux de victoire du chasseur selon qu'il touche ou manque sa cible.</p>
            <p>💡 La ligne tiretée indique le taux de victoire moyen du chasseur.</p>
          </div>
        </FullscreenChart>

        {/* Target Camp Breakdown */}
        {stats.targetCampStats.length > 0 && (
          <FullscreenChart title="Taux de Victoire selon le Camp de la Cible">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.targetCampStats}
                  margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="camp" fontSize={14} />
                  <YAxis
                    label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <ReferenceLine
                    y={stats.hunterWinRate}
                    stroke="var(--text-secondary)"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'Baseline', position: 'right', fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                          }}>
                            <div><strong>Cible: {data.camp}</strong></div>
                            <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                            <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                            <div>Tirs: {data.count}</div>
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
                      const entry = payload as { camp: string };
                      const fillColor = lycansColors[entry.camp] || 'var(--chart-primary)';
                      return (
                        <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p>🎯 Taux de victoire du chasseur en fonction du camp de la cible touchée.</p>
              <p>💡 Tirer sur un loup devrait logiquement améliorer les chances de victoire du camp Villageois.</p>
            </div>
          </FullscreenChart>
        )}

      </div>
    );
  };

  const renderWolfTimingView = () => {
    if (actionMetaStats.wolfTransformTiming.length === 0 && actionMetaStats.wolfUntransformStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucune donnée de transformation de loup disponible.</p>
        </div>
      );
    }

    return (
      <div>
        {actionMetaStats.wolfTransformTiming.length > 0 && (
          <FullscreenChart title="Impact du Timing de Première Transformation (Loups)">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actionMetaStats.wolfTransformTiming}
                  margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="timing"
                    label={{ value: 'Timing de première transformation', position: 'bottom', offset: 0 }}
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                          }}>
                            <div><strong>Transformation en {data.timing}</strong></div>
                            <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                            <div>Parties: {data.gamesCount}</div>
                            <div>Victoires: {data.wins} / Défaites: {data.losses}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="winRate" fill={lycansColors['Loup'] || 'var(--wolf-color)'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p>🐺 Analyse du moment de la première transformation en loup et son impact sur les chances de victoire.</p>
              <p>N1 = Nuit 1, N2 = Nuit 2, N3+ = Nuit 3 ou plus tard</p>
            </div>
          </FullscreenChart>
        )}

        {actionMetaStats.wolfUntransformStats.length > 0 && (
          <FullscreenChart title="Impact du Nombre de Détransformations sur le Taux de Victoire (Loups)">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actionMetaStats.wolfUntransformStats}
                  margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="untransformCount"
                    label={{ value: 'Nombre de détransformations', position: 'bottom', offset: 0 }}
                  />
                  <YAxis
                    label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <ReferenceLine
                    y={actionMetaStats.wolfUntransformStats[0]?.baselineWinRate}
                    stroke="var(--text-secondary)"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'Baseline', position: 'right', fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                          }}>
                            <div><strong>{data.untransformCount} détransformation{data.untransformCount !== '1' ? 's' : ''}</strong></div>
                            <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                            <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                            <div>Parties: {data.wolfCount}</div>
                            <div>Victoires: {data.wins} / Défaites: {data.losses}</div>
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
                      const entry = payload as { delta: number };
                      const fillColor = entry.delta > 0
                        ? 'var(--success-color, #82ca9d)'
                        : 'var(--danger-color, #ff6b6b)';
                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fillColor}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p>🔄 Analyse du nombre de fois qu'un loup se détransforme en humain au cours d'une partie et son impact sur le taux de victoire.</p>
              <p>💡 La ligne tiretée indique le taux de victoire moyen des loups (baseline).</p>
            </div>
          </FullscreenChart>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* View Selector - Right below cards */}
      <div className="lycans-submenu">
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'gadgets' ? 'active' : ''}`}
          onClick={() => setSelectedView('gadgets')}
        >
          🔧 Objets
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'potions' ? 'active' : ''}`}
          onClick={() => setSelectedView('potions')}
        >
          🧪 Potions
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'parchemins' ? 'active' : ''}`}
          onClick={() => setSelectedView('parchemins')}
        >
          📜 Parchemins
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'accessories' ? 'active' : ''}`}
          onClick={() => setSelectedView('accessories')}
        >
          💍 Accessoires
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'hunter' ? 'active' : ''}`}
          onClick={() => setSelectedView('hunter')}
        >
          🏹 Chasseur
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${selectedView === 'wolfTiming' ? 'active' : ''}`}
          onClick={() => setSelectedView('wolfTiming')}
        >
          🐺 Loups
        </button>
      </div>

      {/* Camp Filter - Below view selector */}
      {(selectedView === 'gadgets' || selectedView === 'potions' || selectedView === 'parchemins' || selectedView === 'accessories') && (
        <div className="lycans-controles-groupe" style={{ marginBottom: '1rem' }}>
          <div className="lycans-filtre-groupe" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="camp-filter-action" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Camp:
            </label>
            <select
              id="camp-filter-action"
              value={campFilter}
              onChange={(e) => setCampFilter(e.target.value as CampFilterAction)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              <option value="all">Tous les camps</option>
              <option value="villageois">Camp Villageois</option>
              <option value="loups">Camp Loups</option>
              <option value="autres">Autres (Solo)</option>
            </select>
          </div>
        </div>
      )}

      {/* Render selected view */}
      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          {selectedView === 'gadgets' && renderGadgetsView()}
          {selectedView === 'potions' && renderPotionsView()}
          {selectedView === 'parchemins' && renderParcheminsView()}
          {selectedView === 'accessories' && renderAccessoriesView()}
          {selectedView === 'hunter' && renderHunterView()}
          {selectedView === 'wolfTiming' && renderWolfTimingView()}
        </div>
      </div>
    </div>
  );
}
