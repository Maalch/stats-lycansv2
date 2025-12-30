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

export function TeamCompositionChart() {
  const { teamCompositionStats, isLoading, error } =
    useTeamCompositionStatsFromRaw();
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number | null>(
    null
  );
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  if (isLoading) return <div>Chargement des compositions d'équipe...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!teamCompositionStats || teamCompositionStats.compositionsByPlayerCount.length === 0) {
    return <div>Aucune donnée de composition disponible</div>;
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

  // Chart colors
  const COLORS = {
    wolf: '#dc2626',
    villageois: '#16a34a',
    solo: '#f59e0b',
  };

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
      <div className="lycans-categories-selection">
        <button
          type="button"
          className={`lycans-categorie-btn ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('overview');
            setSelectedPlayerCount(null);
          }}
        >
          Vue d'ensemble
        </button>
        <button
          type="button"
          className={`lycans-categorie-btn ${viewMode === 'detailed' ? 'active' : ''}`}
          onClick={() => setViewMode('detailed')}
        >
          Vue détaillée
        </button>
      </div>

      <div className="lycans-graphiques-groupe">
      {viewMode === 'overview' ? (
        <FullscreenChart title="Compositions les Plus Fréquentes par Nombre de Joueurs">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuration la plus jouée pour chaque nombre de joueurs (minimum
              5 parties).
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="playerCount"
                  label={{
                    value: 'Nombre de joueurs',
                    position: 'insideBottom',
                    offset: -5,
                  }}
                />
                <YAxis
                  label={{
                    value: 'Nombre de parties',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <p style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {data.playerCount} joueurs
                          </p>
                          <p style={{ fontSize: '0.875rem' }}>
                            Total: {data.totalGames} parties
                          </p>
                          {data.hasEnoughData ? (
                            <>
                              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 8 }}>
                                Config la + fréquente: {data.mostCommonConfig}
                              </p>
                              {data.mostCommonFullConfig && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  ({data.mostCommonFullConfig.pureWolfCount} Loup
                                  {data.mostCommonFullConfig.traitreCount > 0 ? `, ${data.mostCommonFullConfig.traitreCount} Traître` : ''}
                                  {data.mostCommonFullConfig.louveteuCount > 0 ? `, ${data.mostCommonFullConfig.louveteuCount} Louveteau` : ''})
                                </p>
                              )}
                              <p style={{ fontSize: '0.875rem' }}>
                                Parties: {data.mostCommonAppearances}
                              </p>
                              <div style={{ marginTop: 8, fontSize: '0.875rem' }}>
                                <p style={{ color: COLORS.wolf }}>
                                  Victoires Loups: {data.mostCommonWolfWinRate.toFixed(1)}%
                                </p>
                                <p style={{ color: COLORS.villageois }}>
                                  Victoires Villageois:{' '}
                                  {data.mostCommonVillageoisWinRate.toFixed(1)}%
                                </p>
                                <p style={{ color: COLORS.solo }}>
                                  Victoires Solo: {data.mostCommonSoloWinRate.toFixed(1)}%
                                </p>
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
                <Bar dataKey="mostCommonAppearances" fill="#3b82f6" name="Parties">
                  {overviewData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      cursor="pointer"
                      fill={entry.hasEnoughData ? '#3b82f6' : '#d1d5db'}
                      opacity={entry.hasEnoughData ? 1 : 0.3}
                      onClick={() => {
                        setSelectedPlayerCount(entry.playerCount);
                        setViewMode('detailed');
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-center">Joueurs</th>
                    <th className="px-6 py-3 text-center">Total Parties</th>
                    <th className="px-6 py-3 text-center">Détails</th>
                    <th className="px-6 py-3 text-center">Parties</th>
                    <th className="px-6 py-3 text-center">% Loups</th>
                    <th className="px-6 py-3 text-center">% Villageois</th>
                    <th className="px-6 py-3 text-center">% Solo</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.map((row, index) => (
                    <tr
                      key={row.playerCount}
                      className={`${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-800'
                          : 'bg-gray-50 dark:bg-gray-900'
                      } hover:bg-blue-50 dark:hover:bg-blue-900 cursor-pointer`}
                      onClick={() => {
                        setSelectedPlayerCount(row.playerCount);
                        setViewMode('detailed');
                      }}
                    >
                      <td className="px-6 py-3 font-medium text-center">{row.playerCount}</td>
                      <td className="px-6 py-3 text-center">{row.totalGames}</td>
                      <td className="px-6 py-3 text-center">
                        {row.hasEnoughData && row.mostCommonFullConfig ? (
                          <>
                            {row.mostCommonFullConfig.pureWolfCount > 0 && `${row.mostCommonFullConfig.pureWolfCount} Loup${row.mostCommonFullConfig.pureWolfCount > 1 ? 's' : ''}`}
                            {row.mostCommonFullConfig.traitreCount > 0 && (
                              <>{row.mostCommonFullConfig.pureWolfCount > 0 ? ', ' : ''}{row.mostCommonFullConfig.traitreCount} Traître{row.mostCommonFullConfig.traitreCount > 1 ? 's' : ''}</>
                            )}
                            {row.mostCommonFullConfig.louveteuCount > 0 && (
                              <>{(row.mostCommonFullConfig.pureWolfCount > 0 || row.mostCommonFullConfig.traitreCount > 0) ? ', ' : ''}{row.mostCommonFullConfig.louveteuCount} Louveteau{row.mostCommonFullConfig.louveteuCount > 1 ? 'x' : ''}</>
                            )}
                            {row.mostCommonFullConfig.soloCount > 0 && (
                              <>{(row.mostCommonFullConfig.pureWolfCount > 0 || row.mostCommonFullConfig.traitreCount > 0 || row.mostCommonFullConfig.louveteuCount > 0) ? ', ' : ''}{row.mostCommonFullConfig.soloCount} Solo</>
                            )}
                            {row.mostCommonFullConfig.villageoisCount > 0 && (
                              <>, {row.mostCommonFullConfig.villageoisCount} Villageois</>
                            )}
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {row.hasEnoughData ? row.mostCommonAppearances : '-'}
                      </td>
                      <td
                        className="px-6 py-3 text-center font-medium"
                        style={{ color: row.hasEnoughData ? COLORS.wolf : 'var(--text-secondary)' }}
                      >
                        {row.hasEnoughData ? `${row.mostCommonWolfWinRate.toFixed(1)}%` : '-'}
                      </td>
                      <td
                        className="px-6 py-3 text-center font-medium"
                        style={{ color: row.hasEnoughData ? COLORS.villageois : 'var(--text-secondary)' }}
                      >
                        {row.hasEnoughData ? `${row.mostCommonVillageoisWinRate.toFixed(1)}%` : '-'}
                      </td>
                      <td
                        className="px-6 py-3 text-center font-medium"
                        style={{ color: row.hasEnoughData ? COLORS.solo : 'var(--text-secondary)' }}
                      >
                        {row.hasEnoughData ? `${row.mostCommonSoloWinRate.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FullscreenChart>
      ) : (
        <div className="space-y-4">
          {/* Player count selector */}
          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
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
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toutes les configurations jouées au moins 5 fois. Format: Loups (L=Loup pur, T=Traître, Lou=Louveteau) / S=Rôles Solo / V=Villageois
                </p>

                {filteredConfigs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune configuration jouée au moins 5 fois pour {selectedPlayerCount} joueurs
                  </div>
                ) : (
                  <>
                    {/* Win Rate Comparison Chart */}
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={filteredConfigs.map((c) => ({
                          name: `${formatWolfBreakdown(c)}/${c.soloCount}S`,
                          config: c,
                          Loups: c.wolfWinRate,
                          Villageois: c.villageoisWinRate,
                          Solo: c.soloWinRate,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                          label={{
                            value: 'Taux de victoire (%)',
                            angle: -90,
                            position: 'insideLeft',
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const config = payload[0].payload
                                .config as TeamConfiguration;
                              return (
                                <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                    {formatWolfBreakdown(config)} / {config.soloCount}S /{' '}
                                    {config.villageoisCount}V
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    ({config.pureWolfCount} Loup
                                    {config.traitreCount > 0 ? `, ${config.traitreCount} Traître` : ''}
                                    {config.louveteuCount > 0 ? `, ${config.louveteuCount} Louveteau` : ''})
                                  </p>
                                  <p style={{ fontSize: '0.875rem' }}>
                                    Parties jouées: {config.appearances}
                                  </p>
                                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <p
                                      style={{ fontSize: '0.875rem', color: COLORS.wolf }}
                                    >
                                      Loups: {config.winsByWolves} victoires (
                                      {config.wolfWinRate.toFixed(1)}%)
                                    </p>
                                    <p
                                      style={{ fontSize: '0.875rem', color: COLORS.villageois }}
                                    >
                                      Villageois: {config.winsByVillageois}{' '}
                                      victoires ({config.villageoisWinRate.toFixed(1)}%)
                                    </p>
                                    <p
                                      style={{ fontSize: '0.875rem', color: COLORS.solo }}
                                    >
                                      Solo: {config.winsBySolo} victoires (
                                      {config.soloWinRate.toFixed(1)}%)
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Loups" fill={COLORS.wolf} />
                        <Bar dataKey="Villageois" fill={COLORS.villageois} />
                        <Bar dataKey="Solo" fill={COLORS.solo} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Detailed table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-center">Détails</th>
                            <th className="px-6 py-3 text-center">Parties</th>
                            <th className="px-6 py-3 text-center">V. Loups</th>
                            <th className="px-6 py-3 text-center">V. Villageois</th>
                            <th className="px-6 py-3 text-center">V. Solo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredConfigs.map((config, index) => (
                            <tr
                              key={config.configKey}
                              className={
                                index % 2 === 0
                                  ? 'bg-white dark:bg-gray-800'
                                  : 'bg-gray-50 dark:bg-gray-900'
                              }
                            >
                              <td className="px-6 py-3 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                                {config.pureWolfCount > 0 && `${config.pureWolfCount} Loup${config.pureWolfCount > 1 ? 's' : ''}`}
                                {config.traitreCount > 0 && (
                                  <>{config.pureWolfCount > 0 ? ', ' : ''}{config.traitreCount} Traître{config.traitreCount > 1 ? 's' : ''}</>
                                )}
                                {config.louveteuCount > 0 && (
                                  <>{(config.pureWolfCount > 0 || config.traitreCount > 0) ? ', ' : ''}{config.louveteuCount} Louveteau{config.louveteuCount > 1 ? 'x' : ''}</>
                                )}
                                {config.soloCount > 0 && (
                                  <>{(config.pureWolfCount > 0 || config.traitreCount > 0 || config.louveteuCount > 0) ? ', ' : ''}{config.soloCount} Solo</>
                                )}
                                {config.villageoisCount > 0 && (
                                  <>, {config.villageoisCount} Villageois</>
                                )}
                              </td>
                              <td className="px-6 py-3 text-center font-medium">
                                {config.appearances}
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span style={{ color: COLORS.wolf, fontWeight: 500 }}>
                                  {config.winsByWolves}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                  ({config.wolfWinRate.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span style={{ color: COLORS.villageois, fontWeight: 500 }}>
                                  {config.winsByVillageois}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                  ({config.villageoisWinRate.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span style={{ color: COLORS.solo, fontWeight: 500 }}>
                                  {config.winsBySolo}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                  ({config.soloWinRate.toFixed(1)}%)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </FullscreenChart>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
