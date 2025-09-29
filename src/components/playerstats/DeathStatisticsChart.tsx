import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDeathStatisticsFromRaw, useAvailableCampsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { getAllDeathTypes, getKillDescription, getDeathDescription, codifyDeathType, type DeathTypeCodeType } from '../../hooks/utils/deathStatisticsUtils';
import { useFilteredGameLogData } from '../../hooks/useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/gameUtils';
import { FullscreenChart } from '../common/FullscreenChart';
import { useSettings } from '../../context/SettingsContext';
import { useNavigation } from '../../context/NavigationContext';
import { minGamesOptions, useThemeAdjustedLycansColorScheme } from '../../types/api';

// Extended type for chart data with highlighting info and death type breakdown
type ChartKillerData = {
  name: string;
  value: number;
  victims: number;
  percentage: number;
  gamesPlayed: number;
  averageKillsPerGame: number;
  isHighlightedAddition?: boolean;
} & {
  // Death type breakdown for stacked bars
  [K in DeathTypeCodeType]?: number;
};

// Type for player death statistics charts
type ChartPlayerDeathData = {
  name: string;
  value: number;
  totalDeaths: number;
  gamesPlayed: number;
  deathRate: number;
  survivalRate: number;
  isHighlightedAddition?: boolean;
} & {
  // Death type breakdown for stacked bars
  [K in DeathTypeCodeType]?: number;
};

