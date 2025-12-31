import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerStatsBase } from '../../../hooks/utils/baseStatsHook';
import { useNavigation } from '../../../context/NavigationContext';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../../utils/datasyncExport';
import { getPlayerId } from '../../../utils/playerIdentification';
import { useThemeAdjustedLycansColorScheme } from '../../../types/api';
import { isVillageoisElite, getEffectivePower, VILLAGEOIS_ELITE_POWERS } from '../../../utils/roleUtils';
import type { GameLogEntry } from '../../../hooks/useCombinedRawData';

interface PlayerHistoryRolesProps {
  selectedPlayerName: string;
}

interface RoleStats {
  name: string;
  appearances: number;
  wins: number;
  winsWithoutRoleChange: number; // Wins where the role didn't change
  gamesWithoutRoleChange: number; // Games where the role didn't change
  winRate: string;
  camp?: 'Villageois' | 'Loup'; // Only for Powers
  totalGamesAllModes?: number; // Total games including non-modded (for Chasseur/Alchimiste)
  roleBreakdown?: { role: string; count: number }[]; // Breakdown by main role (for Loup powers)
}

interface PowerStats extends RoleStats {
  camp: 'Villageois' | 'Loup';
}

interface RoleData {
  villageoisPowers: PowerStats[];
  loupPowers: PowerStats[];
  secondaryRoles: RoleStats[];
}

/**
 * Compute role statistics for a specific player
 */
