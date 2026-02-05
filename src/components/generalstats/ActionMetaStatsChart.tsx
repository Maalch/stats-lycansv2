import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useActionMetaStatsFromRaw } from '../../hooks/useActionMetaStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../types/api';

type ViewType = 'gadgets' | 'potions' | 'wolfTiming';
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
          } : null;
        }
        // Use pre-calculated aggregated stats for camp filters
        const campStats = p.aggregatedCampStats[campFilter];
        return campStats.uses >= minUsages ? {
          name: p.itemName,
          delta: campStats.delta,
          winRate: campStats.winRate,
          uses: campStats.uses,
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
      <div className="lycans-stat-carte">
        <h3>�🔧 Gadgets uniques</h3>
        <div className="lycans-valeur-principale">{actionMetaStats.gadgetStats.length}</div>
        <p>types différents</p>
      </div>
      <div className="lycans-stat-carte">
        <h3>🧪 Potions uniques</h3>
        <div className="lycans-valeur-principale">{actionMetaStats.potionStats.length}</div>
        <p>types différents</p>
      </div>
    </div>
  );

  const renderGadgetsView = () => {
    if (filteredGadgetStats.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucun gadget avec au moins {minUsages} utilisations.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Réduisez le filtre d'utilisations minimales pour voir plus de données.
          </p>
        </div>
      );
    }

    return (
      <FullscreenChart title="Impact des Gadgets sur le Taux de Victoire">
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
              <Bar dataKey="delta">
                {filteredGadgetStats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.delta > 0 ? 'var(--success-color, #82ca9d)' : 'var(--danger-color, #ff6b6b)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>💡 Les valeurs positives indiquent que l'utilisation du gadget est corrélée à un taux de victoire supérieur à la moyenne.</p>
          <p>Les valeurs négatives suggèrent une corrélation avec un taux de victoire inférieur.</p>
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
                        <div>Taux de victoire: {data.winRate.toFixed(1)}%</div>
                        <div>Impact: {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%</div>
                        <div>Utilisations: {data.uses}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="delta">
                {filteredPotionStats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.delta > 0 ? 'var(--success-color, #82ca9d)' : 'var(--danger-color, #ff6b6b)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>💡 Les valeurs positives indiquent que l'utilisation de la potion est corrélée à un taux de victoire supérieur à la moyenne.</p>
          <p>Les valeurs négatives suggèrent une corrélation avec un taux de victoire inférieur.</p>
        </div>
      </FullscreenChart>
    );
  };

  const renderWolfTimingView = () => {
    if (actionMetaStats.wolfTransformTiming.length === 0) {
      return (
        <div className="donnees-manquantes">
          <p>Aucune donnée de transformation de loup disponible.</p>
        </div>
      );
    }

    return (
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
              <Bar dataKey="winRate" fill={lycansColors['Loup'] || 'var(--wolf-color)'}>
                {actionMetaStats.wolfTransformTiming.map((_, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p>🐺 Analyse du moment de la première transformation en loup et son impact sur les chances de victoire.</p>
          <p>N1 = Nuit 1, N2 = Nuit 2, N3+ = Nuit 3 ou plus tard</p>
        </div>
      </FullscreenChart>
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
          🔧 Gadgets
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
          className={`lycans-submenu-btn ${selectedView === 'wolfTiming' ? 'active' : ''}`}
          onClick={() => setSelectedView('wolfTiming')}
        >
          🐺 Timing Loups
        </button>
      </div>

      {/* Camp Filter - Below view selector */}
      {(selectedView === 'gadgets' || selectedView === 'potions') && (
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
          {selectedView === 'wolfTiming' && renderWolfTimingView()}
        </div>
      </div>
    </div>
  );
}
