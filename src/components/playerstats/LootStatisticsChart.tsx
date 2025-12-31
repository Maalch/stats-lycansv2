import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLootStats } from '../../hooks/useLootStats';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import type { PlayerLootStats, CampFilter } from '../../hooks/utils/lootStatsUtils';

// Extended type for chart data with highlighting info
type ChartLootStat = PlayerLootStats & {
  isHighlightedAddition?: boolean;
};

const minGamesOptions = [3, 5, 10, 15, 25, 50];

export function LootStatisticsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();

  // Use navigationState to restore state from achievement navigation, with fallbacks to defaults
  const [minGames, setMinGames] = useState<number>(
    navigationState.lootStatsState?.minGames || 5
  );
  const [campFilter, setCampFilter] = useState<CampFilter>(
    (navigationState.lootStatsState?.campFilter as CampFilter) || 'all'
  );
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  const { data: lootData, isLoading: dataLoading, error: fetchError } = useLootStats(campFilter);
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Save state to navigation context when it changes
  useEffect(() => {
    const currentNavState = navigationState.lootStatsState;
    if (!currentNavState || 
        currentNavState.minGames !== minGames ||
        currentNavState.campFilter !== campFilter) {
      updateNavigationState({
        lootStatsState: {
          minGames,
          campFilter
        }
      });
    }
  }, [minGames, campFilter, updateNavigationState]);

  // Data processing with highlighting support - for total loot
  const { totalLootChartData, highlightedPlayerAddedTotal } = useMemo(() => {
    if (!lootData?.playerStats) {
      return {
        totalLootChartData: [],
        highlightedPlayerAddedTotal: false
      };
    }

    const stats = lootData.playerStats;

    // Sort by total loot and take top 20 (no minimum games filter for total loot)
    const sortedPlayers = stats
      .sort((a, b) => b.totalLoot - a.totalLoot)
      .slice(0, 20);

    // Check if highlighted player is in top 20
    const highlightedInTop20 = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    // Add highlighted player if not in top 20 or doesn't meet min games
    let finalChartData: ChartLootStat[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop20) {
      const highlightedPlayerData = stats.find(p => p.player === settings.highlightedPlayer);

      if (highlightedPlayerData) {
        finalChartData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        playerAdded = true;
      }
    }

    return {
      totalLootChartData: finalChartData,
      highlightedPlayerAddedTotal: playerAdded
    };
  }, [lootData, settings.highlightedPlayer]);

  // Data processing with highlighting support - for normalized loot per 60 minutes
  const { normalizedLootChartData, highlightedPlayerAddedNormalized } = useMemo(() => {
    if (!lootData?.playerStats) {
      return {
        normalizedLootChartData: [],
        highlightedPlayerAddedNormalized: false
      };
    }

    const stats = lootData.playerStats;

    // Filter players by minimum games threshold
    const eligiblePlayers = stats.filter(player => player.gamesPlayed >= minGames);

    // Sort by loot per 60 minutes and take top 20
    const sortedPlayers = eligiblePlayers
      .sort((a, b) => b.lootPer60Min - a.lootPer60Min)
      .slice(0, 20);

    // Check if highlighted player is in top 20
    const highlightedInTop20 = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    // Add highlighted player if not in top 20 or doesn't meet min games
    let finalChartData: ChartLootStat[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop20) {
      const highlightedPlayerData = stats.find(p => p.player === settings.highlightedPlayer);

      if (highlightedPlayerData) {
        finalChartData.push({
          ...highlightedPlayerData,
          isHighlightedAddition: true
        });
        playerAdded = true;
      }
    }

    return {
      normalizedLootChartData: finalChartData,
      highlightedPlayerAddedNormalized: playerAdded
    };
  }, [lootData, minGames, settings.highlightedPlayer]);

  if (dataLoading) {
    return <div className="donnees-attente">Récupération des statistiques de loot...</div>;
  }
  if (fetchError) {
    return <div className="donnees-probleme">Erreur: {fetchError}</div>;
  }
  if (!lootData) {
    return <div className="donnees-manquantes">Aucune donnée de loot disponible</div>;
  }

  const eligiblePlayersCount = lootData.playerStats.filter(
    p => p.gamesPlayed >= minGames
  ).length;

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Récolte de Loot</h2>
      <p className="lycans-stats-info">
        {lootData.gamesWithLootData} parties avec données de loot collecté. 
      </p>

      <div className="lycans-graphiques-groupe">
        {/* Total Loot Chart */}
        <div className="lycans-graphique-section">
          <div>
            <h3>Total Loot Collecté</h3>
            {highlightedPlayerAddedTotal && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary-text)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>

          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="camp-filter-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Camp:
            </label>
            <select
              id="camp-filter-select"
              value={campFilter}
              onChange={(e) => setCampFilter(e.target.value as CampFilter)}
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
              <option value="loup">Camp Loup</option>
              <option value="autres">Autres (Solo)</option>
            </select>
          </div>

          <FullscreenChart title="Total Loot Collecté">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalLootChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
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
                    label={{ 
                      value: 'Loot total collecté', 
                      angle: 270, 
                      position: 'left', 
                      offset: 15,
                      style: { textAnchor: 'middle' } 
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload as ChartLootStat;
                        const isHighlightedAddition = d.isHighlightedAddition;

                        return (
                          <div
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                            <div>Parties jouées: {d.gamesPlayed}</div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                              <strong>Loot collecté:</strong>
                            </div>
                            <div>Total: {d.totalLoot.toLocaleString()}</div>
                            <div>Moyenne par partie: {d.averageLoot.toFixed(1)}</div>
                            <div>Taux (par 60 min): {d.lootPer60Min.toFixed(1)}</div>
                            {isHighlightedAddition && (
                              <div style={{ 
                                marginTop: '4px', 
                                paddingTop: '4px', 
                                borderTop: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                fontStyle: 'italic'
                              }}>
                                🎯 Affiché via sélection personnelle
                                {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalLoot">
                    {totalLootChartData.map((entry, index) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                      const isHoveredPlayer = highlightedPlayer === entry.player;
                      const isHighlightedAddition = entry.isHighlightedAddition;

                      const playerColor = playersColor[entry.player] || 'var(--chart-primary)';

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            isHighlightedFromSettings ? 'var(--accent-primary)' :
                            isHighlightedAddition ? 'var(--accent-secondary)' :
                            playerColor
                          }
                          stroke={
                            isHighlightedFromSettings ? "var(--accent-primary)" :
                            isHoveredPlayer ? "#000000" : 
                            "none"
                          }
                          strokeWidth={
                            isHighlightedFromSettings ? 3 :
                            isHoveredPlayer ? 2 : 
                            0
                          }
                          strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                          opacity={isHighlightedAddition ? 0.8 : 1}
                          onClick={() => navigateToGameDetails({ selectedPlayer: entry.player })}
                          onMouseEnter={() => setHighlightedPlayer(entry.player)}
                          onMouseLeave={() => setHighlightedPlayer(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {totalLootChartData.length} des joueurs (tous joueurs inclus)
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            Calculé sur {lootData.gamesWithLootData} parties avec données de loot
          </p>
        </div>

        {/* Normalized Loot Per 60 Minutes Chart */}
        <div className="lycans-graphique-section">
          <div>
            <h3>Taux de Récolte (par 60 min)</h3>
            {highlightedPlayerAddedNormalized && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary-text)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
              </p>
            )}
          </div>

          <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="camp-filter-select-normalized" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Camp:
            </label>
            <select
              id="camp-filter-select-normalized"
              value={campFilter}
              onChange={(e) => setCampFilter(e.target.value as CampFilter)}
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
              <option value="loup">Camp Loup</option>
              <option value="autres">Autres (Solo)</option>
            </select>

            <label htmlFor="min-games-select-normalized" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '1rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-select-normalized"
              value={minGames}
              onChange={(e) => setMinGames(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem'
              }}
            >
              {minGamesOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <FullscreenChart title="Taux de Récolte (par 60 min)">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={normalizedLootChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
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
                    label={{ 
                      value: 'Loot par 60 minutes', 
                      angle: 270, 
                      position: 'left', 
                      offset: 15,
                      style: { textAnchor: 'middle' } 
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload as ChartLootStat;
                        const isHighlightedAddition = d.isHighlightedAddition;

                        return (
                          <div
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                            <div>Parties jouées: {d.gamesPlayed}</div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                              <strong>Taux normalisé (par 60 min):</strong>
                            </div>
                            <div>{d.lootPer60Min.toFixed(1)} loot/heure</div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                              <strong>Statistiques globales:</strong>
                            </div>
                            <div>Total: {d.totalLoot.toLocaleString()}</div>
                            <div>Moyenne par partie: {d.averageLoot.toFixed(1)}</div>
                            {isHighlightedAddition && (
                              <div style={{ 
                                marginTop: '4px', 
                                paddingTop: '4px', 
                                borderTop: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                fontStyle: 'italic'
                              }}>
                                🎯 Affiché via sélection personnelle
                                {d.gamesPlayed < minGames && ` (< ${minGames} parties)`}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="lootPer60Min">
                    {normalizedLootChartData.map((entry, index) => {
                      const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                      const isHoveredPlayer = highlightedPlayer === entry.player;
                      const isHighlightedAddition = entry.isHighlightedAddition;

                      const playerColor = playersColor[entry.player] || 'var(--chart-primary)';

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            isHighlightedFromSettings ? 'var(--accent-primary)' :
                            isHighlightedAddition ? 'var(--accent-secondary)' :
                            playerColor
                          }
                          stroke={
                            isHighlightedFromSettings ? "var(--accent-primary)" :
                            isHoveredPlayer ? "#000000" : 
                            "none"
                          }
                          strokeWidth={
                            isHighlightedFromSettings ? 3 :
                            isHoveredPlayer ? 2 : 
                            0
                          }
                          strokeDasharray={isHighlightedAddition ? "5,5" : "none"}
                          opacity={isHighlightedAddition ? 0.8 : 1}
                          onClick={() => navigateToGameDetails({ selectedPlayer: entry.player })}
                          onMouseEnter={() => setHighlightedPlayer(entry.player)}
                          onMouseLeave={() => setHighlightedPlayer(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {normalizedLootChartData.length} des joueurs (sur {eligiblePlayersCount} ayant au moins {minGames} partie{minGames > 1 ? 's' : ''})
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', marginTop: '0.25rem' }}>
            Taux normalisé par 60 minutes de jeu · Calculé sur {lootData.gamesWithLootData} parties avec données
          </p>
        </div>
      </div>
    </div>
  );
}