export function DeathStatisticsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathStatsSelectedCamp || 'Tous les camps'
  );
  const [minGamesForAverage, setMinGamesForAverage] = useState<number>(10);
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw(selectedCamp);
  const { data: gameLogData } = useFilteredGameLogData();
  const { settings } = useSettings();
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Get all unique death types for chart configuration
  const availableDeathTypes = useMemo(() => {
    return gameLogData ? getAllDeathTypes(gameLogData) : [];
  }, [gameLogData]);

  // Define colors for different death types
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<DeathTypeCodeType, string> = {} as Record<DeathTypeCodeType, string>;
    
    // Map death type codes to colors directly
    availableDeathTypes.forEach(deathTypeCode => {
      if (deathTypeCode === 'WEREWOLF_KILL') {
        colorMap[deathTypeCode] = lycansColors['Loup'];
      } else if (deathTypeCode === 'VOTE') {
        colorMap[deathTypeCode] = 'var(--chart-color-1)';
      } else if (deathTypeCode === 'HUNTER_SHOT') {
        colorMap[deathTypeCode] = lycansColors['Chasseur'];
      } else if (deathTypeCode === 'ZOMBIE_KILL') {
        colorMap[deathTypeCode] = lycansColors['Vaudou'];
      } else if (deathTypeCode === 'ASSASSIN_POTION' || deathTypeCode === 'HAUNTED_POTION') {
        colorMap[deathTypeCode] = lycansColors['Alchimiste'];
      } else if (deathTypeCode === 'AVENGER_KILL') {
        colorMap[deathTypeCode] = 'var(--chart-color-2)';
      } else if (deathTypeCode === 'LOVER_DEATH' || deathTypeCode === 'LOVER_WEREWOLF') {
        colorMap[deathTypeCode] = lycansColors['Amoureux'];
      } else if (deathTypeCode === 'DISCONNECT') {
        colorMap[deathTypeCode] = 'var(--chart-color-3)';
      } else if (deathTypeCode === 'SURVIVOR') {
        colorMap[deathTypeCode] = 'var(--chart-color-4)';
      }
    });
    
    // Assign colors to any death types that don't have specific colors yet
    const additionalColors = [
      'var(--accent-primary)',
      'var(--accent-secondary)',
      'var(--accent-tertiary)',
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#ffbb28'
    ];
    
    let colorIndex = 0;
    availableDeathTypes.forEach(deathTypeCode => {
      if (!colorMap[deathTypeCode]) {
        colorMap[deathTypeCode] = additionalColors[colorIndex % additionalColors.length];
        colorIndex++;
      }
    });
    
    return colorMap;
  }, [availableDeathTypes, lycansColors]);

  // Function to handle camp selection change with persistence
  const handleCampChange = (newCamp: string) => {
    setSelectedCamp(newCamp);
    updateNavigationState({ deathStatsSelectedCamp: newCamp });
  };

  // Process killer data for both total and average charts
  const { totalKillsData, averageKillsData, highlightedPlayerAddedToTotal, highlightedPlayerAddedToAverage, gamesWithKillers, totalEligibleForAverage } = useMemo(() => {
    if (!deathStats) return { 
      totalKillsData: [], 
      averageKillsData: [], 
      highlightedPlayerAddedToTotal: false, 
      highlightedPlayerAddedToAverage: false, 
      gamesWithKillers: 0,
      totalEligibleForAverage: 0
    };
    
    // Process total kills data
    const sortedByTotal = deathStats.killerStats
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 15);
    
    const highlightedPlayerInTotalTop15 = settings.highlightedPlayer && 
      sortedByTotal.some(k => k.killerName === settings.highlightedPlayer);
    
    const totalBaseData: ChartKillerData[] = sortedByTotal.map(killer => {
      const chartData: ChartKillerData = {
        name: killer.killerName,
        value: killer.kills,
        victims: killer.victims.length,
        percentage: killer.percentage,
        gamesPlayed: killer.gamesPlayed,
        averageKillsPerGame: killer.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars
      availableDeathTypes.forEach(deathTypeCode => {
        chartData[deathTypeCode] = killer.killsByDeathType[deathTypeCode] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedTotal = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInTotalTop15) {
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        const highlightedData: ChartKillerData = {
          name: highlightedKiller.killerName,
          value: highlightedKiller.kills,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars
        availableDeathTypes.forEach(deathTypeCode => {
          highlightedData[deathTypeCode] = highlightedKiller.killsByDeathType[deathTypeCode] || 0;
        });
        
        totalBaseData.push(highlightedData);
        highlightedPlayerAddedTotal = true;
      }
    }
    
    // Process average kills data (with minimum games filter)
    const eligibleForAverage = deathStats.killerStats.filter(killer => killer.gamesPlayed >= minGamesForAverage);
    const sortedByAverage = eligibleForAverage
      .sort((a, b) => b.averageKillsPerGame - a.averageKillsPerGame)
      .slice(0, 15);

    const highlightedPlayerInAverageTop15 = settings.highlightedPlayer && 
      sortedByAverage.some(k => k.killerName === settings.highlightedPlayer);
    
    const averageBaseData: ChartKillerData[] = sortedByAverage.map(killer => {
      const chartData: ChartKillerData = {
        name: killer.killerName,
        value: killer.averageKillsPerGame,
        victims: killer.victims.length,
        percentage: killer.percentage,
        gamesPlayed: killer.gamesPlayed,
        averageKillsPerGame: killer.averageKillsPerGame,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars (scaled for averages)
      availableDeathTypes.forEach(deathTypeCode => {
        const totalKills = killer.killsByDeathType[deathTypeCode] || 0;
        chartData[deathTypeCode] = killer.gamesPlayed > 0 ? totalKills / killer.gamesPlayed : 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedAverage = false;

    if (settings.highlightedPlayer && !highlightedPlayerInAverageTop15) {
      // Search for highlighted player in all stats (not just eligible)
      const highlightedKiller = deathStats.killerStats.find(k => k.killerName === settings.highlightedPlayer);
      if (highlightedKiller) {
        const highlightedData: ChartKillerData = {
          name: highlightedKiller.killerName,
          value: highlightedKiller.averageKillsPerGame,
          victims: highlightedKiller.victims.length,
          percentage: highlightedKiller.percentage,
          gamesPlayed: highlightedKiller.gamesPlayed,
          averageKillsPerGame: highlightedKiller.averageKillsPerGame,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars (scaled for averages)
        availableDeathTypes.forEach(deathTypeCode => {
          const totalKills = highlightedKiller.killsByDeathType[deathTypeCode] || 0;
          highlightedData[deathTypeCode] = highlightedKiller.gamesPlayed > 0 ? totalKills / highlightedKiller.gamesPlayed : 0;
        });
        
        averageBaseData.push(highlightedData);
        highlightedPlayerAddedAverage = true;
      }
    }
    
    return { 
      totalKillsData: totalBaseData,
      averageKillsData: averageBaseData,
      highlightedPlayerAddedToTotal: highlightedPlayerAddedTotal,
      highlightedPlayerAddedToAverage: highlightedPlayerAddedAverage,
      gamesWithKillers: deathStats.totalGames,
      totalEligibleForAverage: eligibleForAverage.length
    };
  }, [deathStats, settings.highlightedPlayer, minGamesForAverage, availableDeathTypes]);

  // Process player death data for both total deaths and survival rate charts
  const { totalDeathsData, survivalRateData, highlightedPlayerAddedToDeaths, highlightedPlayerAddedToSurvival } = useMemo(() => {
    if (!deathStats || !gameLogData) return { 
      totalDeathsData: [], 
      survivalRateData: [], 
      highlightedPlayerAddedToDeaths: false, 
      highlightedPlayerAddedToSurvival: false 
    };

    // Get player game counts from gameLogData to calculate survival rates
    // Apply the same camp filtering logic as used in deathStatisticsUtils
    const playerGameCounts: Record<string, number> = {};
    
    // Filter games to only include those with complete death information (same as in deathStatisticsUtils)
    const filteredGameData = gameLogData.filter(game => 
      !game.LegacyData || game.LegacyData.deathInformationFilled === true
    );
    
    filteredGameData.forEach(game => {
      game.PlayerStats.forEach(player => {
        const playerName = player.Username;
        
        if (!selectedCamp || selectedCamp === 'Tous les camps') {
          // No filter: count all games
          playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
        } else {
          // Filter active: only count games where player was in the filtered camp
          // Use MainRoleInitial for consistency with the new role detection logic
          const playerCamp = getPlayerCampFromRole(player.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupTraitor: false
          });
          
          if (playerCamp === selectedCamp) {
            playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
          }
        }
      });
    });

    // Process total deaths data
    const sortedByTotalDeaths = deathStats.playerDeathStats
      .sort((a, b) => b.totalDeaths - a.totalDeaths)
      .slice(0, 15);
    
    const highlightedPlayerInDeathsTop15 = settings.highlightedPlayer && 
      sortedByTotalDeaths.some(p => p.playerName === settings.highlightedPlayer);
    
    const totalDeathsBaseData: ChartPlayerDeathData[] = sortedByTotalDeaths.map(player => {
      const gamesPlayed = playerGameCounts[player.playerName] || 0;
      const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - player.totalDeaths) / gamesPlayed) * 100 : 0;
      
      const chartData: ChartPlayerDeathData = {
        name: player.playerName,
        value: player.totalDeaths,
        totalDeaths: player.totalDeaths,
        gamesPlayed: gamesPlayed,
        deathRate: player.deathRate,
        survivalRate: survivalRate,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars
      availableDeathTypes.forEach(deathType => {
        chartData[deathType] = player.deathsByType[deathType] || 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedDeaths = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInDeathsTop15) {
      const highlightedPlayer = deathStats.playerDeathStats.find(p => p.playerName === settings.highlightedPlayer);
      if (highlightedPlayer) {
        const gamesPlayed = playerGameCounts[highlightedPlayer.playerName] || 0;
        const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - highlightedPlayer.totalDeaths) / gamesPlayed) * 100 : 0;
        
        const highlightedData: ChartPlayerDeathData = {
          name: highlightedPlayer.playerName,
          value: highlightedPlayer.totalDeaths,
          totalDeaths: highlightedPlayer.totalDeaths,
          gamesPlayed: gamesPlayed,
          deathRate: highlightedPlayer.deathRate,
          survivalRate: survivalRate,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars
        availableDeathTypes.forEach(deathType => {
          highlightedData[deathType] = highlightedPlayer.deathsByType[deathType] || 0;
        });
        
        totalDeathsBaseData.push(highlightedData);
        highlightedPlayerAddedDeaths = true;
      }
    }

    // Process survival rate data (lowest death rate = highest survival rate)
    // We need to calculate survival rates for ALL players who played games, not just those who died
    const allPlayersWithStats: Record<string, { 
      playerName: string; 
      totalDeaths: number; 
      deathsByType: Partial<Record<DeathTypeCodeType, number>>; 
      gamesPlayed: number; 
      survivalRate: number;
      deathRate: number;
    }> = {};

    // First, calculate actual death counts directly from the same filtered game data
    const actualPlayerDeaths: Record<string, { totalDeaths: number; deathsByType: Partial<Record<DeathTypeCodeType, number>> }> = {};
    
    filteredGameData.forEach(game => {
      game.PlayerStats.forEach(player => {
        const playerName = player.Username;
        
        // Apply the same camp filter logic as for game counting
        const shouldCountThisPlayer = !selectedCamp || selectedCamp === 'Tous les camps' || 
          getPlayerCampFromRole(player.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupTraitor: false
          }) === selectedCamp;
          
        if (shouldCountThisPlayer && player.DeathType && player.DeathType !== 'N/A') {
          // This player died in this game
          if (!actualPlayerDeaths[playerName]) {
            actualPlayerDeaths[playerName] = { totalDeaths: 0, deathsByType: {} };
          }
          
          actualPlayerDeaths[playerName].totalDeaths++;
          
          // Use proper death type codification
          const deathTypeCode = codifyDeathType(player.DeathType);
          
          actualPlayerDeaths[playerName].deathsByType[deathTypeCode] = 
            (actualPlayerDeaths[playerName].deathsByType[deathTypeCode] || 0) + 1;
        }
      });
    });

    // Initialize all players who played games
    Object.entries(playerGameCounts).forEach(([playerName, gamesPlayed]) => {
      if (gamesPlayed >= minGamesForAverage) {
        // Get actual death count from our direct calculation
        const playerDeathData = actualPlayerDeaths[playerName];
        const totalDeaths = playerDeathData ? playerDeathData.totalDeaths : 0;
        const deathsByType = playerDeathData ? playerDeathData.deathsByType : {};
        
        const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - totalDeaths) / gamesPlayed) * 100 : 0;
        const deathRate = gamesPlayed > 0 ? totalDeaths / gamesPlayed : 0;
        
        allPlayersWithStats[playerName] = {
          playerName,
          totalDeaths,
          deathsByType,
          gamesPlayed,
          survivalRate,
          deathRate
        };
      }
    });
    
    const playersWithMinGames = Object.values(allPlayersWithStats);
    
    const sortedBySurvivalRate = playersWithMinGames
      .sort((a, b) => b.survivalRate - a.survivalRate)
      .slice(0, 15);

    const highlightedPlayerInSurvivalTop15 = settings.highlightedPlayer && 
      sortedBySurvivalRate.some(p => p.playerName === settings.highlightedPlayer);
    
    const survivalRateBaseData: ChartPlayerDeathData[] = sortedBySurvivalRate.map(player => {
      const chartData: ChartPlayerDeathData = {
        name: player.playerName,
        value: player.survivalRate,
        totalDeaths: player.totalDeaths,
        gamesPlayed: player.gamesPlayed,
        deathRate: player.deathRate,
        survivalRate: player.survivalRate,
        isHighlightedAddition: false
      };
      
      // Add death type breakdown for stacked bars (scaled by games played for rate)
      availableDeathTypes.forEach(deathType => {
        const totalDeaths = player.deathsByType[deathType] || 0;
        chartData[deathType] = player.gamesPlayed > 0 ? (totalDeaths / player.gamesPlayed) * 100 : 0;
      });
      
      return chartData;
    });
    
    let highlightedPlayerAddedSurvival = false;

    if (settings.highlightedPlayer && !highlightedPlayerInSurvivalTop15) {
      // Check if highlighted player is in our processed stats or needs to be added
      let highlightedPlayerStats = allPlayersWithStats[settings.highlightedPlayer];
      
      if (!highlightedPlayerStats) {
        // Player doesn't meet min games requirement, but we should still show them
        const gamesPlayed = playerGameCounts[settings.highlightedPlayer] || 0;
        const playerDeathData = actualPlayerDeaths[settings.highlightedPlayer];
        const totalDeaths = playerDeathData ? playerDeathData.totalDeaths : 0;
        const deathsByType = playerDeathData ? playerDeathData.deathsByType : {};
        
        const survivalRate = gamesPlayed > 0 ? ((gamesPlayed - totalDeaths) / gamesPlayed) * 100 : 0;
        const deathRate = gamesPlayed > 0 ? totalDeaths / gamesPlayed : 0;
        
        highlightedPlayerStats = {
          playerName: settings.highlightedPlayer,
          totalDeaths,
          deathsByType,
          gamesPlayed,
          survivalRate,
          deathRate
        };
      }
      
      if (highlightedPlayerStats) {
        const highlightedData: ChartPlayerDeathData = {
          name: highlightedPlayerStats.playerName,
          value: highlightedPlayerStats.survivalRate,
          totalDeaths: highlightedPlayerStats.totalDeaths,
          gamesPlayed: highlightedPlayerStats.gamesPlayed,
          deathRate: highlightedPlayerStats.deathRate,
          survivalRate: highlightedPlayerStats.survivalRate,
          isHighlightedAddition: true
        };
        
        // Add death type breakdown for stacked bars (scaled by games played for rate)
        availableDeathTypes.forEach(deathType => {
          const totalDeaths = highlightedPlayerStats.deathsByType[deathType] || 0;
          highlightedData[deathType] = highlightedPlayerStats.gamesPlayed > 0 ? (totalDeaths / highlightedPlayerStats.gamesPlayed) * 100 : 0;
        });
        
        survivalRateBaseData.push(highlightedData);
        highlightedPlayerAddedSurvival = true;
      }
    }
    
    return { 
      totalDeathsData: totalDeathsBaseData,
      survivalRateData: survivalRateBaseData,
      highlightedPlayerAddedToDeaths: highlightedPlayerAddedDeaths,
      highlightedPlayerAddedToSurvival: highlightedPlayerAddedSurvival
    };
  }, [deathStats, gameLogData, settings.highlightedPlayer, minGamesForAverage, availableDeathTypes, selectedCamp]);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!deathStats) return <div className="donnees-manquantes">Aucune donnée de mort disponible</div>;

  const TotalKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total kills from all death types
      const totalKills = availableDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Victimes totales:</strong> {totalKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de kill:
            </p>
            {availableDeathTypes.map(deathType => {
              const count = data[deathType] || 0;
              if (count === 0) return null;
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{getKillDescription(deathType)}:</strong> {count}
                </p>
              );
            })}
          </div>
          


          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection personnelle
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Joueur sélectionné
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

  const AverageKillsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;
      
      // Find the original killer stats for total kill counts
      const originalKiller = deathStats?.killerStats.find(k => k.killerName === data.name);
      
      // Calculate total average kills from all death types
      const totalAverageKills = availableDeathTypes.reduce((sum, deathTypeCode) => sum + (data[deathTypeCode] || 0), 0);
      const totalKills = originalKiller ? originalKiller.kills : Math.round(totalAverageKills * data.gamesPlayed);
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Moyenne par partie:</strong> {totalAverageKills.toFixed(2)} ({totalKills} kills /{data.gamesPlayed} games)
          </p>
           <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>         
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de kill (moyenne):
            </p>
            {availableDeathTypes.map(deathType => {
              const avgCount = data[deathType] || 0;
              if (avgCount === 0) return null;
              
              // Get total kills for this death type
              const totalKillsForDeathType = originalKiller ? 
                (originalKiller.killsByDeathType[deathType] || 0) : 
                Math.round(avgCount * data.gamesPlayed);
              
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{getKillDescription(deathType)}:</strong> {avgCount.toFixed(2)} ({totalKillsForDeathType} kills /{data.gamesPlayed} games)
                </p>
              );
            })}
          </div>
          

          {isHighlightedAddition && !meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (&lt; {minGamesForAverage} parties)
            </div>
          )}
          {isHighlightedAddition && meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (hors top 15)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Joueur sélectionné
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

  const TotalDeathsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      
      // Calculate total deaths from all death types
      const totalDeaths = availableDeathTypes.reduce((sum, deathType) => sum + (data[deathType] || 0), 0);
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Morts totales:</strong> {totalDeaths}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Taux de survie:</strong> {data.survivalRate.toFixed(1)}%
          </p>
          
          {/* Death type breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de mort:
            </p>
            {availableDeathTypes.map(deathType => {
              const count = data[deathType] || 0;
              if (count === 0) return null;
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{getDeathDescription(deathType)}:</strong> {count}
                </p>
              );
            })}
          </div>

          {isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection personnelle
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Joueur sélectionné
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

  const SurvivalRateTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.name;
      const meetsMinGames = data.gamesPlayed >= minGamesForAverage;
      
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--text-primary)',
          fontSize: '0.9rem'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: isHighlightedFromSettings ? 'var(--accent-primary)' : 'var(--text-primary)'
          }}>
            {label}
            {isHighlightedAddition && (
              <span style={{ 
                color: 'var(--accent-primary)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                marginLeft: '4px'
              }}> (🎯)</span>
            )}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Taux de survie:</strong> {data.survivalRate.toFixed(1)}% ({data.gamesPlayed - data.totalDeaths} survies / {data.gamesPlayed} parties)
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Morts totales:</strong> {data.totalDeaths}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties jouées:</strong> {data.gamesPlayed}
          </p>
          
          {/* Death rate breakdown */}
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
              Répartition par type de mort (taux %):
            </p>
            {availableDeathTypes.map(deathType => {
              const rate = data[deathType] || 0;
              if (rate === 0) return null;
              
              return (
                <p key={deathType} style={{ 
                  color: deathTypeColors[deathType], 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: deathTypeColors[deathType],
                    marginRight: '6px',
                    verticalAlign: 'middle'
                  }}></span>
                  <strong>{getDeathDescription(deathType)}:</strong> {rate.toFixed(1)}%
                </p>
              );
            })}
          </div>

          {isHighlightedAddition && !meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (&lt; {minGamesForAverage} parties)
            </div>
          )}
          {isHighlightedAddition && meetsMinGames && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Affiché via sélection (hors top 15)
            </div>
          )}
          {isHighlightedFromSettings && !isHighlightedAddition && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--accent-primary)', 
              marginTop: '0.25rem',
              fontStyle: 'italic'
            }}>
              🎯 Joueur sélectionné
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

  return (
    <div className="lycans-players-stats">
      <h2>Statistiques de Tueurs</h2>

      {/* Camp Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="camp-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Camp :
        </label>
        <select
          id="camp-select"
          value={selectedCamp}
          onChange={(e) => handleCampChange(e.target.value)}
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '0.5rem',
            fontSize: '0.9rem',
            minWidth: '150px'
          }}
        >
          <option value="Tous les camps">Tous les camps</option>
          {availableCamps?.map(camp => (
            <option key={camp} value={camp}>
              {camp}
            </option>
          ))}
        </select>
      </div>

      {/* Summary statistics using lycans styling */}
      <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
        <div className="lycans-stat-carte">
          <h3>Total des morts</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)' }}>
            {deathStats.totalDeaths}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Tueurs identifiés</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-1)' }}>
            {deathStats.killerStats.length}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Nombre de parties enregistrées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
            {gamesWithKillers}
          </div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <div>
            <h3>{selectedCamp === 'Tous les camps' ? 'Top Tueurs (Total)' : `Top Tueurs en ${selectedCamp} (Total)`}</h3>
            {highlightedPlayerAddedToTotal && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <FullscreenChart title={selectedCamp === 'Tous les camps' ? 'Top Tueurs (Total)' : `Top Tueurs en ${selectedCamp} (Total)`}>
            <div style={{ height: 440 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalKillsData}
                  margin={{ top: 60, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Nombre total de victimes', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<TotalKillsTooltip />} />
                  {availableDeathTypes.map((deathType) => (
                    <Bar
                      key={deathType}
                      dataKey={deathType}
                      name={deathType}
                      stackId="kills"
                      fill={deathTypeColors[deathType]}
                      onClick={(data) => {
                        const navigationFilters: any = {
                          selectedPlayer: data?.name,
                          fromComponent: 'Statistiques de Mort'
                        };
                        
                        // If a specific camp is selected, add camp filter
                        if (selectedCamp !== 'Tous les camps') {
                          navigationFilters.campFilter = {
                            selectedCamp: selectedCamp,
                            campFilterMode: 'all-assignments'
                          };
                        }
                        
                        navigateToGameDetails(navigationFilters);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {Math.min(15, totalKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus actifs (total)
          </p>
        </div>

        <div className="lycans-graphique-section">
          <div>
            <h3>{selectedCamp === 'Tous les camps' ? 'Top Tueurs (Moyenne par Partie)' : `Top Tueurs en ${selectedCamp} (Moyenne par partie)`}</h3>
            {highlightedPlayerAddedToAverage && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="min-games-average-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-average-select"
              value={minGamesForAverage}
              onChange={(e) => setMinGamesForAverage(Number(e.target.value))}
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
          <FullscreenChart title={selectedCamp === 'Tous les camps' ? 'Top Tueurs (Moyenne par Partie)' : `Top Tueurs en ${selectedCamp} (Moyenne par partie)`}>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={averageKillsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Moyenne de victimes par partie', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<AverageKillsTooltip />} />
                  {availableDeathTypes.map((deathType) => (
                    <Bar
                      key={deathType}
                      dataKey={deathType}
                      name={deathType}
                      stackId="averageKills"
                      fill={deathTypeColors[deathType]}
                      onClick={(data) => {
                        const navigationFilters: any = {
                          selectedPlayer: data?.name,
                          fromComponent: 'Statistiques de Mort'
                        };
                        
                        // If a specific camp is selected, add camp filter
                        if (selectedCamp !== 'Tous les camps') {
                          navigationFilters.campFilter = {
                            selectedCamp: selectedCamp,
                            campFilterMode: 'all-assignments'
                          };
                        }
                        
                        navigateToGameDetails(navigationFilters);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {Math.min(15, averageKillsData.filter(k => !k.isHighlightedAddition).length)} des tueurs les plus efficaces (sur {totalEligibleForAverage} ayant au moins {minGamesForAverage} partie{minGamesForAverage > 1 ? 's' : ''})
          </p>
        </div>

        <div className="lycans-graphique-section">
          <div>
            <h3>{selectedCamp === 'Tous les camps' ? 'Morts (Total)' : `Morts en ${selectedCamp} (Total)`}</h3>
            {highlightedPlayerAddedToDeaths && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <FullscreenChart title={selectedCamp === 'Tous les camps' ? 'Morts (Total)' : `Morts en ${selectedCamp} (Total)`}>
            <div style={{ height: 440 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalDeathsData}
                  margin={{ top: 60, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Nombre total de morts', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<TotalDeathsTooltip />} />
                  {availableDeathTypes.map((deathType) => (
                    <Bar
                      key={deathType}
                      dataKey={deathType}
                      name={deathType}
                      stackId="deaths"
                      fill={deathTypeColors[deathType]}
                      onClick={(data) => {
                        const navigationFilters: any = {
                          selectedPlayer: data?.name,
                          fromComponent: 'Statistiques de Mort'
                        };
                        
                        // If a specific camp is selected, add camp filter
                        if (selectedCamp !== 'Tous les camps') {
                          navigationFilters.campFilter = {
                            selectedCamp: selectedCamp,
                            campFilterMode: 'all-assignments'
                          };
                        }
                        
                        navigateToGameDetails(navigationFilters);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {Math.min(15, totalDeathsData.filter(d => !d.isHighlightedAddition).length)} des joueurs les plus souvent morts
          </p>
        </div>

        <div className="lycans-graphique-section">
          <div>
            <h3>Meilleurs Survivants {selectedCamp === 'Tous les camps' ? '(Total)' : ` en ${selectedCamp}`}</h3>
            {highlightedPlayerAddedToSurvival && settings.highlightedPlayer && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'var(--accent-primary)', 
                fontStyle: 'italic',
                marginTop: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <label htmlFor="min-games-survival-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. parties:
            </label>
            <select
              id="min-games-survival-select"
              value={minGamesForAverage}
              onChange={(e) => setMinGamesForAverage(Number(e.target.value))}
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
          <FullscreenChart title="Meilleurs Survivants">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={survivalRateData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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
                        fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        fontSize={settings.highlightedPlayer === payload.value ? 14 : 13}
                        fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'italic'}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis label={{ 
                    value: 'Taux de mort (%)', 
                    angle: 270, 
                    position: 'left', 
                    style: { textAnchor: 'middle' } 
                  }} />
                  <Tooltip content={<SurvivalRateTooltip />} />
                  {availableDeathTypes.map((deathType) => (
                    <Bar
                      key={deathType}
                      dataKey={deathType}
                      name={deathType}
                      stackId="survivalRate"
                      fill={deathTypeColors[deathType]}
                      onClick={(data) => {
                        const navigationFilters: any = {
                          selectedPlayer: data?.name,
                          fromComponent: 'Statistiques de Mort'
                        };
                        
                        // If a specific camp is selected, add camp filter
                        if (selectedCamp !== 'Tous les camps') {
                          navigationFilters.campFilter = {
                            selectedCamp: selectedCamp,
                            campFilterMode: 'all-assignments'
                          };
                        }
                        
                        navigateToGameDetails(navigationFilters);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {Math.min(15, survivalRateData.filter(d => !d.isHighlightedAddition).length)} des joueurs avec le plus haut taux de survie (ayant au moins {minGamesForAverage} partie{minGamesForAverage > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Insights section using lycans styling */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>Note : </strong> 
          {`Données en cours de récupération (données partielles).`}
        </p>
      </div>
    </div>
  );
}