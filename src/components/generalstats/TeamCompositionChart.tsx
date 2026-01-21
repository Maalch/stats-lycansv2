import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTeamCompositionStatsFromRaw } from '../../hooks/useTeamCompositionStatsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';
import type { TeamConfiguration } from '../../types/teamComposition';

// Chart colors using theme variables and common patterns
const COLORS = {
  wolf: '#dc2626',
  villageois: '#16a34a',
  solo: '#f59e0b',
  bar: 'var(--chart-color-1)',
  barInactive: 'var(--text-secondary)',
};

/**
 * Format wolf breakdown for display
 * Returns a string like "2L+1T" or "3L" for pure wolves
 */
function formatWolfBreakdown(config: TeamConfiguration): string {
  const parts: string[] = [];
  
  if (config.pureWolfCount > 0) {
    parts.push(`${config.pureWolfCount}L`);
  }
  if (config.traitreCount > 0) {
    parts.push(`${config.traitreCount}T`);
  }
  if (config.louveteuCount > 0) {
    parts.push(`${config.louveteuCount}Lou`);
  }
  
  return parts.length > 0 ? parts.join('+') : '0L';
}

/**
 * Format full configuration details for display
 */
function formatConfigDetails(config: TeamConfiguration): string {
  const parts: string[] = [];
  
  if (config.pureWolfCount > 0) {
    parts.push(`${config.pureWolfCount} Loup${config.pureWolfCount > 1 ? 's' : ''}`);
  }
  if (config.traitreCount > 0) {
    parts.push(`${config.traitreCount} Traître${config.traitreCount > 1 ? 's' : ''}`);
  }
  if (config.louveteuCount > 0) {
    parts.push(`${config.louveteuCount} Louveteau${config.louveteuCount > 1 ? 'x' : ''}`);
  }
  if (config.soloCount > 0) {
    parts.push(`${config.soloCount} Solo`);
  }
  if (config.villageoisCount > 0) {
    parts.push(`${config.villageoisCount} Villageois`);
  }
  
  return parts.join(', ') || 'N/A';
}

