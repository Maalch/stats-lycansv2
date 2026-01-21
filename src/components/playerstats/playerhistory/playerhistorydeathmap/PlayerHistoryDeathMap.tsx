import { useMemo, useState, useEffect } from 'react';
import { useCombinedFilteredRawData } from '../../../../hooks/useCombinedRawData';
import { useNavigation } from '../../../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme } from '../../../../types/api';
import { getDeathTypeColor, clusterLocationPoints, getDominantDeathType, adjustCoordinatesForMap, getMapConfig } from '../../../../hooks/utils/deathLocationUtils';
import { getPlayerCampFromRole } from '../../../../utils/datasyncExport';
import { type DeathType } from '../../../../types/deathTypes';
import { usePlayerGameHistoryFromRaw } from '../../../../hooks/usePlayerGameHistoryFromRaw';
import { DeathMapFilters } from './DeathMapFilters';
import { DeathMapZoneAnalysis } from './DeathMapZoneAnalysis';
import { DeathMapVisualization } from './DeathMapVisualization';

interface PlayerHistoryDeathMapProps {
  selectedPlayerName: string;
}

/**
 * Location data point for either deaths or kills
 */
interface LocationData {
  x: number;
  z: number;
  victimName: string;
  killerName: string | null;
  deathType: DeathType | null;
  mapName: string;
  camp: string;
  gameId: string;
  displayedGameId: string;
}

/**
 * Village map zones based on adjusted coordinates
 */
type VillageZone = 'Village Principal' | 'Ferme' | 'Village Pêcheur' | 'Ruines' | 'Reste de la Carte';

/**
 * Determine which zone of the Village map a death occurred in
 * Uses adjusted coordinates (after adjustCoordinatesForMap transformation)
 */
function getVillageZone(adjustedX: number, adjustedZ: number): VillageZone {
  // Zone boundaries based on adjusted coordinates (matching ReferenceArea highlights)
  // Village Principal: South area
  if (adjustedZ >= -250 && adjustedZ <= 100 && adjustedX >= -450 && adjustedX <= -120) {
    return 'Village Principal';
  }
  // Ferme: West area
  if (adjustedZ >= -550 && adjustedZ <= -250 && adjustedX >= -150 && adjustedX <= 150) {
    return 'Ferme';
  }
  // Village Pêcheur: East area
  if (adjustedZ >= 150 && adjustedZ <= 500 && adjustedX >= -320 && adjustedX <= 80) {
    return 'Village Pêcheur';
  }
  // Ruines: North area
  if (adjustedZ >= -220 && adjustedZ <= 200 && adjustedX >= 100 && adjustedX <= 450) {
    return 'Ruines';
  }
  // Reste de la Carte: Rest of the map
  return 'Reste de la Carte';
}

/**
 * Normalize death types by merging SURVIVALIST_NOT_SAVED into BY_WOLF
 */
function normalizeDeathType(deathType: DeathType | null): DeathType | null {
  if (deathType === 'SURVIVALIST_NOT_SAVED') {
    return 'BY_WOLF';
  }
  return deathType;
}

