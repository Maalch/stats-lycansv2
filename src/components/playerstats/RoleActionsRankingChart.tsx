import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { useCombinedFilteredRawData } from '../../hooks/useCombinedRawData';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor, useThemeAdjustedLycansColorScheme } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS, CHART_LIMITS } from '../../config/chartConstants';
import { calculateNightsAsWolf, isWolfRole } from '../../utils/wolfTransformUtils';
import { compareVersion } from '../../hooks/utils/dataUtils';

interface PlayerRoleActionStats {
  player: string;
  // Wolf stats
  transformCount: number;
  untransformCount: number;
  totalNightsAsWolf: number;
  transformsPerNight: number;
  untransformPerTransform: number;
  wolfGamesPlayed: number;
  // Hunter stats
  hunterSuccessfulShots: number;
  hunterMissedShots: number;
  hunterTotalShots: number;
  hunterAccuracy: number;
  hunterGamesPlayed: number;
  // For highlighting
  isHighlightedAddition?: boolean;
}

type SortOrder = 'highest' | 'lowest';

const minGamesOptions = MIN_GAMES_OPTIONS.COMPACT;

export function RoleActionsRankingChart() {
  const { navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // State for filters
  const [minWolfGames, setMinWolfGames] = useState<number>(
    navigationState.roleActionsRankingState?.minWolfGames || MIN_GAMES_DEFAULTS.LOW
  );
  const [minHunterGames, setMinHunterGames] = useState<number>(
    navigationState.roleActionsRankingState?.minHunterGames || MIN_GAMES_DEFAULTS.VERY_LOW
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    navigationState.roleActionsRankingState?.sortOrder || 'highest'
  );
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  // Save state to navigation context when it changes
  useEffect(() => {
    const currentNavState = navigationState.roleActionsRankingState;
    if (!currentNavState || 
        currentNavState.minWolfGames !== minWolfGames ||
        currentNavState.minHunterGames !== minHunterGames ||
        currentNavState.sortOrder !== sortOrder) {
      updateNavigationState({
        roleActionsRankingState: {
          minWolfGames,
          minHunterGames,
          sortOrder
        }
      });
    }
  }, [minWolfGames, minHunterGames, sortOrder, updateNavigationState]);

  // Calculate role action statistics for all players
  const playerStats = useMemo<PlayerRoleActionStats[]>(() => {
    if (!filteredGameData) return [];

    const statsMap: Record<string, {
      transformCount: number;
      untransformCount: number;
      totalNightsAsWolf: number;
      wolfGamesPlayed: number;
      hunterSuccessfulShots: number;
      hunterMissedShots: number;
      hunterTotalShots: number;
      hunterGamesPlayed: number;
    }> = {};

    // Process each game
    filteredGameData.forEach(game => {
      const hasGuaranteedTransformData = game.Modded && compareVersion(game.Version || '0', '0.243');

      game.PlayerStats.forEach(playerStat => {
        const playerName = playerStat.Username;
        
        if (!statsMap[playerName]) {
          statsMap[playerName] = {
            transformCount: 0,
            untransformCount: 0,
            totalNightsAsWolf: 0,
            wolfGamesPlayed: 0,
            hunterSuccessfulShots: 0,
            hunterMissedShots: 0,
            hunterTotalShots: 0,
            hunterGamesPlayed: 0,
          };
        }

        const stats = statsMap[playerName];
        const actions = playerStat.Actions || [];

        // Check if player has reliable transformation data
        let playerHasTransformData = false;
        if (hasGuaranteedTransformData) {
          playerHasTransformData = true;
        } else {
          const hasTransformActions = actions.some(a => a.ActionType === 'Transform' || a.ActionType === 'Untransform');
          const hasIncompleteData = playerStat.LegacyActionsIncomplete === true;
          playerHasTransformData = hasTransformActions && !hasIncompleteData;
        }

        // Wolf statistics - only count if player was wolf and has reliable data
        if (isWolfRole(playerStat.MainRoleInitial) && playerHasTransformData) {
          stats.wolfGamesPlayed++;
          const nightsInThisGame = calculateNightsAsWolf(playerStat.DeathTiming, game.EndTiming);
          stats.totalNightsAsWolf += nightsInThisGame;

          actions.forEach(action => {
            if (action.ActionType === 'Transform') {
              stats.transformCount++;
            } else if (action.ActionType === 'Untransform') {
              stats.untransformCount++;
            }
          });
        }

        // Hunter statistics
        const hunterShots = actions.filter(a => a.ActionType === 'HunterShoot');
        if (hunterShots.length > 0) {
          stats.hunterGamesPlayed++;
          hunterShots.forEach(shot => {
            stats.hunterTotalShots++;
            if (shot.ActionTarget) {
              stats.hunterSuccessfulShots++;
            } else {
              stats.hunterMissedShots++;
            }
          });
        }
      });
    });

    // Convert to array and calculate ratios
    return Object.entries(statsMap).map(([player, stats]) => ({
      player,
      transformCount: stats.transformCount,
      untransformCount: stats.untransformCount,
      totalNightsAsWolf: stats.totalNightsAsWolf,
      transformsPerNight: stats.totalNightsAsWolf > 0 
        ? stats.transformCount / stats.totalNightsAsWolf 
        : 0,
      untransformPerTransform: stats.transformCount > 0 
        ? stats.untransformCount / stats.transformCount 
        : 0,
      wolfGamesPlayed: stats.wolfGamesPlayed,
      hunterSuccessfulShots: stats.hunterSuccessfulShots,
      hunterMissedShots: stats.hunterMissedShots,
      hunterTotalShots: stats.hunterTotalShots,
      hunterAccuracy: stats.hunterTotalShots > 0 
        ? (stats.hunterSuccessfulShots / stats.hunterTotalShots) * 100 
        : 0,
      hunterGamesPlayed: stats.hunterGamesPlayed,
    }));
  }, [filteredGameData]);

  // Transforms per night chart data
  const { transformsPerNightData, transformsHighlightedAdded } = useMemo(() => {
    const eligiblePlayers = playerStats.filter(p => p.wolfGamesPlayed >= minWolfGames && p.totalNightsAsWolf > 0);
    
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => 
      sortOrder === 'highest' 
        ? b.transformsPerNight - a.transformsPerNight 
        : a.transformsPerNight - b.transformsPerNight
    ).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    let finalData: PlayerRoleActionStats[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = playerStats.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData && highlightedPlayerData.totalNightsAsWolf > 0) {
        finalData.push({ ...highlightedPlayerData, isHighlightedAddition: true });
        playerAdded = true;
      }
    }

    return { transformsPerNightData: finalData, transformsHighlightedAdded: playerAdded };
  }, [playerStats, minWolfGames, sortOrder, settings.highlightedPlayer]);

  // Untransforms per transform chart data
  const { untransformsData, untransformsHighlightedAdded } = useMemo(() => {
    const eligiblePlayers = playerStats.filter(p => p.wolfGamesPlayed >= minWolfGames && p.transformCount > 0);
    
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => 
      sortOrder === 'highest' 
        ? b.untransformPerTransform - a.untransformPerTransform 
        : a.untransformPerTransform - b.untransformPerTransform
    ).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    let finalData: PlayerRoleActionStats[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = playerStats.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData && highlightedPlayerData.transformCount > 0) {
        finalData.push({ ...highlightedPlayerData, isHighlightedAddition: true });
        playerAdded = true;
      }
    }

    return { untransformsData: finalData, untransformsHighlightedAdded: playerAdded };
  }, [playerStats, minWolfGames, sortOrder, settings.highlightedPlayer]);

  // Hunter accuracy chart data
  const { hunterAccuracyData, hunterHighlightedAdded } = useMemo(() => {
    const eligiblePlayers = playerStats.filter(p => p.hunterGamesPlayed >= minHunterGames && p.hunterTotalShots > 0);
    
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
      const accuracyDiff = sortOrder === 'highest' 
        ? b.hunterAccuracy - a.hunterAccuracy 
        : a.hunterAccuracy - b.hunterAccuracy;
      
      // If accuracy is the same, order by total shots (more shots first as tiebreaker)
      if (accuracyDiff === 0) {
        return b.hunterTotalShots - a.hunterTotalShots;
      }
      
      return accuracyDiff;
    }).slice(0, CHART_LIMITS.TOP_20);

    const highlightedInTop = settings.highlightedPlayer && 
      sortedPlayers.some(p => p.player === settings.highlightedPlayer);

    let finalData: PlayerRoleActionStats[] = [...sortedPlayers];
    let playerAdded = false;

    if (settings.highlightedPlayer && !highlightedInTop) {
      const highlightedPlayerData = playerStats.find(p => p.player === settings.highlightedPlayer);
      if (highlightedPlayerData && highlightedPlayerData.hunterTotalShots > 0) {
        finalData.push({ ...highlightedPlayerData, isHighlightedAddition: true });
        playerAdded = true;
      }
    }

    return { hunterAccuracyData: finalData, hunterHighlightedAdded: playerAdded };
  }, [playerStats, minHunterGames, sortOrder, settings.highlightedPlayer]);

  // Check if we have any data
  const hasWolfData = transformsPerNightData.length > 0 || untransformsData.length > 0;
  const hasHunterData = hunterAccuracyData.length > 0;

  if (!hasWolfData && !hasHunterData) {
    return (
      <div className="donnees-manquantes">
        <p>Aucune donnée d'actions de rôle disponible.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Les données d'actions de rôle (Chasseur, Loup) ne sont disponibles que pour les parties récentes avec le mod.
        </p>
      </div>
    );
  }

  const eligibleWolfPlayers = playerStats.filter(p => p.wolfGamesPlayed >= minWolfGames && p.totalNightsAsWolf > 0).length;
  const eligibleHunterPlayers = playerStats.filter(p => p.hunterGamesPlayed >= minHunterGames && p.hunterTotalShots > 0).length;

  return (
    <div className="lycans-players-stats">
      <h2>Classement des Actions de Rôle</h2>
      <p className="lycans-stats-info">
        Classement des joueurs par comportement en tant que Loup et Chasseur.
      </p>

      {/* Global controls */}
      <div className="lycans-winrate-controls" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="sort-order-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Tri:
          </label>
          <select
            id="sort-order-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.9rem'
            }}
          >
            <option value="highest">Plus élevé d'abord</option>
            <option value="lowest">Plus bas d'abord</option>
          </select>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Transforms per Night Chart */}
        {transformsPerNightData.length > 0 && (
          <div className="lycans-graphique-section">
            <div>
              <h3>🐺 Transformations par Nuit (Loup)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Nombre moyen de transformations effectuées par nuit vécue en loup
              </p>
              {transformsHighlightedAdded && settings.highlightedPlayer && (
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-primary-text)', 
                  fontStyle: 'italic',
                  marginTop: '0.25rem'
                }}>
                  🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
                </p>
              )}
            </div>

            <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
              <label htmlFor="min-wolf-games-transform" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. parties loup:
              </label>
              <select
                id="min-wolf-games-transform"
                value={minWolfGames}
                onChange={(e) => setMinWolfGames(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {minGamesOptions.map(n => (
                  <option key={n} value={n}>{n}+ parties</option>
                ))}
              </select>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ({eligibleWolfPlayers} joueurs éligibles)
              </span>
            </div>

            <FullscreenChart title="Transformations par Nuit">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transformsPerNightData}
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
                        value: 'Transformations / nuit', 
                        angle: 270, 
                        position: 'left', 
                        offset: 15,
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload as PlayerRoleActionStats;
                          return (
                            <div style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                              <div>Parties loup: {d.wolfGamesPlayed}</div>
                              <div>Nuits vécues: {d.totalNightsAsWolf}</div>
                              <div>Transformations: {d.transformCount}</div>
                              <div style={{ marginTop: '4px', fontWeight: 'bold', color: lycansColors['Loup'] }}>
                                Ratio: {d.transformsPerNight.toFixed(2)} / nuit
                              </div>
                              {d.isHighlightedAddition && (
                                <div style={{ marginTop: '4px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                  🎯 Affiché via sélection personnelle
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="transformsPerNight"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as PlayerRoleActionStats;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHoveredPlayer = highlightedPlayer === entry.player;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        const playerColor = playersColor[entry.player] || lycansColors['Loup'] || 'var(--wolf-color)';

                        return (
                          <Rectangle
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={
                              isHighlightedFromSettings ? 'var(--accent-primary)' :
                              isHighlightedAddition ? 'var(--accent-secondary)' :
                              playerColor
                            }
                            stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHoveredPlayer ? '#000000' : 'none'}
                            strokeWidth={isHighlightedFromSettings ? 3 : isHoveredPlayer ? 2 : 0}
                            strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                            onMouseEnter={() => setHighlightedPlayer(entry.player)}
                            onMouseLeave={() => setHighlightedPlayer(null)}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Untransforms per Transform Chart */}
        {untransformsData.length > 0 && (
          <div className="lycans-graphique-section">
            <div>
              <h3>🐺 Détransformations par Transformation (Loup)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Ratio de retour à forme humaine. Élevé = joueur qui se détransforme souvent. Bas = reste transformé longtemps.
              </p>
              {untransformsHighlightedAdded && settings.highlightedPlayer && (
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-primary-text)', 
                  fontStyle: 'italic',
                  marginTop: '0.25rem'
                }}>
                  🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
                </p>
              )}
            </div>

            <FullscreenChart title="Détransformations par Transformation">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={untransformsData}
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
                        value: 'Ratio détransform. / transform.', 
                        angle: 270, 
                        position: 'left', 
                        offset: 15,
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload as PlayerRoleActionStats;
                          return (
                            <div style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                              <div>Parties loup: {d.wolfGamesPlayed}</div>
                              <div>Transformations: {d.transformCount}</div>
                              <div>Détransformations: {d.untransformCount}</div>
                              <div style={{ marginTop: '4px', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>
                                Ratio: {(d.untransformPerTransform * 100).toFixed(0)}%
                              </div>
                              {d.isHighlightedAddition && (
                                <div style={{ marginTop: '4px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                  🎯 Affiché via sélection personnelle
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="untransformPerTransform"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as PlayerRoleActionStats;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHoveredPlayer = highlightedPlayer === entry.player;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        const playerColor = playersColor[entry.player] || 'var(--accent-secondary)';

                        return (
                          <Rectangle
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={
                              isHighlightedFromSettings ? 'var(--accent-primary)' :
                              isHighlightedAddition ? 'var(--accent-secondary)' :
                              playerColor
                            }
                            stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHoveredPlayer ? '#000000' : 'none'}
                            strokeWidth={isHighlightedFromSettings ? 3 : isHoveredPlayer ? 2 : 0}
                            strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                            onMouseEnter={() => setHighlightedPlayer(entry.player)}
                            onMouseLeave={() => setHighlightedPlayer(null)}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}

        {/* Hunter Accuracy Chart */}
        {hunterAccuracyData.length > 0 && (
          <div className="lycans-graphique-section">
            <div>
              <h3>🎯 Précision du Chasseur</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Pourcentage de tirs réussis (cible touchée) sur le total des tirs effectués
              </p>
              {hunterHighlightedAdded && settings.highlightedPlayer && (
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-primary-text)', 
                  fontStyle: 'italic',
                  marginTop: '0.25rem'
                }}>
                  🎯 "{settings.highlightedPlayer}" affiché en plus du top 20
                </p>
              )}
            </div>

            <div className="lycans-winrate-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
              <label htmlFor="min-hunter-games" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. parties avec tir:
              </label>
              <select
                id="min-hunter-games"
                value={minHunterGames}
                onChange={(e) => setMinHunterGames(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {minGamesOptions.map(n => (
                  <option key={n} value={n}>{n}+ parties</option>
                ))}
              </select>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ({eligibleHunterPlayers} joueurs éligibles)
              </span>
            </div>

            <FullscreenChart title="Précision du Chasseur">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hunterAccuracyData}
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
                        value: 'Précision (%)', 
                        angle: 270, 
                        position: 'left', 
                        offset: 15,
                        style: { textAnchor: 'middle' } 
                      }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const d = payload[0].payload as PlayerRoleActionStats;
                          return (
                            <div style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '8px',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{d.player}</div>
                              <div>Parties avec tir: {d.hunterGamesPlayed}</div>
                              <div>Tirs réussis: {d.hunterSuccessfulShots}</div>
                              <div>Tirs manqués: {d.hunterMissedShots}</div>
                              <div>Total tirs: {d.hunterTotalShots}</div>
                              <div style={{ marginTop: '4px', fontWeight: 'bold', color: lycansColors['Chasseur'] }}>
                                Précision: {d.hunterAccuracy.toFixed(1)}%
                              </div>
                              {d.isHighlightedAddition && (
                                <div style={{ marginTop: '4px', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                                  🎯 Affiché via sélection personnelle
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="hunterAccuracy"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as PlayerRoleActionStats;
                        const isHighlightedFromSettings = settings.highlightedPlayer === entry.player;
                        const isHoveredPlayer = highlightedPlayer === entry.player;
                        const isHighlightedAddition = entry.isHighlightedAddition;
                        const playerColor = playersColor[entry.player] || lycansColors['Chasseur'] || 'var(--chart-color-2)';

                        return (
                          <Rectangle
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={
                              isHighlightedFromSettings ? 'var(--accent-primary)' :
                              isHighlightedAddition ? 'var(--accent-secondary)' :
                              playerColor
                            }
                            stroke={isHighlightedFromSettings ? 'var(--accent-primary)' : isHoveredPlayer ? '#000000' : 'none'}
                            strokeWidth={isHighlightedFromSettings ? 3 : isHoveredPlayer ? 2 : 0}
                            strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                            opacity={isHighlightedAddition ? 0.8 : 1}
                            onMouseEnter={() => setHighlightedPlayer(entry.player)}
                            onMouseLeave={() => setHighlightedPlayer(null)}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          </div>
        )}
      </div>
    </div>
  );
}