function computePlayerRoleStats(
  playerIdentifier: string,
  gameData: GameLogEntry[]
): RoleData | null {
  if (!playerIdentifier || playerIdentifier.trim() === '' || gameData.length === 0) {
    return null;
  }

  const villageoisPowersMap = new Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number }>();
  const loupPowersMap = new Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number; roleBreakdown: Map<string, number> }>();
  const secondaryRolesMap = new Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number }>();

  gameData.forEach((game) => {
    // Only consider modded games for power statistics
    if (!game.Modded) {
      return;
    }

    // Find the player in this game's PlayerStats by ID or username
    const playerStat = game.PlayerStats.find(
      player => getPlayerId(player) === playerIdentifier || 
                player.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );

    if (playerStat) {
      // Skip games where the player's role is "Inconnu"
      if (playerStat.MainRoleInitial === 'Inconnu') {
        return;
      }

      const playerWon = playerStat.Victorious;
      
      // Check if the player's role changed during the game
      const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const roleChanged = finalRole !== playerStat.MainRoleInitial;
      
      // Get player's camp - check for wolf family (Loup, Traître, Louveteau)
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleInitial);
      const isWolfFamily = playerCamp === 'Loup' || playerCamp === 'Traître' || playerCamp === 'Louveteau';

      // Special handling for Villageois Élite powers (Chasseur, Alchimiste, Protecteur, Disciple)
      // This handles both legacy format (MainRoleInitial === 'Chasseur') and new format (Villageois Élite + Power)
      if (playerCamp === 'Villageois' && isVillageoisElite(playerStat)) {
        const effectivePower = getEffectivePower(playerStat);
        if (effectivePower && VILLAGEOIS_ELITE_POWERS.includes(effectivePower as typeof VILLAGEOIS_ELITE_POWERS[number])) {
          const currentStats = villageoisPowersMap.get(effectivePower) || { 
            appearances: 0, 
            wins: 0, 
            winsWithoutRoleChange: 0, 
            gamesWithoutRoleChange: 0 
          };
          villageoisPowersMap.set(effectivePower, {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0),
            winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
            gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0)
          });
        }
      }
      // Process Power (only for Villageois and Loup camps)
      else if (playerStat.Power && playerStat.Power.trim() !== '' && playerStat.Power !== 'Inconnu') {
        if (playerCamp === 'Villageois') {
          const currentStats = villageoisPowersMap.get(playerStat.Power) || { 
            appearances: 0, 
            wins: 0, 
            winsWithoutRoleChange: 0, 
            gamesWithoutRoleChange: 0 
          };
          villageoisPowersMap.set(playerStat.Power, {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0),
            winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
            gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0)
          });
        } else if (isWolfFamily) {
          const currentStats = loupPowersMap.get(playerStat.Power) || { 
            appearances: 0, 
            wins: 0, 
            winsWithoutRoleChange: 0, 
            gamesWithoutRoleChange: 0,
            roleBreakdown: new Map<string, number>() 
          };
          // Track the main role (Loup, Traître, Louveteau)
          const roleBreakdown = currentStats.roleBreakdown;
          roleBreakdown.set(
            playerStat.MainRoleInitial, 
            (roleBreakdown.get(playerStat.MainRoleInitial) || 0) + 1
          );
          loupPowersMap.set(playerStat.Power, {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0),
            winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
            gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0),
            roleBreakdown: roleBreakdown
          });
        }
      }
      // No power - add to "Aucun pouvoir" category for Villageois or Loup camps
      // But skip if the power is explicitly "Inconnu" (incomplete data)
      else if ((playerCamp === 'Villageois' || isWolfFamily) && 
               playerStat.Power !== 'Inconnu') {
        if (playerCamp === 'Villageois') {
          const currentStats = villageoisPowersMap.get('Aucun pouvoir') || { 
            appearances: 0, 
            wins: 0, 
            winsWithoutRoleChange: 0, 
            gamesWithoutRoleChange: 0 
          };
          villageoisPowersMap.set('Aucun pouvoir', {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0),
            winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
            gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0)
          });
        } else {
          const currentStats = loupPowersMap.get('Aucun pouvoir') || { 
            appearances: 0, 
            wins: 0, 
            winsWithoutRoleChange: 0, 
            gamesWithoutRoleChange: 0,
            roleBreakdown: new Map<string, number>() 
          };
          const roleBreakdown = currentStats.roleBreakdown;
          roleBreakdown.set(
            playerStat.MainRoleInitial, 
            (roleBreakdown.get(playerStat.MainRoleInitial) || 0) + 1
          );
          loupPowersMap.set('Aucun pouvoir', {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0),
            winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
            gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0),
            roleBreakdown: roleBreakdown
          });
        }
      }

      // Process Secondary Role (for all camps)
      if (playerStat.SecondaryRole && playerStat.SecondaryRole.trim() !== '' && playerStat.SecondaryRole !== 'Inconnu') {
        // Skip "Inconnu" secondary role
        if (false) {
          return;
        }
        const currentStats = secondaryRolesMap.get(playerStat.SecondaryRole) || { 
          appearances: 0, 
          wins: 0, 
          winsWithoutRoleChange: 0, 
          gamesWithoutRoleChange: 0 
        };
        secondaryRolesMap.set(playerStat.SecondaryRole, {
          appearances: currentStats.appearances + 1,
          wins: currentStats.wins + (playerWon ? 1 : 0),
          winsWithoutRoleChange: currentStats.winsWithoutRoleChange + (!roleChanged && playerWon ? 1 : 0),
          gamesWithoutRoleChange: currentStats.gamesWithoutRoleChange + (!roleChanged ? 1 : 0)
        });
      }
    }
  });


  // Count total games (including non-modded) for Villageois Élite powers (Chasseur, Alchimiste, Protecteur, Disciple)
  const elitePowersTotal = new Map<string, number>();
  gameData.forEach((game) => {

    const playerStat = game.PlayerStats.find(
      player => getPlayerId(player) === playerIdentifier || 
                player.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );

    if (playerStat && isVillageoisElite(playerStat)) {
      const effectivePower = getEffectivePower(playerStat);
      if (effectivePower) {
        elitePowersTotal.set(effectivePower, (elitePowersTotal.get(effectivePower) || 0) + 1);
      }
    }
  });

  // Convert maps to sorted arrays
  const mapToArrayVillageois = (map: Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number }>): RoleStats[] => {
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        appearances: stats.appearances,
        wins: stats.wins,
        winsWithoutRoleChange: stats.winsWithoutRoleChange,
        gamesWithoutRoleChange: stats.gamesWithoutRoleChange,
        // Win rate is calculated only from games where the role didn't change
        winRate: stats.gamesWithoutRoleChange > 0 ? ((stats.winsWithoutRoleChange / stats.gamesWithoutRoleChange) * 100).toFixed(1) : '0.0',
        camp: 'Villageois' as const,
        // Add total games for Villageois Élite powers (Chasseur, Alchimiste, Protecteur, Disciple)
        ...(elitePowersTotal.has(name) && { totalGamesAllModes: elitePowersTotal.get(name) })
      }))
      .sort((a, b) => b.appearances - a.appearances);
  };

  const mapToArrayLoup = (map: Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number; roleBreakdown: Map<string, number> }>): RoleStats[] => {
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        appearances: stats.appearances,
        wins: stats.wins,
        winsWithoutRoleChange: stats.winsWithoutRoleChange,
        gamesWithoutRoleChange: stats.gamesWithoutRoleChange,
        // Win rate is calculated only from games where the role didn't change
        winRate: stats.gamesWithoutRoleChange > 0 ? ((stats.winsWithoutRoleChange / stats.gamesWithoutRoleChange) * 100).toFixed(1) : '0.0',
        camp: 'Loup' as const,
        // Convert Map to array for role breakdown
        roleBreakdown: Array.from(stats.roleBreakdown.entries())
          .map(([role, count]) => ({ role, count }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.appearances - a.appearances);
  };

  const mapToArraySecondary = (map: Map<string, { appearances: number; wins: number; winsWithoutRoleChange: number; gamesWithoutRoleChange: number }>): RoleStats[] => {
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        appearances: stats.appearances,
        wins: stats.wins,
        winsWithoutRoleChange: stats.winsWithoutRoleChange,
        gamesWithoutRoleChange: stats.gamesWithoutRoleChange,
        // Win rate is calculated only from games where the role didn't change
        winRate: stats.gamesWithoutRoleChange > 0 ? ((stats.winsWithoutRoleChange / stats.gamesWithoutRoleChange) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.appearances - a.appearances);
  };

  return {
    villageoisPowers: mapToArrayVillageois(villageoisPowersMap) as PowerStats[],
    loupPowers: mapToArrayLoup(loupPowersMap) as PowerStats[],
    secondaryRoles: mapToArraySecondary(secondaryRolesMap)
  };
}

