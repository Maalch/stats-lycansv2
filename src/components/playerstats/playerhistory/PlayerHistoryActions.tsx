import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
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
  hunterMissedShots: number;
  hunterTotalShots: number;
  transformationsPerGame: number;
  totalGamesWithActions: number;
  totalGamesPlayed: number;
  totalNightsAsWolf: number;
  transformsPerNight: number;
}

/**
 * Parse timing string to extract the phase and number
 */
function parseTiming(timing: string | null): { phase: string; number: number } | null {
  if (!timing || typeof timing !== 'string') return null;
  
  const trimmed = timing.trim().toUpperCase();
  if (trimmed.length < 2) return null;
  
  const phase = trimmed.charAt(0);
  const number = parseInt(trimmed.slice(1), 10);
  
  if (!['J', 'N', 'M', 'U'].includes(phase) || isNaN(number) || number < 1) {
    return null;
  }
  
  return { phase, number };
}

/**
 * Calculate the number of nights a wolf player could transform in
 */
function calculateNightsAsWolf(deathTiming: string | null, endTiming: string | null): number {
  const timing = deathTiming || endTiming;
  
  if (!timing) return 0;
  
  const parsed = parseTiming(timing);
  if (!parsed) return 0;
  
  const { phase, number } = parsed;
  
  // Night phase: player dies DURING this night, count it as an opportunity
  if (phase === 'N') {
    return number;
  }
  
  // Day or Meeting phase: player completed all previous nights
  if (phase === 'J' || phase === 'M') {
    return number - 1;
  }
  
  // Unknown timing: conservative estimate
  if (phase === 'U') {
    return Math.max(0, Math.floor((number - 1) / 2));
  }
  
  return 0;
}

/**
 * Check if a player has a wolf role that can transform
 */
