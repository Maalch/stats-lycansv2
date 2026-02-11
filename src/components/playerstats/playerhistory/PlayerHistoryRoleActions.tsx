import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { CHART_LIMITS } from '../../../config/chartConstants';
import { calculateNightsAsWolf, isWolfRole } from '../../../utils/wolfTransformUtils';

interface PlayerHistoryRoleActionsProps {
  selectedPlayerName: string;
}

interface RoleActionStatistics {
  hunterTargets: { target: string; count: number }[];
  hunterMissedShots: number;
  hunterTotalShots: number;
  transformCount: number;
  untransformCount: number;
  transformationsPerGame: number;
  totalGamesWithActions: number;
  totalGamesPlayed: number;
  totalNightsAsWolf: number;
  transformsPerNight: number;
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
        transformCount: 0,
        untransformCount: 0,
        transformationsPerGame: 0,
        totalGamesWithActions: 0,
        totalGamesPlayed: 0,
        totalNightsAsWolf: 0,
        transformsPerNight: 0,
      };
    }

    const hunterTargetsMap: Record<string, number> = {};
    let transformCount = 0;
    let untransformCount = 0;
    let hunterTotalShots = 0;
    let totalGamesWithActions = 0;
    let totalGamesPlayed = 0;
    let totalNightsAsWolf = 0;

    // Process each game
    filteredGameData.forEach(game => {
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!playerStat) return; // Player not in this game
      
      totalGamesPlayed++;
      let gameHasTrackedActions = false;
      
      // Check if this player has reliable transformation data
      const gameVersion = parseFloat(game.Version || '0');
      const hasGuaranteedTransformData = game.Modded && gameVersion >= 0.243;
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
        }
      });

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

    return {
      hunterTargets,
      hunterMissedShots,
      hunterTotalShots,
      transformCount,
      untransformCount,
      transformationsPerGame,
      totalGamesWithActions,
      totalGamesPlayed,
      totalNightsAsWolf,
      transformsPerNight,
    };
  }, [filteredGameData, selectedPlayerName]);

  // Check if we have any data to display
  const hasData = roleActionStatistics.hunterTotalShots > 0 || roleActionStatistics.transformCount > 0 || roleActionStatistics.untransformCount > 0;

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
      {roleActionStatistics.hunterTotalShots > 0 && (
        <div className="lycans-graphique-section">
          <h3>Statistiques du Chasseur</h3>
          
          {/* Hunter Accuracy Summary */}
          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>

            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>✅ Tirs réussis</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Chasseur'] || 'var(--chart-color-2)' }}>
                {roleActionStatistics.hunterTotalShots - roleActionStatistics.hunterMissedShots}
              </div>
              <p>cibles touchées</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>❌ Tirs manqués</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--text-secondary)' }}>
                {roleActionStatistics.hunterMissedShots}
              </div>
              <p>tirs sans cible</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>📊 Précision</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Chasseur'] || 'var(--chart-color-2)' }}>
                {roleActionStatistics.hunterTotalShots > 0 
                  ? ((roleActionStatistics.hunterTotalShots - roleActionStatistics.hunterMissedShots) / roleActionStatistics.hunterTotalShots * 100).toFixed(1)
                  : '0'}%
              </div>
              <p>taux de réussite</p>
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
                              <div>Tué par le chasseur {dataPoint.count} fois</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill={lycansColors['Chasseur'] || 'var(--chart-color-2)'}>
                      {roleActionStatistics.hunterTargets.map((entry, index) => (
                        <Cell 
                          key={`cell-hunter-${index}`} 
                          fill={playersColor[entry.target] || lycansColors['Chasseur'] || `hsl(${120 + index * 15}, 60%, 45%)`}
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
              <h3>🌙 Nuits totales</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {roleActionStatistics.totalNightsAsWolf}
              </div>
              <p>nuits vécues en loup (opportunités)</p>
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
    </div>
  );
}