export function PlayerHistoryRoles({ selectedPlayerName }: PlayerHistoryRolesProps) {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();
  const [chartMode, setChartMode] = useState<'appearances' | 'winRate'>(
    navigationState.playerHistoryRolesState?.chartMode || 'appearances'
  );
  
  const { data, isLoading, error } = usePlayerStatsBase((gameData) => 
    computePlayerRoleStats(selectedPlayerName, gameData)
  );

  // Save state to navigation context when it changes
  useEffect(() => {
    if (!navigationState.playerHistoryRolesState || 
        navigationState.playerHistoryRolesState.chartMode !== chartMode) {
      updateNavigationState({
        playerHistoryRolesState: {
          chartMode
        }
      });
    }
  }, [chartMode, navigationState.playerHistoryRolesState, updateNavigationState]);

  // Function to handle chart mode change with persistence
  const handleChartModeChange = (newMode: 'appearances' | 'winRate') => {
    setChartMode(newMode);
    updateNavigationState({
      playerHistoryRolesState: {
        chartMode: newMode
      }
    });
  };

  // Prepare chart data with visibility threshold
  const chartData = useMemo(() => {
    if (!data) return { villageoisPowers: [], loupPowers: [], secondaryRoles: [] };

    // Only show roles with at least 1 appearance
    const MIN_APPEARANCES = 1;
    // For secondary roles, show all if there are any (even with 1 appearance) since they're rarer
    const MIN_SECONDARY_APPEARANCES = 1;
    // Limit all charts to top 15 entries
    const MAX_ENTRIES = 15;

    // Sort function based on chart mode
    const sortFunction = chartMode === 'winRate' 
      ? (a: RoleStats, b: RoleStats) => parseFloat(b.winRate) - parseFloat(a.winRate)
      : (a: RoleStats, b: RoleStats) => b.appearances - a.appearances;

    // Add winRateDisplay for visibility (minimum 1% for 0% win rates)
    const addWinRateDisplay = (role: RoleStats) => ({
      ...role,
      winRateDisplay: Math.max(parseFloat(role.winRate), 1)
    });

    return {
      villageoisPowers: data.villageoisPowers
        .filter(r => r.appearances >= MIN_APPEARANCES)
        .map(addWinRateDisplay)
        .sort(sortFunction)
        .slice(0, MAX_ENTRIES),
      loupPowers: data.loupPowers
        .filter(r => r.appearances >= MIN_APPEARANCES)
        .map(addWinRateDisplay)
        .sort(sortFunction)
        .slice(0, MAX_ENTRIES),
      secondaryRoles: data.secondaryRoles
        .filter(r => r.appearances >= MIN_SECONDARY_APPEARANCES)
        .map(addWinRateDisplay)
        .sort(sortFunction)
        .slice(0, MAX_ENTRIES)
    };
  }, [data, chartMode]);

  if (isLoading) {
    return <div className="donnees-attente">Chargement de l'historique des rôles...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée de rôle disponible</div>;
  }

  const hasVillageoisPowers = chartData.villageoisPowers.length > 0;
  const hasLoupPowers = chartData.loupPowers.length > 0;
  const hasSecondaryRoles = chartData.secondaryRoles.length > 0;

  if (!hasVillageoisPowers && !hasLoupPowers && !hasSecondaryRoles) {
    return <div className="donnees-manquantes">Aucun pouvoir ou rôle secondaire trouvé</div>;
  }

  // Custom tooltip component (defined outside return for reusability)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const dataPoint = payload[0].payload;
      const hasRoleChanges = dataPoint.gamesWithoutRoleChange < dataPoint.appearances;
      
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          padding: 12, 
          borderRadius: 8,
          border: '1px solid var(--border-color)'
        }}>
          <div><strong>{dataPoint.name}</strong></div>
          <div>Apparitions: {dataPoint.appearances}</div>
          {hasRoleChanges && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
              dont {dataPoint.appearances - dataPoint.gamesWithoutRoleChange} avec changement de rôle (exclu du calcul)
            </div>
          )}
          <div>Victoires: {dataPoint.winsWithoutRoleChange}</div>
          <div><strong>Taux de victoire: {dataPoint.winRate}%</strong></div>
          {dataPoint.totalGamesAllModes && dataPoint.totalGamesAllModes !== dataPoint.appearances && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              (Total avec parties non moddées: {dataPoint.totalGamesAllModes})
            </div>
          )}
          {dataPoint.roleBreakdown && dataPoint.roleBreakdown.length > 0 && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <div style={{ fontStyle: 'italic' }}>Répartition par rôle:</div>
              {dataPoint.roleBreakdown.map((rb: { role: string; count: number }, idx: number) => (
                <div key={idx} style={{ marginLeft: '0.5rem' }}>
                  • {rb.role}: {rb.count}
                </div>
              ))}
            </div>
          )}
          <div style={{ 
            fontSize: '0.8rem', 
            color: 'var(--accent-primary)', 
            marginTop: '0.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            🖱️ Cliquez pour voir les parties
          </div>
        </div>
      );
    }
    return null;
  };

  // Common chart render function
  const renderRoleChart = (
    chartDataArray: RoleStats[],
    title: string,
    barColor: string,
    onBarClick: (roleName: string) => void,
    getBarColor?: (roleName: string, index: number) => string
  ) => {
    // Use winRateDisplay for chart display in winRate mode (shows 1% minimum for 0%)
    const dataKey = chartMode === 'appearances' ? 'appearances' : 'winRateDisplay';
    const yAxisLabel = chartMode === 'appearances' ? 'Nombre d\'apparitions' : 'Taux de victoire (%)';
    const yAxisDomain = chartMode === 'winRate' ? [0, 100] : undefined;

    return (
      <div className="lycans-graphique-section">
        <h3>{title}</h3>
        <FullscreenChart title={title}>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataArray}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  fontSize={14}
                />
                <YAxis 
                  label={{ value: yAxisLabel, angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                  domain={yAxisDomain}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={dataKey}
                  label={chartMode === 'winRate' ? (props: any) => {
                    // Add percentage labels on top of bars for win rate mode
                    const { x, y, width, payload } = props;
                    if (x === undefined || y === undefined || width === undefined || !payload) return null;
                    const percentage = payload.winRate || '0';
                    return (
                      <text 
                        x={(x as number) + (width as number) / 2} 
                        y={(y as number) - 5} 
                        fill="var(--text-primary)" 
                        textAnchor="middle" 
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {percentage}%
                      </text>
                    );
                  } : undefined}
                >
                  {chartDataArray.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor ? getBarColor(entry.name, index) : barColor}
                      onClick={() => onBarClick(entry.name)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      </div>
    );
  };

  return (
    <>
      {/* Chart Mode Filter - placed above all charts */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="chart-mode-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Affichage :
        </label>
        <select
          id="chart-mode-select"
          value={chartMode}
          onChange={(e) => handleChartModeChange(e.target.value as 'appearances' | 'winRate')}
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '0.5rem',
            fontSize: '0.9rem',
            minWidth: '180px'
          }}
        >
          <option value="appearances">Apparitions</option>
          <option value="winRate">Taux de victoire</option>
        </select>
      </div>

      <div className="lycans-graphiques-groupe">
        {hasVillageoisPowers && renderRoleChart(
        chartData.villageoisPowers,
        'Camp Villageois',
        'var(--chart-color-1)',
        (powerName) => {
          // Navigate to game details showing games with this power for the selected player
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            campFilter: {
              selectedCamp: 'Villageois',
              campFilterMode: chartMode === 'winRate' ? 'wins-only' : 'all-assignments'
            },
            selectedPower: powerName,
            fromComponent: `Historique des Rôles - Pouvoir: ${powerName}`
          });
        },
        (roleName) => {
          // Use lycans color scheme for Chasseur and Alchimiste
          if (roleName === 'Chasseur' && lycansColorScheme['Chasseur']) {
            return lycansColorScheme['Chasseur'];
          }
          if (roleName === 'Alchimiste' && lycansColorScheme['Alchimiste']) {
            return lycansColorScheme['Alchimiste'];
          }
          if (roleName === 'Protecteur' && lycansColorScheme['Protecteur']) {
            return lycansColorScheme['Protecteur'];
          }
          if (roleName === 'Disciple' && lycansColorScheme['Disciple']) {
            return lycansColorScheme['Disciple'];
          }
            
          // Default color for other powers
          return 'var(--chart-color-1)';
        }
      )}

      {hasLoupPowers && renderRoleChart(
        chartData.loupPowers,
        'Camp Loups',
        'var(--chart-color-2)',
        (powerName) => {
          // Navigate to game details showing games with this power for the selected player
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            campFilter: {
              selectedCamp: 'Loup',
              campFilterMode: chartMode === 'winRate' ? 'wins-only' : 'all-assignments'
            },
            selectedPower: powerName,
            fromComponent: `Historique des Rôles - Pouvoir: ${powerName}`
          });
        },
        () => {
          // Use lycans "Loup" color for all bars in this chart
          return lycansColorScheme['Loup'] || 'var(--chart-color-2)';
        }
      )}

      {hasSecondaryRoles && renderRoleChart(
        chartData.secondaryRoles,
        'Rôles Secondaires',
        'var(--chart-color-3)',
        (secondaryRoleName) => {
          // Navigate to game details showing games with this secondary role for the selected player
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            selectedSecondaryRole: secondaryRoleName,
            fromComponent: `Historique des Rôles - Rôle Secondaire: ${secondaryRoleName}`
          });
        }
      )}

        <div style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text-secondary)', 
          fontStyle: 'italic',
          marginTop: '16px',
          padding: '8px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          ℹ️ Les victoires et le taux de victoire excluent les parties où le rôle principal a changé en cours de partie (ex: Garde en Chasseur, réssucité en Zombie par un Vaudou, etc...).
        </div>
      </div>
    </>
  );
}
