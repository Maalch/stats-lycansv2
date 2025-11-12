import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerStatsBase } from '../../../hooks/utils/baseStatsHook';
import { useNavigation } from '../../../context/NavigationContext';
import { useSettings } from '../../../context/SettingsContext';
import { FullscreenChart } from '../../common/FullscreenChart';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../../utils/datasyncExport';
import { getPlayerId } from '../../../utils/playerIdentification';
import type { GameLogEntry } from '../../../hooks/useCombinedRawData';

interface PlayerHistoryRolesProps {
  selectedPlayerName: string;
}

interface RoleStats {
  name: string;
  appearances: number;
  wins: number;
  winRate: string;
  camp?: 'Villageois' | 'Loup'; // Only for Powers
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

  const villageoisPowersMap = new Map<string, { appearances: number; wins: number }>();
  const loupPowersMap = new Map<string, { appearances: number; wins: number }>();
  const secondaryRolesMap = new Map<string, { appearances: number; wins: number }>();

  gameData.forEach((game) => {
    // Find the player in this game's PlayerStats by ID or username
    const playerStat = game.PlayerStats.find(
      player => getPlayerId(player) === playerIdentifier || 
                player.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );

    if (playerStat) {
      const playerWon = playerStat.Victorious;
      
      // Get player's final role and camp
      const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const playerCamp = getPlayerCampFromRole(finalRole);

      // Process Power (only for Villageois and Loup camps)
      if (playerStat.Power && playerStat.Power.trim() !== '') {
        if (playerCamp === 'Villageois') {
          const currentStats = villageoisPowersMap.get(playerStat.Power) || { appearances: 0, wins: 0 };
          villageoisPowersMap.set(playerStat.Power, {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0)
          });
        } else if (playerCamp === 'Loup') {
          const currentStats = loupPowersMap.get(playerStat.Power) || { appearances: 0, wins: 0 };
          loupPowersMap.set(playerStat.Power, {
            appearances: currentStats.appearances + 1,
            wins: currentStats.wins + (playerWon ? 1 : 0)
          });
        }
      }

      // Process Secondary Role (for all camps)
      if (playerStat.SecondaryRole && playerStat.SecondaryRole.trim() !== '') {
        const currentStats = secondaryRolesMap.get(playerStat.SecondaryRole) || { appearances: 0, wins: 0 };
        secondaryRolesMap.set(playerStat.SecondaryRole, {
          appearances: currentStats.appearances + 1,
          wins: currentStats.wins + (playerWon ? 1 : 0)
        });
      }
    }
  });

  // Convert maps to sorted arrays
  const mapToArray = (map: Map<string, { appearances: number; wins: number }>, camp?: 'Villageois' | 'Loup'): RoleStats[] => {
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        appearances: stats.appearances,
        wins: stats.wins,
        winRate: stats.appearances > 0 ? ((stats.wins / stats.appearances) * 100).toFixed(1) : '0.0',
        ...(camp && { camp })
      }))
      .sort((a, b) => b.appearances - a.appearances);
  };

  return {
    villageoisPowers: mapToArray(villageoisPowersMap, 'Villageois') as PowerStats[],
    loupPowers: mapToArray(loupPowersMap, 'Loup') as PowerStats[],
    secondaryRoles: mapToArray(secondaryRolesMap)
  };
}

export function PlayerHistoryRoles({ selectedPlayerName }: PlayerHistoryRolesProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { data, isLoading, error } = usePlayerStatsBase((gameData) => 
    computePlayerRoleStats(selectedPlayerName, gameData)
  );

  // Prepare chart data with visibility threshold
  const chartData = useMemo(() => {
    if (!data) return { villageoisPowers: [], loupPowers: [], secondaryRoles: [] };

    // Only show roles with at least 2 appearances for cleaner visualization
    const MIN_APPEARANCES = 2;

    return {
      villageoisPowers: data.villageoisPowers.filter(r => r.appearances >= MIN_APPEARANCES),
      loupPowers: data.loupPowers.filter(r => r.appearances >= MIN_APPEARANCES),
      secondaryRoles: data.secondaryRoles.filter(r => r.appearances >= MIN_APPEARANCES)
    };
  }, [data]);

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
    return <div className="donnees-manquantes">Aucun pouvoir ou rôle secondaire trouvé (minimum 2 apparitions)</div>;
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
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
          <div><strong>{dataPoint.name}</strong></div>
          <div>Apparitions: {dataPoint.appearances}</div>
          <div>Victoires: {dataPoint.wins}</div>
          <div>Taux de victoire: {dataPoint.winRate}%</div>
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
    onBarClick: (roleName: string) => void
  ) => (
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
                fontSize={12}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor="end"
                    transform={`rotate(-45, ${x}, ${y})`}
                    fill={settings.highlightedPlayer === selectedPlayerName ? 'var(--text-primary)' : 'var(--text-secondary)'}
                    fontSize={12}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <YAxis 
                label={{ value: 'Nombre d\'apparitions', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="appearances">
                {chartDataArray.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={barColor}
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

  return (
    <div className="lycans-graphiques-groupe">
      {hasVillageoisPowers && renderRoleChart(
        chartData.villageoisPowers,
        'Pouvoirs Villageois',
        'var(--chart-color-1)',
        (powerName) => {
          // Navigate to game details showing all games with this power in Villageois camp
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            campFilter: {
              selectedCamp: 'Villageois',
              campFilterMode: 'all-assignments'
            },
            fromComponent: `Historique des Rôles - Pouvoir: ${powerName}`
          });
        }
      )}

      {hasLoupPowers && renderRoleChart(
        chartData.loupPowers,
        'Pouvoirs Loups',
        'var(--chart-color-2)',
        (powerName) => {
          // Navigate to game details showing all games with this power in Loup camp
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            campFilter: {
              selectedCamp: 'Loup',
              campFilterMode: 'all-assignments'
            },
            fromComponent: `Historique des Rôles - Pouvoir: ${powerName}`
          });
        }
      )}

      {hasSecondaryRoles && renderRoleChart(
        chartData.secondaryRoles,
        'Rôles Secondaires',
        'var(--chart-color-3)',
        (secondaryRoleName) => {
          // Navigate to game details showing all games with this secondary role
          navigateToGameDetails({
            selectedPlayer: selectedPlayerName,
            fromComponent: `Historique des Rôles - Rôle Secondaire: ${secondaryRoleName}`
          });
        }
      )}
    </div>
  );
}
