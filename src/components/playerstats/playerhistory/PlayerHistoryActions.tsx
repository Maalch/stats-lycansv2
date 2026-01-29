import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useCombinedFilteredRawData, type Action } from '../../../hooks/useCombinedRawData';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';
import { FullscreenChart } from '../../common/FullscreenChart';
import { CHART_LIMITS } from '../../../config/chartConstants';

interface PlayerHistoryActionsProps {
  selectedPlayerName: string;
}

// Action types we want to display
const TRACKED_ACTION_TYPES = ['Transform', 'Untransform', 'UseGadget', 'HunterShoot', 'DrinkPotion'] as const;
type TrackedActionType = typeof TRACKED_ACTION_TYPES[number];

// French labels for action types
const ACTION_TYPE_LABELS: Record<TrackedActionType, string> = {
  Transform: 'Transformation (Loup)',
  Untransform: 'Détransformation',
  UseGadget: 'Utilisation Gadget',
  HunterShoot: 'Tir du Chasseur',
  DrinkPotion: 'Potion bue',
};

// Colors for action types
const ACTION_TYPE_COLORS: Record<TrackedActionType, string> = {
  Transform: 'var(--wolf-color, #8B0000)',
  Untransform: 'var(--wolf-color-light, #CD5C5C)',
  UseGadget: 'var(--chart-color-1, #8884d8)',
  HunterShoot: 'var(--chart-color-2, #82ca9d)',
  DrinkPotion: 'var(--chart-color-3, #ffc658)',
};

interface ActionStat {
  actionType: TrackedActionType;
  label: string;
  count: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface GadgetStat {
  gadgetName: string;
  count: number;
  [key: string]: string | number;
}

interface PotionStat {
  potionName: string;
  count: number;
  [key: string]: string | number;
}

interface ActionStatistics {
  actionTypeCounts: ActionStat[];
  gadgetDetails: GadgetStat[];
  potionDetails: PotionStat[];
  hunterTargets: { target: string; count: number }[];
  transformationsPerGame: number;
  totalGamesWithActions: number;
  totalGamesPlayed: number;
}

export function PlayerHistoryActions({ selectedPlayerName }: PlayerHistoryActionsProps) {
  const { gameData: filteredGameData } = useCombinedFilteredRawData();
  const { joueursData } = useJoueursData();
  const lycansColors = useThemeAdjustedLycansColorScheme();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Calculate action statistics for the selected player
  const actionStatistics = useMemo<ActionStatistics>(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return {
        actionTypeCounts: [],
        gadgetDetails: [],
        potionDetails: [],
        hunterTargets: [],
        transformationsPerGame: 0,
        totalGamesWithActions: 0,
        totalGamesPlayed: 0,
      };
    }

    // Maps to track actions
    const actionTypeCountsMap: Record<TrackedActionType, number> = {
      Transform: 0,
      Untransform: 0,
      UseGadget: 0,
      HunterShoot: 0,
      DrinkPotion: 0,
    };
    const gadgetCountsMap: Record<string, number> = {};
    const potionCountsMap: Record<string, number> = {};
    const hunterTargetsMap: Record<string, number> = {};
    
    let totalGamesWithActions = 0;
    let totalGamesPlayed = 0;

    // Process each game
    filteredGameData.forEach(game => {
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!playerStat) return; // Player not in this game
      
      totalGamesPlayed++;
      let gameHasTrackedActions = false;

      // Process player actions
      if (playerStat.Actions && Array.isArray(playerStat.Actions)) {
        playerStat.Actions.forEach((action: Action) => {
          const actionType = action.ActionType as TrackedActionType;
          
          // Only track our specified action types
          if (TRACKED_ACTION_TYPES.includes(actionType)) {
            actionTypeCountsMap[actionType]++;
            gameHasTrackedActions = true;

            // Track gadget details (exclude "Balle")
            if (actionType === 'UseGadget' && action.ActionName && action.ActionName !== 'Balle') {
              gadgetCountsMap[action.ActionName] = (gadgetCountsMap[action.ActionName] || 0) + 1;
            }

            // Track potion details
            if (actionType === 'DrinkPotion' && action.ActionName) {
              potionCountsMap[action.ActionName] = (potionCountsMap[action.ActionName] || 0) + 1;
            }

            // Track hunter targets
            if (actionType === 'HunterShoot' && action.ActionTarget) {
              hunterTargetsMap[action.ActionTarget] = (hunterTargetsMap[action.ActionTarget] || 0) + 1;
            }
          }
        });
      }

      if (gameHasTrackedActions) {
        totalGamesWithActions++;
      }
    });

    // Convert to arrays and sort
    const actionTypeCounts: ActionStat[] = TRACKED_ACTION_TYPES
      .filter(type => actionTypeCountsMap[type] > 0)
      .map(type => ({
        actionType: type,
        label: ACTION_TYPE_LABELS[type],
        count: actionTypeCountsMap[type],
        color: ACTION_TYPE_COLORS[type],
      }))
      .sort((a, b) => b.count - a.count);

