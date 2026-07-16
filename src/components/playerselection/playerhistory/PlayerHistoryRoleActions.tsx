import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Rectangle } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import type { PlayerStat } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { CHART_LIMITS } from '../../../config/chartConstants';
import { calculateNightsAsWolf, isWolfRole } from '../../../utils/wolfTransformUtils';
import { compareVersion } from '../../../hooks/utils/dataUtils';
import { getPlayerCampFromRole } from '../../../utils/datasyncExport';
import { DEATH_TYPES } from '../../../types/deathTypes';

interface PlayerHistoryRoleActionsProps {
  selectedPlayerName: string;
}

interface RoleActionStatistics {
  hunterTargets: { target: string; count: number }[];
  hunterMissedShots: number;
  hunterTotalShots: number;
  villageoisKilled: number;
  wolfKilledAsHuman: number;
  wolfKilledAsWolf: number;
  soloRoleKilled: number;
  transformCount: number;
  untransformCount: number;
  transformationsPerGame: number;
  totalGamesWithActions: number;
  totalGamesPlayed: number;
  totalNightsAsWolf: number;
  transformsPerNight: number;
  sabotageCount: number;
  sabotageGamesAsWolf: number;
  sabotagePerWolfGame: number;
  sabotageByLocation: { name: string; count: number }[];
}

/**
 * Determines a player's effective main role at a specific point in real-life time,
 * accounting for mid-game role changes (e.g. Villageois -> Traître).
 */
function getPlayerRoleAtDate(player: PlayerStat, targetDate: string | null): string {
  let currentRole = player.MainRoleInitial;
  const changes = player.MainRoleChanges;

  if (!targetDate || !changes || changes.length === 0) {
    return currentRole;
  }

  const targetTime = new Date(targetDate).getTime();
  const sortedChanges = [...changes].sort(
    (a, b) => new Date(a.RoleChangeDateIrl).getTime() - new Date(b.RoleChangeDateIrl).getTime()
  );

  for (const change of sortedChanges) {
    const changeTime = new Date(change.RoleChangeDateIrl).getTime();
    if (changeTime <= targetTime) {
      currentRole = change.NewMainRole;
    } else {
      break;
    }
  }

  return currentRole;
}