function isWolfRole(mainRoleInitial: string): boolean {
  const wolfRoles = ['Loup'];
  return wolfRoles.includes(mainRoleInitial);
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
        hunterMissedShots: 0,
        hunterTotalShots: 0,
        transformationsPerGame: 0,
        totalGamesWithActions: 0,
        totalGamesPlayed: 0,
        totalNightsAsWolf: 0,
        transformsPerNight: 0,
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
    let totalNightsAsWolf = 0;

    // Process each game
    filteredGameData.forEach(game => {
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (!playerStat) return; // Player not in this game
      
      totalGamesPlayed++;
      let gameHasTrackedActions = false;
      
      // Calculate nights as wolf if player has wolf role
      // Only count for modded games v0.217+ where Transform/Untransform data is available
      const gameVersion = parseFloat(game.Version || '0');
      if (isWolfRole(playerStat.MainRoleInitial) && game.Modded && gameVersion >= 0.217) {
        const nightsInThisGame = calculateNightsAsWolf(playerStat.DeathTiming, game.EndTiming);
        totalNightsAsWolf += nightsInThisGame;
      }

      // Get actions directly from PlayerStats (already merged from backend)
      const actions = playerStat.Actions || [];
      
      // Process actions
      actions.forEach((action) => {
        // Check for hunter shots (LegacyData format: HunterShoot)
        if (action.ActionType === 'HunterShoot') {
          actionTypeCountsMap.HunterShoot++;
          gameHasTrackedActions = true;
          
          // Track hunter targets (successful shots)
          if (action.ActionTarget) {
            hunterTargetsMap[action.ActionTarget] = (hunterTargetsMap[action.ActionTarget] || 0) + 1;
          }
          return; // Don't double-count as UseGadget
        }
        
        const actionType = action.ActionType as TrackedActionType;
        
        // Only track our specified action types
        if (TRACKED_ACTION_TYPES.includes(actionType)) {
          actionTypeCountsMap[actionType]++;
          gameHasTrackedActions = true;

          // Track gadget details (exclude "Balle" - weapon reloading, not a tracked action)
          if (actionType === 'UseGadget' && action.ActionName && action.ActionName !== 'Balle') {
            gadgetCountsMap[action.ActionName] = (gadgetCountsMap[action.ActionName] || 0) + 1;
          }

          // Track potion details
          if (actionType === 'DrinkPotion' && action.ActionName) {
            potionCountsMap[action.ActionName] = (potionCountsMap[action.ActionName] || 0) + 1;
          }
        }
      });

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

    // Calculate hunter shot statistics
    const hunterTotalShots = actionTypeCountsMap.HunterShoot;
    const hunterSuccessfulShots = Object.values(hunterTargetsMap).reduce((sum, count) => sum + count, 0);
    const hunterMissedShots = hunterTotalShots - hunterSuccessfulShots;

    // Calculate average transformations per game (for wolf games)
    const totalTransforms = actionTypeCountsMap.Transform;
    const gamesWithTransforms = totalTransforms > 0 
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
      ? totalTransforms / gamesWithTransforms 
      : 0;
    
    // Calculate transforms per night
    const transformsPerNight = totalNightsAsWolf > 0 
      ? totalTransforms / totalNightsAsWolf 
      : 0;

    return {
      actionTypeCounts,
      gadgetDetails,
      potionDetails,
      hunterTargets,
      hunterMissedShots,
      hunterTotalShots,
      transformationsPerGame,
      totalGamesWithActions,
      totalGamesPlayed,
      totalNightsAsWolf,
      transformsPerNight,
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
          <>
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🌙 Nuits vécues en loup</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {actionStatistics.totalNightsAsWolf}
              </div>
              <p>nuits totales jouées en loup</p>
            </div>
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🐺 Transformations / nuit</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {actionStatistics.transformsPerNight.toFixed(2)}
              </div>
              <p>transformations par nuit vécue</p>
            </div>
          </>
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
      {actionStatistics.hunterTotalShots > 0 && (
        <div className="lycans-graphique-section">
          <h3>Statistiques du Chasseur</h3>
          
          {/* Hunter Accuracy Summary */}
          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🎯 Tirs totaux</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {actionStatistics.hunterTotalShots}
              </div>
              <p>tirs effectués</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>✅ Tirs réussis</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Chasseur'] || 'var(--chart-color-2)' }}>
                {actionStatistics.hunterTotalShots - actionStatistics.hunterMissedShots}
              </div>
              <p>cibles touchées</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>❌ Tirs manqués</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--text-secondary)' }}>
                {actionStatistics.hunterMissedShots}
              </div>
              <p>tirs sans cible</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>📊 Précision</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Chasseur'] || 'var(--chart-color-2)' }}>
                {actionStatistics.hunterTotalShots > 0 
                  ? ((actionStatistics.hunterTotalShots - actionStatistics.hunterMissedShots) / actionStatistics.hunterTotalShots * 100).toFixed(1)
                  : '0'}%
              </div>
              <p>taux de réussite</p>
            </div>
          </div>
          
          {actionStatistics.hunterTargets.length > 0 && (
            <FullscreenChart title="Cibles Éliminées par le Chasseur">
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
          )}
        </div>
      )}

      {/* Transform/Untransform Statistics */}
      {(actionStatistics.actionTypeCounts.find(a => a.actionType === 'Transform') || 
        actionStatistics.actionTypeCounts.find(a => a.actionType === 'Untransform')) && (
        <div className="lycans-graphique-section">
          <h3>Habitudes de Transformation (Loup)</h3>
          
          {/* Transform/Untransform Summary */}
          <div className="lycans-resume-conteneur" style={{ marginBottom: '20px' }}>
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🐺 Transformations</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {actionStatistics.actionTypeCounts.find(a => a.actionType === 'Transform')?.count || 0}
              </div>
              <p>transformations totales</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>👤 Détransformations</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-secondary)' }}>
                {actionStatistics.actionTypeCounts.find(a => a.actionType === 'Untransform')?.count || 0}
              </div>
              <p>retours en forme humaine</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>📊 Ratio</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {(() => {
                  const transforms = actionStatistics.actionTypeCounts.find(a => a.actionType === 'Transform')?.count || 0;
                  const untransforms = actionStatistics.actionTypeCounts.find(a => a.actionType === 'Untransform')?.count || 0;
                  if (transforms === 0) return '0%';
                  return `${((untransforms / transforms) * 100).toFixed(0)}%`;
                })()}
              </div>
              <p>détransformations / transformations</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>� Nuits totales</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: 'var(--accent-primary-text)' }}>
                {actionStatistics.totalNightsAsWolf}
              </div>
              <p>nuits vécues en loup (opportunités)</p>
            </div>
            
            <div className="lycans-stat-carte" style={{ fontSize: '0.9rem' }}>
              <h3>🎯 Ratio / nuit</h3>
              <div className="lycans-valeur-principale" style={{ fontSize: '1.3rem', color: lycansColors['Loup'] || 'var(--wolf-color)' }}>
                {actionStatistics.transformsPerNight.toFixed(2)}
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
                      'Nuits vécues': actionStatistics.totalNightsAsWolf,
                      'Transformations': actionStatistics.actionTypeCounts.find(a => a.actionType === 'Transform')?.count || 0,
                      'Détransformations': actionStatistics.actionTypeCounts.find(a => a.actionType === 'Untransform')?.count || 0,
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