export function TeamCompositionChart() {
  const { teamCompositionStats, isLoading, error } =
    useTeamCompositionStatsFromRaw();
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number | null>(
    null
  );
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  if (isLoading) return <div className="donnees-attente">Chargement des compositions d'équipe...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!teamCompositionStats || teamCompositionStats.compositionsByPlayerCount.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée de composition disponible</div>;
  }

  // Prepare data for overview chart (most common configs per player count)
  const overviewData = teamCompositionStats.compositionsByPlayerCount.map(
    (playerCountData) => {
      const mostCommon = playerCountData.mostCommon;
      return {
        playerCount: playerCountData.playerCount,
        totalGames: playerCountData.totalGames,
        mostCommonConfig: mostCommon
          ? `${formatWolfBreakdown(mostCommon)}/${mostCommon.soloCount}S`
          : 'N/A',
        mostCommonWolfBreakdown: mostCommon ? formatWolfBreakdown(mostCommon) : 'N/A',
        mostCommonAppearances: mostCommon ? mostCommon.appearances : 0,
        mostCommonWolfWinRate: mostCommon ? mostCommon.wolfWinRate : 0,
        mostCommonVillageoisWinRate: mostCommon
          ? mostCommon.villageoisWinRate
          : 0,
        mostCommonSoloWinRate: mostCommon ? mostCommon.soloWinRate : 0,
        hasEnoughData: mostCommon && mostCommon.appearances >= 5,
        mostCommonFullConfig: mostCommon,
      };
    }
  );

  // Prepare data for detailed view
  const detailedData =
    selectedPlayerCount !== null
      ? teamCompositionStats.compositionsByPlayerCount.find(
          (p) => p.playerCount === selectedPlayerCount
        )
      : null;

  const filteredConfigs = detailedData
    ? detailedData.configurations.filter((c) => c.appearances >= 5)
    : [];

  return (
    <div className="lycans-camps-container">
      <h2>Statistiques des Compositions d'Équipe</h2>

      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Total Parties</h3>
          <div className="lycans-valeur-principale">{teamCompositionStats.totalGamesAnalyzed}</div>
          <p>parties analysées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Configurations Fréquentes</h3>
          <div className="lycans-valeur-principale">{teamCompositionStats.configurationsWithMinAppearances}</div>
          <p>≥5 parties</p>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="lycans-submenu">
        <button
          type="button"
          className={`lycans-submenu-btn ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('overview');
            setSelectedPlayerCount(null);
          }}
        >
          📊 Vue d'ensemble
        </button>
        <button
          type="button"
          className={`lycans-submenu-btn ${viewMode === 'detailed' ? 'active' : ''}`}
          onClick={() => setViewMode('detailed')}
        >
          🔍 Vue détaillée
        </button>
      </div>

      <div className="lycans-graphiques-groupe">
        {viewMode === 'overview' ? (
          <div className="lycans-graphique-section">
            <FullscreenChart title="Compositions les Plus Fréquentes par Nombre de Joueurs">
              <p className="lycans-stats-info">
                Configuration la plus jouée pour chaque nombre de joueurs (minimum 5 parties).
                Cliquez sur une barre pour voir les détails.
              </p>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="playerCount"
                      tick={{ fill: 'var(--text-secondary)' }}
                      label={{
                        value: 'Nombre de joueurs',
                        position: 'insideBottom',
                        offset: -5,
                        fill: 'var(--text-secondary)',
                      }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-secondary)' }}
                      label={{
                        value: 'Nombre de parties',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--text-secondary)',
                      }}
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
                              border: '1px solid var(--border-color)'
                            }}>
                              <p style={{ fontWeight: 'bold', marginBottom: 8 }}>
                                {data.playerCount} joueurs
                              </p>
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Total: {data.totalGames} parties
                              </p>
                              {data.hasEnoughData ? (
                                <>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 8 }}>
                                    Config la + fréquente: {data.mostCommonConfig}
                                  </p>
                                  {data.mostCommonFullConfig && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                      ({formatConfigDetails(data.mostCommonFullConfig)})
                                    </p>
                                  )}
                                  <p style={{ fontSize: '0.875rem' }}>
                                    Parties: {data.mostCommonAppearances}
                                  </p>
                                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <p style={{ color: COLORS.wolf, fontSize: '0.875rem' }}>
                                      🐺 Loups: {data.mostCommonWolfWinRate.toFixed(1)}%
                                    </p>
                                    <p style={{ color: COLORS.villageois, fontSize: '0.875rem' }}>
                                      🏘️ Villageois: {data.mostCommonVillageoisWinRate.toFixed(1)}%
                                    </p>
                                    <p style={{ color: COLORS.solo, fontSize: '0.875rem' }}>
                                      🎭 Solo: {data.mostCommonSoloWinRate.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.8rem', 
                                    color: 'var(--accent-primary)', 
                                    marginTop: '0.75rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                  }}>
                                    🖱️ Cliquez pour les détails
                                  </div>
                                </>
                              ) : (
                                <p style={{ fontSize: '0.875rem', fontStyle: 'italic', marginTop: 8, color: 'var(--text-secondary)' }}>
                                  Pas assez de données (minimum 5 parties requises)
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="mostCommonAppearances" name="Parties" radius={[4, 4, 0, 0]}>
                      {overviewData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          cursor={entry.hasEnoughData ? 'pointer' : 'default'}
                          fill={entry.hasEnoughData ? COLORS.bar : COLORS.barInactive}
                          opacity={entry.hasEnoughData ? 1 : 0.3}
                          onClick={() => {
                            if (entry.hasEnoughData) {
                              setSelectedPlayerCount(entry.playerCount);
                              setViewMode('detailed');
                            }
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>

            {/* Summary table */}
            <div className="lycans-stats-table" style={{ marginTop: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Joueurs</th>
                    <th style={{ textAlign: 'center' }}>Total Parties</th>
                    <th style={{ textAlign: 'center' }}>Configuration Fréquente</th>
                    <th style={{ textAlign: 'center' }}>Parties</th>
                    <th style={{ textAlign: 'center' }}>🐺 Loups</th>
                    <th style={{ textAlign: 'center' }}>🏘️ Villageois</th>
                    <th style={{ textAlign: 'center' }}>🎭 Solo</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.map((row) => (
                    <tr
                      key={row.playerCount}
                      className="lycans-clickable"
                      onClick={() => {
                        setSelectedPlayerCount(row.playerCount);
                        setViewMode('detailed');
                      }}
                    >
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.playerCount}</td>
                      <td style={{ textAlign: 'center' }}>{row.totalGames}</td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        {row.hasEnoughData && row.mostCommonFullConfig 
                          ? formatConfigDetails(row.mostCommonFullConfig) 
                          : <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Données insuffisantes</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.hasEnoughData ? row.mostCommonAppearances : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500, color: row.hasEnoughData ? COLORS.wolf : 'var(--text-secondary)' }}>
                        {row.hasEnoughData ? `${row.mostCommonWolfWinRate.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500, color: row.hasEnoughData ? COLORS.villageois : 'var(--text-secondary)' }}>
                        {row.hasEnoughData ? `${row.mostCommonVillageoisWinRate.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500, color: row.hasEnoughData ? COLORS.solo : 'var(--text-secondary)' }}>
                        {row.hasEnoughData ? `${row.mostCommonSoloWinRate.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="lycans-graphique-section">
            {/* Player count selector */}
            <div className="lycans-stat-carte" style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: 500,
                fontSize: '0.9rem'
              }}>
                Sélectionner le nombre de joueurs:
              </label>
              <select
                value={selectedPlayerCount || ''}
                onChange={(e) =>
                  setSelectedPlayerCount(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.9rem',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Choisir --</option>
                {teamCompositionStats.compositionsByPlayerCount.map((p) => (
                  <option key={p.playerCount} value={p.playerCount}>
                    {p.playerCount} joueurs ({p.totalGames} parties)
                  </option>
                ))}
              </select>
            </div>

            {selectedPlayerCount !== null && detailedData && (
              <FullscreenChart
                title={`Configurations pour ${selectedPlayerCount} joueurs (${detailedData.totalGames} parties)`}
              >
                <p className="lycans-stats-info">
                  Toutes les configurations jouées au moins 5 fois. 
                  Format: L=Loup pur, T=Traître, Lou=Louveteau / S=Rôles Solo / V=Villageois
                </p>

                {filteredConfigs.length === 0 ? (
                  <div className="donnees-manquantes">
                    Aucune configuration jouée au moins 5 fois pour {selectedPlayerCount} joueurs
                  </div>
                ) : (
                  <>
                    {/* Win Rate Comparison Chart */}
                    <div style={{ height: 400 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredConfigs.map((c) => ({
                            name: `${formatWolfBreakdown(c)}/${c.soloCount}S`,
                            config: c,
                            Loups: c.wolfWinRate,
                            Villageois: c.villageoisWinRate,
                            Solo: c.soloWinRate,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: 'var(--text-secondary)' }}
                          />
                          <YAxis
                            tick={{ fill: 'var(--text-secondary)' }}
                            label={{
                              value: 'Taux de victoire (%)',
                              angle: -90,
                              position: 'insideLeft',
                              fill: 'var(--text-secondary)',
                            }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length > 0) {
                                const config = payload[0].payload.config as TeamConfiguration;
                                return (
                                  <div style={{ 
                                    background: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    padding: 12, 
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)'
                                  }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                      {formatWolfBreakdown(config)} / {config.soloCount}S / {config.villageoisCount}V
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>
                                      {formatConfigDetails(config)}
                                    </p>
                                    <p style={{ fontSize: '0.875rem' }}>
                                      Parties jouées: {config.appearances}
                                    </p>
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <p style={{ fontSize: '0.875rem', color: COLORS.wolf }}>
                                        🐺 Loups: {config.winsByWolves} victoires ({config.wolfWinRate.toFixed(1)}%)
                                      </p>
                                      <p style={{ fontSize: '0.875rem', color: COLORS.villageois }}>
                                        🏘️ Villageois: {config.winsByVillageois} victoires ({config.villageoisWinRate.toFixed(1)}%)
                                      </p>
                                      <p style={{ fontSize: '0.875rem', color: COLORS.solo }}>
                                        🎭 Solo: {config.winsBySolo} victoires ({config.soloWinRate.toFixed(1)}%)
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ color: 'var(--text-primary)' }}
                          />
                          <Bar dataKey="Loups" fill={COLORS.wolf} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Villageois" fill={COLORS.villageois} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Solo" fill={COLORS.solo} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed table */}
                    <div className="lycans-stats-table" style={{ marginTop: '1.5rem' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>Configuration</th>
                            <th style={{ textAlign: 'center' }}>Parties</th>
                            <th style={{ textAlign: 'center' }}>🐺 V. Loups</th>
                            <th style={{ textAlign: 'center' }}>🏘️ V. Villageois</th>
                            <th style={{ textAlign: 'center' }}>🎭 V. Solo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredConfigs.map((config) => (
                            <tr key={config.configKey}>
                              <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                {formatConfigDetails(config)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {config.appearances}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ color: COLORS.wolf, fontWeight: 700, fontSize: '1rem' }}>
                                  {config.wolfWinRate.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.25rem', display: 'block' }}>
                                  ({config.winsByWolves} victoires)
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ color: COLORS.villageois, fontWeight: 700, fontSize: '1rem' }}>
                                  {config.villageoisWinRate.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.25rem', display: 'block' }}>
                                  ({config.winsByVillageois} victoires)
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ color: COLORS.solo, fontWeight: 700, fontSize: '1rem' }}>
                                  {config.soloWinRate.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.25rem', display: 'block' }}>
                                  ({config.winsBySolo} victoires)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </FullscreenChart>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