export function PlayerHistoryRoleActions({ selectedPlayerName }: PlayerHistoryRoleActionsProps) {
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const lycansColors = useThemeAdjustedLycansColorScheme();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Calculate role-specific action statistics for the selected player
  const roleActionStatistics = useMemo<RoleActionStatistics>(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return {
        hunterTargets: [],
        hunterMissedShots: 0,
        hunterTotalShots: 0,
        villageoisKilled: 0,
        wolfKilledAsHuman: 0,
        wolfKilledAsWolf: 0,
        soloRoleKilled: 0,
        transformCount: 0,
        untransformCount: 0,
        transformationsPerGame: 0,
        totalGamesWithActions: 0,
        totalGamesPlayed: 0,
        totalNightsAsWolf: 0,
        transformsPerNight: 0,
        sabotageCount: 0,
        sabotageGamesAsWolf: 0,
        sabotagePerWolfGame: 0,
        sabotageByLocation: [],
      };
    }

    const hunterTargetsMap: Record<string, number> = {};
    let transformCount = 0;
    let untransformCount = 0;
    let hunterTotalShots = 0;
    let totalGamesWithActions = 0;
    let totalGamesPlayed = 0;
    let totalNightsAsWolf = 0;
    let sabotageCount = 0;
    let sabotageGamesAsWolf = 0;
    let villageoisKilled = 0;
    let wolfKilledAsHuman = 0;
    let wolfKilledAsWolf = 0;
    let soloRoleKilled = 0;
    const sabotageByLocationMap: Record<string, number> = {};

    // Process each game
    filteredGameData.forEach(game => {
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!playerStat) return; // Player not in this game
      
      totalGamesPlayed++;
      let gameHasTrackedActions = false;
      
      // Check if this player has reliable transformation data
      const hasGuaranteedTransformData = game.Modded && compareVersion(game.Version || '0', '0.243');
      let playerHasTransformData = false;
      
      if (hasGuaranteedTransformData) {
        // Modded game v0.243+ - always has reliable data
        playerHasTransformData = true;
      } else {
        // Older game - only count if player has transform actions AND data is not incomplete
        const actions = playerStat.Actions || [];
        const hasTransformActions = actions.some(a => a.ActionType === 'Transform' || a.ActionType === 'Untransform');
        const hasIncompleteData = playerStat.LegacyActionsIncomplete === true;
        playerHasTransformData = hasTransformActions && !hasIncompleteData;
      }
      
      // Calculate nights as wolf if player has wolf role and has reliable transform data
      if (isWolfRole(playerStat.MainRoleInitial) && playerHasTransformData) {
        const nightsInThisGame = calculateNightsAsWolf(playerStat.DeathTiming, game.EndTiming);
        totalNightsAsWolf += nightsInThisGame;
      }

      // Get actions directly from PlayerStats
      const actions = playerStat.Actions || [];
      
      // Process actions
      actions.forEach((action) => {
        // Check for hunter shots
        if (action.ActionType === 'HunterShoot') {
          hunterTotalShots++;
          gameHasTrackedActions = true;
          
          // Track hunter targets (successful shots)
          if (action.ActionTarget) {
            hunterTargetsMap[action.ActionTarget] = (hunterTargetsMap[action.ActionTarget] || 0) + 1;
          }
        } else if (action.ActionType === 'Transform') {
          transformCount++;
          gameHasTrackedActions = true;
        } else if (action.ActionType === 'Untransform') {
          untransformCount++;
          gameHasTrackedActions = true;
        } else if (action.ActionType === 'Sabotage' && isWolfRole(playerStat.MainRoleInitial)) {
          sabotageCount++;
          gameHasTrackedActions = true;
          if (action.ActionName) {
            sabotageByLocationMap[action.ActionName] = (sabotageByLocationMap[action.ActionName] || 0) + 1;
          }
        }
      });

      // Classify kills made by this player as Hunter, based on each victim's own death
      // record (KillerName + DeathType). This mirrors the approach used in the general
      // Hunter Rankings (computeHunterStatistics) and does not depend on the Actions log,
      // so older games without detailed action tracking are still counted.
      game.PlayerStats.forEach(victim => {
        if (
          victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase() &&
          (victim.DeathType === DEATH_TYPES.BULLET_HUMAN || victim.DeathType === DEATH_TYPES.BULLET_WOLF)
        ) {
          // Resolve the victim's role at the exact moment they were hit,
          // in case they changed camp during the game (e.g. became a Traître).
          const victimRoleAtDeath = getPlayerRoleAtDate(victim, victim.DeathDateIrl);
          const victimPowerAtDeath = victimRoleAtDeath === 'Villageois Élite' ? victim.Power : null;
          const victimCamp = getPlayerCampFromRole(
            victimRoleAtDeath,
            { regroupLovers: true, regroupVillagers: true, regroupWolfSubRoles: true },
            victimPowerAtDeath
          );

          if (victimCamp === 'Villageois' && victim.DeathType === DEATH_TYPES.BULLET_HUMAN) {
            villageoisKilled++;
          } else if (victimCamp === 'Loup') {
            if (victim.DeathType === DEATH_TYPES.BULLET_HUMAN) {
              wolfKilledAsHuman++;
            } else {
              wolfKilledAsWolf++;
            }
          } else if (victim.DeathType === DEATH_TYPES.BULLET_HUMAN) {
            soloRoleKilled++;
          }
        }
      });

      // Count wolf games that have any actions (for sabotage average denominator)
      if (isWolfRole(playerStat.MainRoleInitial) && actions.length > 0) {
        sabotageGamesAsWolf++;
      }

      if (gameHasTrackedActions) {
        totalGamesWithActions++;
      }
    });

    // Convert to arrays and sort
    const hunterTargets = Object.entries(hunterTargetsMap)
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_LIMITS.TOP_10);

    // Calculate hunter shot statistics
    const hunterSuccessfulShots = Object.values(hunterTargetsMap).reduce((sum, count) => sum + count, 0);
    const hunterMissedShots = hunterTotalShots - hunterSuccessfulShots;

    // Calculate average transformations per game (for wolf games)
    const gamesWithTransforms = transformCount > 0 
      ? Math.max(1, filteredGameData.filter(game => {
          const playerStat = game.PlayerStats.find(
            p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
          );
          if (!playerStat) return false;
          // Check for transforms in player's actions
          const actions = playerStat.Actions || [];
          return actions.some(a => a.ActionType === 'Transform');
        }).length)
      : 0;
    const transformationsPerGame = gamesWithTransforms > 0 
      ? transformCount / gamesWithTransforms 
      : 0;
    
    // Calculate transforms per night
    const transformsPerNight = totalNightsAsWolf > 0 
      ? transformCount / totalNightsAsWolf 
      : 0;

    // Sabotage location distribution (only for Village map, sorted by count)
    const sabotageByLocation = Object.entries(sabotageByLocationMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      hunterTargets,
      hunterMissedShots,
      hunterTotalShots,
      villageoisKilled,
      wolfKilledAsHuman,
      wolfKilledAsWolf,
      soloRoleKilled,
      transformCount,
      untransformCount,
      transformationsPerGame,
      totalGamesWithActions,
      totalGamesPlayed,
      totalNightsAsWolf,
      transformsPerNight,
      sabotageCount,
      sabotageGamesAsWolf,
      sabotagePerWolfGame: sabotageGamesAsWolf > 0 ? sabotageCount / sabotageGamesAsWolf : 0,
      sabotageByLocation,
    };
  }, [filteredGameData, selectedPlayerName]);

  // Check if we have any data to display
  const hasHunterKillsData = roleActionStatistics.hunterTotalShots > 0 ||
    roleActionStatistics.villageoisKilled > 0 ||
    roleActionStatistics.wolfKilledAsHuman > 0 ||
    roleActionStatistics.wolfKilledAsWolf > 0 ||
    roleActionStatistics.soloRoleKilled > 0;
  const hasData = hasHunterKillsData || roleActionStatistics.transformCount > 0 || roleActionStatistics.untransformCount > 0 || roleActionStatistics.sabotageCount > 0;

  if (!hasData) {
    return (
      <div className="donnees-manquantes">
        <p>Aucune donnée d'actions de rôle disponible pour {selectedPlayerName}.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Les données d'actions de rôle (Chasseur, Loup) ne sont disponibles que pour les parties récentes.
        </p>
      </div>
    );
  }

  return (
    <div className="lycans-graphiques-groupe">

      {/* Hunter Targets Bar Chart */}
      {hasHunterKillsData && (
        <div className="lycans-graphique-section" style={{ flex: '1 1 100%' }}>
          <h3>Statistiques du Chasseur</h3>
          
          {/* Hunter Accuracy Summary */}
          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>

            {roleActionStatistics.hunterTotalShots > 0 && (
              <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
                <h3>🎯 Précision des tirs</h3>
                <div style={{ textAlign: 'center' }}>
                  <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Chasseur'] || 'var(--chart-color-2)' }}>
                    {roleActionStatistics.hunterTotalShots - roleActionStatistics.hunterMissedShots}/{roleActionStatistics.hunterTotalShots} ({roleActionStatistics.hunterTotalShots > 0
                      ? ((roleActionStatistics.hunterTotalShots - roleActionStatistics.hunterMissedShots) / roleActionStatistics.hunterTotalShots * 100).toFixed(1)
                      : '0'}%)
                  </div>
                </div>
              </div>
            )}

            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🧑‍🌾 Villageois tué</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Villageois'] || 'var(--chart-color-2)' }}>
                {roleActionStatistics.villageoisKilled}
              </div>
              <p>tué en tant que Villageois</p>
            </div>

            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🐺 Loup tué</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px' }}>
                <div>
                  <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                    {roleActionStatistics.wolfKilledAsHuman}
                  </div>
                  <p>en forme humaine</p>
                </div>
                <div>
                  <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                    {roleActionStatistics.wolfKilledAsWolf}
                  </div>
                  <p>en forme de loup</p>
                </div>
              </div>
            </div>

            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🃏 Solo tué</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {roleActionStatistics.soloRoleKilled}
              </div>
              <p>Rôle solo tué</p>
            </div>
          </div>
          
          {roleActionStatistics.hunterTargets.length > 0 && (
            <FullscreenChart title="Cibles Éliminées par le Chasseur">
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleActionStatistics.hunterTargets}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="target"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={12}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill="var(--text-secondary)"
                          fontSize={12}
                          fontStyle="italic"
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <YAxis 
                      label={{ value: 'Nombre de tirs', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{dataPoint.target}</strong></div>
                              <div>Touché par le chasseur {dataPoint.count} fois</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={lycansColors['Chasseur'] || 'var(--chart-color-2)'}
                      shape={(props) => {
                        const { x, y, width, height, payload, index } = props;
                        const entry = payload as { target: string };
                        const fillColor = playersColor[entry.target] || lycansColors['Chasseur'] || `hsl(${120 + (index ?? 0) * 15}, 60%, 45%)`;

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
            </FullscreenChart>
          )}
        </div>
      )}

      {/* Transform/Untransform Statistics */}
      {(roleActionStatistics.transformCount > 0 || roleActionStatistics.untransformCount > 0) && (
        <div className="lycans-graphique-section">
          <h3>Habitudes de Transformation (Loup)</h3>
          
          {/* Transform/Untransform Summary */}
          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>📊 Ratio</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {(() => {
                  const transforms = roleActionStatistics.transformCount;
                  const untransforms = roleActionStatistics.untransformCount;
                  if (transforms === 0) return '0%';
                  return `${((untransforms / transforms) * 100).toFixed(0)}%`;
                })()}
              </div>
              <p>détransformations / transformations</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🎯 Ratio / nuit</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {roleActionStatistics.transformsPerNight.toFixed(2)}
              </div>
              <p>transformations par nuit vécue</p>
            </div>
          </div>

          {/* Transform/Untransform Comparison Chart */}
          <FullscreenChart title="Statistiques de Transformation">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: 'Statistiques Loup',
                      'Nuits vécues': roleActionStatistics.totalNightsAsWolf,
                      'Transformations': roleActionStatistics.transformCount,
                      'Détransformations': roleActionStatistics.untransformCount,
                    }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    fontSize={14}
                  />
                  <YAxis 
                    label={{ value: 'Compte', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      return (
                        <div className="custom-tooltip" style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '4px',
                          padding: '10px'
                        }}>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} style={{ color: entry.color, marginBottom: '4px' }}>
                              <strong>{entry.name}:</strong> {entry.value}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Nuits vécues" fill="var(--chart-color-4, #a4de6c)" />
                  <Bar dataKey="Transformations" fill={lycansColors['Loup'] || 'var(--wolf-color)'} />
                  <Bar dataKey="Détransformations" fill="var(--accent-secondary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      )}

      {/* Sabotage Statistics */}
      {roleActionStatistics.sabotageCount > 0 && (
        <div className="lycans-graphique-section">
          <h3>Sabotages (Loup)</h3>

          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>💥 Total sabotages</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {roleActionStatistics.sabotageCount}
              </div>
              <p>sabotages effectués</p>
            </div>

            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>📊 Par partie en Loup</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {roleActionStatistics.sabotagePerWolfGame.toFixed(2)}
              </div>
              <p>sabotages / partie jouée en Loup</p>
            </div>
          </div>

          {roleActionStatistics.sabotageByLocation.length > 0 && (
            <FullscreenChart title="Répartition des Sabotages par Emplacement">
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleActionStatistics.sabotageByLocation}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      fontSize={13}
                    />
                    <YAxis
                      label={{ value: 'Nombre', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const dataPoint = payload[0].payload as { name: string; count: number };
                        const total = roleActionStatistics.sabotageByLocation.reduce((s, l) => s + l.count, 0);
                        return (
                          <div style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{dataPoint.name}</strong></div>
                            <div>{dataPoint.count} sabotage{dataPoint.count > 1 ? 's' : ''}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {total > 0 ? ((dataPoint.count / total) * 100).toFixed(1) : '0'}% du total
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count">
                      {roleActionStatistics.sabotageByLocation.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${(index * 57 + 20) % 360}, 60%, 48%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FullscreenChart>
          )}
        </div>
      )}
    </div>
  );
}