export function PlayerHistoryDeathMap({ selectedPlayerName }: PlayerHistoryDeathMapProps) {
  const { navigateToGameDetails } = useNavigation();
  const { gameData: filteredGameData, isLoading, error } = useCombinedFilteredRawData();
  const lycansColors = useThemeAdjustedLycansColorScheme();
  
  const [viewMode, setViewMode] = useState<'deaths' | 'kills'>('deaths');
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [clusterRadius, setClusterRadius] = useState<number>(0);
  const [hoveredZone, setHoveredZone] = useState<VillageZone | null>(null);
  const [selectedDeathTypes, setSelectedDeathTypes] = useState<string[]>([]);
  const [isDeathTypesExpanded, setIsDeathTypesExpanded] = useState<boolean>(false);

  // Get win rate stats for all camps combined
  const { data: playerHistory } = usePlayerGameHistoryFromRaw(selectedPlayerName, 'Tous les camps');

  // Get available maps with death position data for this player
  const availableMaps = useMemo(() => {
    if (!filteredGameData) return [];
    
    const mapsSet = new Set<string>();
    
    filteredGameData.forEach(game => {
      // Check if player participated in this game and has death position data
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );
      
      if (playerStat) {
        // For deaths mode: check if player has death position
        if (playerStat.DeathPosition !== null && game.MapName) {
          mapsSet.add(game.MapName);
        }
        
        // For kills mode: check if any victim of this player has death position
        game.PlayerStats.forEach(victim => {
          if (victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase() 
              && victim.DeathPosition !== null 
              && game.MapName) {
            mapsSet.add(game.MapName);
          }
        });
      }
    });
    
    // Filter to only supported maps and sort with 'Village' first
    return Array.from(mapsSet)
      .filter(map => map === 'Village' || map === 'Château')
      .sort((a, b) => {
        if (a === 'Village') return -1;
        if (b === 'Village') return 1;
        return a.localeCompare(b);
      });
  }, [filteredGameData, selectedPlayerName]);

  // Set default selected map
  const defaultMap = availableMaps.length > 0 ? availableMaps[0] : '';
  if (selectedMap === '' && defaultMap !== '') {
    setSelectedMap(defaultMap);
  }

  // Get available death types and colors from location data
  const { availableDeathTypes, deathTypeColors } = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) {
      return { availableDeathTypes: [], deathTypeColors: {} };
    }

    const deathTypesSet = new Set<DeathType>();
    const colors: Record<string, string> = {};

    filteredGameData.forEach(game => {
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );

      if (playerStat) {
        // For deaths mode
        if (playerStat.DeathPosition && playerStat.DeathType) {
          const normalized = normalizeDeathType(playerStat.DeathType as DeathType);
          if (normalized) deathTypesSet.add(normalized);
        }

        // For kills mode
        game.PlayerStats.forEach(victim => {
          if (victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase() 
              && victim.DeathPosition && victim.DeathType) {
            const normalized = normalizeDeathType(victim.DeathType as DeathType);
            if (normalized) deathTypesSet.add(normalized);
          }
        });
      }
    });

    // Map death types to colors using shared utility function
    deathTypesSet.forEach(deathType => {
      colors[deathType] = getDeathTypeColor(deathType, lycansColors);
    });

    return {
      availableDeathTypes: Array.from(deathTypesSet).sort(),
      deathTypeColors: colors
    };
  }, [filteredGameData, selectedPlayerName, lycansColors]);

  // Get color for death type - uses the pre-calculated deathTypeColors
  const getDeathColor = (deathType: string | null): string => {
    if (!deathType) return 'var(--text-secondary)';
    return deathTypeColors[deathType as DeathType] || 'var(--text-secondary)';
  };

  // Initialize selectedDeathTypes with all types except VOTED if no selection exists
  useEffect(() => {
    if (selectedDeathTypes.length === 0 && availableDeathTypes.length > 0) {
      const defaultTypes = availableDeathTypes.filter(type => type !== 'VOTED');
      setSelectedDeathTypes(defaultTypes);
    }
  }, [availableDeathTypes.length]);

  // Compute location data based on view mode
  const locationData = useMemo(() => {
    if (!filteredGameData || !selectedPlayerName) return [];
    
    const locations: LocationData[] = [];
    
    filteredGameData.forEach(game => {
      // Filter by map
      if (selectedMap && game.MapName !== selectedMap) return;
      
      const playerStat = game.PlayerStats.find(
        p => p.Username.toLowerCase() === selectedPlayerName.toLowerCase()
      );
      
      if (!playerStat) return;
      
      if (viewMode === 'deaths') {
        // Show where the player died
        if (playerStat.DeathPosition) {
          const camp = getPlayerCampFromRole(playerStat.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupWolfSubRoles: true
          });
          
          const adjusted = adjustCoordinatesForMap(
            playerStat.DeathPosition.x,
            playerStat.DeathPosition.z,
            game.MapName
          );
          
          locations.push({
            x: adjusted.x,
            z: adjusted.z,
            victimName: playerStat.Username,
            killerName: playerStat.KillerName || null,
            deathType: normalizeDeathType(playerStat.DeathType as DeathType | null),
            mapName: game.MapName,
            camp,
            gameId: game.DisplayedId,
            displayedGameId: game.DisplayedId
          });
        }
      } else {
        // Show where the player killed others
        game.PlayerStats.forEach(victim => {
          if (victim.KillerName?.toLowerCase() === selectedPlayerName.toLowerCase() 
              && victim.DeathPosition) {
            const victimCamp = getPlayerCampFromRole(victim.MainRoleInitial, {
              regroupLovers: true,
              regroupVillagers: true,
              regroupWolfSubRoles: true
            });
            
            const adjusted = adjustCoordinatesForMap(
              victim.DeathPosition.x,
              victim.DeathPosition.z,
              game.MapName
            );
            
            locations.push({
              x: adjusted.x,
              z: adjusted.z,
              victimName: victim.Username,
              killerName: selectedPlayerName,
              deathType: normalizeDeathType(victim.DeathType as DeathType | null),
              mapName: game.MapName,
              camp: victimCamp,
              gameId: game.DisplayedId,
              displayedGameId: game.DisplayedId
            });
          }
        });
      }
    });
    
    // Apply death type filter
    if (selectedDeathTypes.length > 0 && selectedDeathTypes.length < availableDeathTypes.length) {
      return locations.filter(loc => loc.deathType && selectedDeathTypes.includes(loc.deathType));
    }
    
    return locations;
  }, [filteredGameData, selectedPlayerName, viewMode, selectedMap, selectedDeathTypes, availableDeathTypes]);

  // Zone analysis for Village map (deaths mode)
  const zoneAnalysis = useMemo(() => {
    if (selectedMap !== 'Village' || viewMode !== 'deaths') {
      return null;
    }

    // Use locationData directly (already filtered by selectedDeathTypes)
    if (locationData.length === 0) {
      return null;
    }

    // Calculate player's zone distribution
    const playerZoneCounts = {
      'Village Principal': 0,
      'Ferme': 0,
      'Village Pêcheur': 0,
      'Ruines': 0,
      'Reste de la Carte': 0
    };

    locationData.forEach(loc => {
      const zone = getVillageZone(loc.x, loc.z);
      playerZoneCounts[zone] = (playerZoneCounts[zone] || 0) + 1;
    });

    // Calculate all players' zone distribution for comparison
    if (!filteredGameData) {
      return null;
    }

    const allZoneCounts = {
      'Village Principal': 0,
      'Ferme': 0,
      'Village Pêcheur': 0,
      'Ruines': 0,
      'Reste de la Carte': 0
    };

    filteredGameData.forEach(game => {
      if (game.MapName !== 'Village') return;

      game.PlayerStats.forEach(player => {
        if (!player.DeathPosition) return;

        // Apply death type filter to average calculation too (same as player data)
        const normalizedDeathType = normalizeDeathType(player.DeathType as DeathType | null);
        if (selectedDeathTypes.length > 0 && selectedDeathTypes.length < availableDeathTypes.length) {
          if (!normalizedDeathType || !selectedDeathTypes.includes(normalizedDeathType)) {
            return;
          }
        }

        const adjusted = adjustCoordinatesForMap(
          player.DeathPosition.x,
          player.DeathPosition.z,
          'Village'
        );
        const zone = getVillageZone(adjusted.x, adjusted.z);
        allZoneCounts[zone] = (allZoneCounts[zone] || 0) + 1;
      });
    });

    const totalAllDeaths = Object.values(allZoneCounts).reduce((sum, count) => sum + count, 0);
    const totalPlayerDeaths = Object.values(playerZoneCounts).reduce((sum, count) => sum + count, 0);

    if (totalAllDeaths === 0 || totalPlayerDeaths === 0) {
      return null;
    }

    // Calculate percentages and find significant deviation
    const zones: VillageZone[] = ['Village Principal', 'Village Pêcheur', 'Ferme', 'Ruines', 'Reste de la Carte'];
    let maxDeviation = 0;
    let dominantZone: Exclude<VillageZone, null> | null = null;

    const zoneStats = zones.map(zone => {
      const playerPercent = (playerZoneCounts[zone] / totalPlayerDeaths) * 100;
      const avgPercent = (allZoneCounts[zone] / totalAllDeaths) * 100;
      const deviation = playerPercent - avgPercent;

      if (deviation > maxDeviation && playerZoneCounts[zone] >= 2) { // At least 2 deaths in zone
        maxDeviation = deviation;
        dominantZone = zone;
      }

      return {
        zone,
        playerCount: playerZoneCounts[zone],
        playerPercent,
        avgPercent,
        deviation
      };
    });

    return {
      totalPlayerDeaths,
      totalAllDeaths,
      zoneStats,
      dominantZone,
      maxDeviation
    };
  }, [locationData, selectedMap, viewMode, filteredGameData, selectedDeathTypes, availableDeathTypes]);

  // Cluster nearby points
  const clusteredData = useMemo(() => {
    const clusters = clusterLocationPoints(locationData, clusterRadius);
    
    return clusters.map((cluster, index) => {
      const firstLoc = cluster.items[0];
      const dominantDeathType = getDominantDeathType(cluster.items);
      
      return {
        x: cluster.centroidX,
        z: cluster.centroidZ,
        count: cluster.items.length,
        allLocations: cluster.items,
        victimName: cluster.items.length === 1 ? firstLoc.victimName : null,
        killerName: cluster.items.length === 1 ? firstLoc.killerName : null,
        deathType: dominantDeathType,
        mapName: firstLoc.mapName,
        camp: firstLoc.camp,
        gameId: cluster.items.length === 1 ? firstLoc.gameId : null,
        displayedGameId: cluster.items.length === 1 ? firstLoc.displayedGameId : null,
        clusterIndex: index
      };
    });
  }, [locationData, clusterRadius]);

  // Get map configuration
  const mapConfig = useMemo(() => {
    return getMapConfig(selectedMap);
  }, [selectedMap]);

  // Calculate axis domains
  const { xDomain, zDomain } = useMemo(() => {
    if (mapConfig) {
      return {
        xDomain: [mapConfig.xMin, mapConfig.xMax] as [number, number],
        zDomain: [mapConfig.zMin, mapConfig.zMax] as [number, number]
      };
    }
    
    if (clusteredData.length === 0) {
      return { xDomain: [0, 100] as [number, number], zDomain: [0, 100] as [number, number] };
    }
    
    const xValues = clusteredData.map(d => d.x);
    const zValues = clusteredData.map(d => d.z);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);
    
    const xPadding = (xMax - xMin) * 0.1 || 10;
    const zPadding = (zMax - zMin) * 0.1 || 10;
    
    return {
      xDomain: [xMin - xPadding, xMax + xPadding] as [number, number],
      zDomain: [zMin - zPadding, zMax + zPadding] as [number, number]
    };
  }, [clusteredData, mapConfig]);

  // Handle click
  const handleLocationClick = (data: any) => {
    if (!data) return;
    
    const locations = data.allLocations || [data];
    
    if (locations.length === 1) {
      navigateToGameDetails({
        selectedGame: locations[0].gameId,
        fromComponent: 'Player Death Map'
      });
    } else {
      const gameIds = locations
        .map((loc: LocationData) => loc.gameId)
        .filter((id: string) => id);
      
      navigateToGameDetails({
        selectedGameIds: gameIds,
        fromComponent: 'Player Death Map'
      });
    }
  }
  // Calculate win rate for selected map only
  const selectedMapWinStats = useMemo(() => {
    if (!playerHistory?.mapStats || !selectedMap) return null;
    
    const mapStat = playerHistory.mapStats[selectedMap];
    if (!mapStat) return null;
    
    return {
      winRate: mapStat.winRate,
      wins: mapStat.wins,
      total: mapStat.appearances
    };
  }, [playerHistory, selectedMap]);

  if (isLoading) return <div className="donnees-attente">Chargement des données...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!filteredGameData) return <div className="donnees-manquantes">Aucune donnée disponible</div>;

  return (
    <div className="lycans-graphiques-groupe">
      {/* Controls */}
      <DeathMapFilters
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        availableMaps={availableMaps}
        clusterRadius={clusterRadius}
        setClusterRadius={setClusterRadius}
        availableDeathTypes={availableDeathTypes}
        selectedDeathTypes={selectedDeathTypes}
        setSelectedDeathTypes={setSelectedDeathTypes}
        deathTypeColors={deathTypeColors}
        isDeathTypesExpanded={isDeathTypesExpanded}
        setIsDeathTypesExpanded={setIsDeathTypesExpanded}
      />

      {/* Map Visualization */}
      <DeathMapVisualization
        locationData={locationData}
        clusteredData={clusteredData}
        viewMode={viewMode}
        selectedPlayerName={selectedPlayerName}
        selectedMap={selectedMap}
        mapConfig={mapConfig}
        xDomain={xDomain}
        zDomain={zDomain}
        hoveredZone={hoveredZone}
        getDeathColor={getDeathColor}
        handleLocationClick={handleLocationClick}
      />

      {/* Zone Analysis */}
      <DeathMapZoneAnalysis
        zoneAnalysis={zoneAnalysis}
        selectedMap={selectedMap}
        viewMode={viewMode}
        selectedPlayerName={selectedPlayerName}
        hoveredZone={hoveredZone}
        setHoveredZone={setHoveredZone}
      />

      {/* Win Rate Stats Display - One Line */}
      {selectedMapWinStats && (
        <div style={{ 
          flex: '1 1 100%',
          textAlign: 'center',
          padding: '0.75rem',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          marginTop: '1rem'
        }}>
          <span style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-secondary)',
            marginRight: '1rem'
          }}>
            Taux de victoire sur <strong>{selectedMap}</strong> :
          </span>
          <span style={{ 
            fontSize: '1.1rem', 
            fontWeight: 'bold',
            color: parseFloat(selectedMapWinStats.winRate) >= 50 ? 'var(--accent-tertiary)' : 'var(--chart-color-4)'
          }}>
            {selectedMapWinStats.winRate}%
          </span>
          <span style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            marginLeft: '0.5rem'
          }}>
            ({selectedMapWinStats.wins} / {selectedMapWinStats.total} victoires)
          </span>
        </div>
      )}

      {/* Legend - full width */}
      <div className="lycans-section-description" style={{ flex: '1 1 100%', marginTop: '1.5rem' }}>
        <h4>À propos de cette carte</h4>
        <p>
          Cette carte affiche {viewMode === 'deaths' 
            ? `les emplacements où ${selectedPlayerName} est mort` 
            : `les emplacements où ${selectedPlayerName} a éliminé d'autres joueurs`
          } au cours des parties.
          Les couleurs indiquent le type de mort. Cliquez sur un point pour voir les détails de la partie.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          Les points regroupés ont une petite bordure blanche.<br/>
          <strong>💀 Morts:</strong> Où le joueur a été éliminé<br/>
          <strong>⚔️ Kills:</strong> Où le joueur a éliminé d'autres joueurs
        </p>
      </div>
    </div>
  );
}