    const gadgetDetails = Object.entries(gadgetCountsMap)
      .map(([gadgetName, count]) => ({ gadgetName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_LIMITS.TOP_10);

    const potionDetails = Object.entries(potionCountsMap)
      .map(([potionName, count]) => ({ potionName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_LIMITS.TOP_10);

    const hunterTargets = Object.entries(hunterTargetsMap)
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CHART_LIMITS.TOP_10);

    // Calculate average transformations per game (for wolf games)
    const totalTransforms = actionTypeCountsMap.Transform;
    const gamesWithTransforms = totalTransforms > 0 
      ? Math.max(1, filteredGameData.filter(game => {
          const playerStat = game.PlayerStats.find(
            p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
          );
          return playerStat?.Actions?.some(a => a.ActionType === 'Transform');
        }).length)
      : 0;
    const transformationsPerGame = gamesWithTransforms > 0 
      ? totalTransforms / gamesWithTransforms 
      : 0;

    return {
      actionTypeCounts,
      gadgetDetails,
      potionDetails,
      hunterTargets,
      transformationsPerGame,
      totalGamesWithActions,
      totalGamesPlayed,
    };
  }, [filteredGameData, selectedPlayerName]);

  // Check if we have any data to display
  const hasData = actionStatistics.actionTypeCounts.length > 0;

  if (!hasData) {
    return (
      <div className="donnees-manquantes">
        <p>Aucune donnée d'actions disponible pour {selectedPlayerName}.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Les données d'actions ne sont disponibles que pour les parties récentes.
        </p>
      </div>
    );
  }

  return (
    <div className="lycans-graphiques-groupe">
      {/* Summary Cards */}
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
          <h3>🎮 Parties avec actions</h3>
          <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
            {actionStatistics.totalGamesWithActions}
          </div>
          <p>sur {actionStatistics.totalGamesPlayed} parties analysées</p>
        </div>

        {actionStatistics.actionTypeCounts.find(a => a.actionType === 'Transform') && (
          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
            <h3>🐺 Transformations / partie loup</h3>
            <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
              {actionStatistics.transformationsPerGame.toFixed(1)}
            </div>
            <p>en moyenne par partie loup</p>
          </div>
        )}

        {actionStatistics.gadgetDetails.length > 0 && (
          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
            <h3>🔧 Gadgets utilisés</h3>
            <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
              {actionStatistics.gadgetDetails.reduce((sum, g) => sum + g.count, 0)}
            </div>
            <p>{actionStatistics.gadgetDetails.length} types différents</p>
          </div>
        )}

        {actionStatistics.potionDetails.length > 0 && (
          <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
            <h3>🧪 Potions bues</h3>
            <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
              {actionStatistics.potionDetails.reduce((sum, p) => sum + p.count, 0)}
            </div>
            <p>{actionStatistics.potionDetails.length} types différents</p>
          </div>
        )}
      </div>

      {/* Action Types Overview - Pie Chart */}
      {actionStatistics.actionTypeCounts.length > 0 && (
        <div className="lycans-graphique-section">
          <h3>Répartition des Types d'Actions</h3>
          <FullscreenChart title="Répartition des Types d'Actions">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionStatistics.actionTypeCounts}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry: any) => {
                      const pct = entry.percent !== undefined ? entry.percent : 0;
                      return `${entry.label}: ${entry.count} (${(pct * 100).toFixed(0)}%)`;
                    }}
                    labelLine={true}
                  >
                    {actionStatistics.actionTypeCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                            <div><strong>{dataPoint.label}</strong></div>
                            <div>{dataPoint.count} fois</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      )}

      {/* Gadget Details Bar Chart */}
      {actionStatistics.gadgetDetails.length > 0 && (
        <div className="lycans-graphique-section">
          <h3>Gadgets Utilisés</h3>
          <FullscreenChart title="Gadgets Utilisés">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actionStatistics.gadgetDetails}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="gadgetName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis 
                    label={{ value: 'Utilisations', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div><strong>{dataPoint.gadgetName}</strong></div>
                            <div>Utilisé {dataPoint.count} fois</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-color-1)">
                    {actionStatistics.gadgetDetails.map((_, index) => (
                      <Cell 
                        key={`cell-gadget-${index}`} 
                        fill={`hsl(${200 + index * 20}, 70%, 50%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      )}

      {/* Potion Details Bar Chart */}
      {actionStatistics.potionDetails.length > 0 && (
        <div className="lycans-graphique-section">
          <h3>Potions Bues</h3>
          <FullscreenChart title="Potions Bues">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actionStatistics.potionDetails}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="potionName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis 
                    label={{ value: 'Consommations', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
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
                            <div><strong>{dataPoint.potionName}</strong></div>
                            <div>Bue {dataPoint.count} fois</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-color-3)">
                    {actionStatistics.potionDetails.map((_, index) => (
                      <Cell 
                        key={`cell-potion-${index}`} 
                        fill={`hsl(${40 + index * 15}, 80%, 55%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      )}

      {/* Hunter Targets Bar Chart */}
      {actionStatistics.hunterTargets.length > 0 && (
        <div className="lycans-graphique-section">
          <h3>Cibles du Chasseur</h3>
          <FullscreenChart title="Cibles du Chasseur">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={actionStatistics.hunterTargets}
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
                    {actionStatistics.hunterTargets.map((entry, index) => (
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
        </div>
      )}
    </div>
  );
}
