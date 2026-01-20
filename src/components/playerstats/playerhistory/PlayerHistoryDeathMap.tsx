import { useMemo, useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useNavigation } from '../../../context/NavigationContext';
import { getMapConfig, adjustCoordinatesForMap, clusterLocationPoints, getDominantDeathType, getDeathTypeColor } from '../../../hooks/utils/deathLocationUtils';
import { getPlayerCampFromRole } from '../../../utils/datasyncExport';
import { getDeathTypeLabel, type DeathType } from '../../../types/deathTypes';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useThemeAdjustedLycansColorScheme } from '../../../types/api';

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

  // Zone analysis for Village map (deaths mode, excluding votes)
  const zoneAnalysis = useMemo(() => {
    if (selectedMap !== 'Village' || viewMode !== 'deaths') {
      return null;
    }

    // Filter to exclude VOTED deaths
    const nonVoteDeaths = locationData.filter(loc => loc.deathType !== 'VOTED');

    if (nonVoteDeaths.length === 0) {
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

    nonVoteDeaths.forEach(loc => {
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
        if (!player.DeathPosition || player.DeathType === 'VOTED') return;

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
  }, [locationData, selectedMap, viewMode, filteredGameData]);

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const locations = data.allLocations || [data];
    const isMultiple = locations.length > 1;
    
    if (isMultiple) {
      const victimCounts = new Map<string, number>();
      const deathTypeCounts = new Map<string, number>();
      const uniqueGames = new Set<string>();
      
      locations.forEach((loc: LocationData) => {
        victimCounts.set(loc.victimName, (victimCounts.get(loc.victimName) || 0) + 1);
        const label = loc.deathType ? getDeathTypeLabel(loc.deathType) : 'Inconnu';
        deathTypeCounts.set(label, (deathTypeCounts.get(label) || 0) + 1);
        uniqueGames.add(loc.gameId);
      });
      
      const topVictims = Array.from(victimCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      const topDeathTypes = Array.from(deathTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      return (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          maxWidth: '350px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            fontSize: '1rem',
            color: 'var(--accent-primary-text)'
          }}>
            {viewMode === 'deaths' ? '💀' : '⚔️'} {locations.length} {viewMode === 'deaths' ? 'morts' : 'kills'} à cet endroit
          </div>
          
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>{viewMode === 'deaths' ? 'Par:' : 'Victimes:'}</strong>
              {topVictims.map(([name, count]) => (
                <div key={name} style={{ paddingLeft: '0.5rem' }}>
                  • {viewMode === 'kills' ? name : name} ({count}x)
                </div>
              ))}
              {victimCounts.size > 3 && (
                <div style={{ paddingLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                  +{victimCounts.size - 3} autres...
                </div>
              )}
            </div>
            
            <div>
              <strong>Types de mort:</strong>
              {topDeathTypes.map(([type, count]) => (
                <div key={type} style={{ paddingLeft: '0.5rem' }}>
                  • {type} ({count}x)
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              📍 {uniqueGames.size} partie{uniqueGames.size > 1 ? 's' : ''} différente{uniqueGames.size > 1 ? 's' : ''}
            </div>
          </div>
          
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            Cliquez pour voir les parties concernées
          </div>
        </div>
      );
    }
    
    const singleLoc = locations[0];
    return (
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        maxWidth: '300px'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '8px', 
          fontSize: '1rem',
          color: 'var(--accent-primary-text)'
        }}>
          {viewMode === 'deaths' ? '💀' : '⚔️'} {viewMode === 'deaths' ? 'Mort de' : 'Kill de'} {selectedPlayerName}
        </div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          {viewMode === 'deaths' ? (
            <>
              <div>🎯 <strong>Tué par:</strong> {singleLoc.killerName || 'Inconnu'}</div>
              <div>⚰️ <strong>Cause:</strong> {singleLoc.deathType ? getDeathTypeLabel(singleLoc.deathType) : 'Inconnue'}</div>
            </>
          ) : (
            <>
              <div>🎯 <strong>Victime:</strong> {singleLoc.victimName}</div>
              <div>⚰️ <strong>Cause:</strong> {singleLoc.deathType ? getDeathTypeLabel(singleLoc.deathType) : 'Inconnue'}</div>
              <div>👥 <strong>Camp victime:</strong> {singleLoc.camp}</div>
            </>
          )}
          <div>🗺️ <strong>Carte:</strong> {singleLoc.mapName}</div>
          <div>🎮 <strong>Partie:</strong> #{singleLoc.gameId}</div>
        </div>
        
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          Cliquez pour voir les détails de la partie
        </div>
      </div>
    );
  };

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
  };

  if (isLoading) return <div className="donnees-attente">Chargement des données...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!filteredGameData) return <div className="donnees-manquantes">Aucune donnée disponible</div>;

  return (
    <div className="lycans-graphiques-groupe">
      {/* Controls - above everything, full width */}
      <div style={{ flex: '1 1 100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Afficher :
          </label>
          <div style={{ 
            display: 'flex', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('deaths')}
              style={{
                background: viewMode === 'deaths' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'deaths' ? 'white' : 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'deaths' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              💀 Morts
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kills')}
              style={{
                background: viewMode === 'kills' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'kills' ? 'white' : 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'kills' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              ⚔️ Kills
            </button>
          </div>
        </div>

        {/* Map Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="player-map-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Carte :
          </label>
          <select
            id="player-map-select"
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.5rem',
              fontSize: '0.9rem',
              minWidth: '120px'
            }}
          >
            {availableMaps.map(map => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
        </div>

        {/* Cluster Radius */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="cluster-slider" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Regroupement :
          </label>
          <input
            id="cluster-slider"
            type="range"
            min="0"
            max="50"
            step="5"
            value={clusterRadius}
            onChange={(e) => setClusterRadius(parseInt(e.target.value))}
            style={{ width: '80px' }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '60px' }}>
            {clusterRadius === 0 ? 'Aucun' : `${clusterRadius} unité${clusterRadius > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Multi-select death type filter - collapsible */}
        <div style={{ width: '100%', marginTop: '1rem' }}>
          {/* Clickable header to expand/collapse */}
          <div 
            onClick={() => setIsDeathTypesExpanded(!isDeathTypesExpanded)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              marginBottom: isDeathTypesExpanded ? '0.5rem' : '0',
              cursor: 'pointer',
              padding: '0.5rem',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ 
              color: 'var(--text-primary)', 
              fontSize: '1rem',
              transition: 'transform 0.2s',
              transform: isDeathTypesExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            <label style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.9rem', 
              fontWeight: 'bold',
              cursor: 'pointer',
              flexGrow: 1
            }}>
              Types de mort
            </label>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.85rem'
            }}>
              {selectedDeathTypes.length} / {availableDeathTypes.length} sélectionné{selectedDeathTypes.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Expanded content with bulk buttons and checkbox grid */}
          {isDeathTypesExpanded && (
            <>
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                marginTop: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeathTypes(availableDeathTypes);
                  }}
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeathTypes([]);
                  }}
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Aucun
                </button>
              </div>
              
              {/* Checkbox grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.5rem',
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '0.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}>
                {availableDeathTypes.map(deathType => {
                  const isSelected = selectedDeathTypes.includes(deathType);
                  const color = deathTypeColors[deathType] || 'var(--chart-primary)';
                  
                  return (
                    <label
                      key={deathType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                        borderRadius: '4px',
                        border: `1px solid ${isSelected ? color : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setSelectedDeathTypes(prev => prev.filter(t => t !== deathType));
                        } else {
                          setSelectedDeathTypes(prev => [...prev, deathType]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by label onClick
                        style={{ cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: color,
                          flexShrink: 0
                        }}
                      />
                      <span>{getDeathTypeLabel(deathType)}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zone Analysis - prominent display for Village map */}
      {zoneAnalysis && selectedMap === 'Village' && viewMode === 'deaths' && (
        <div style={{ 
          flex: '1 1 100%', 
          marginBottom: '0rem',
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          borderRadius: '12px', 
          border: '2px solid var(--accent-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{ 
            marginTop: 0,
            marginBottom: '1rem', 
            color: 'var(--accent-primary)',
            fontSize: '1.3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📊 Analyse par zone (Village)
          </h3>
          <p style={{ 
            fontSize: '0.95rem', 
            marginBottom: '1rem', 
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            Distribution des morts (hors votes) comparée à la moyenne de tous les joueurs:
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1rem' 
          }}>
            {zoneAnalysis.zoneStats.map(stat => {
              const isHighlight = stat.zone === zoneAnalysis.dominantZone && zoneAnalysis.maxDeviation > 10;
              return (
                <div 
                  key={stat.zone}
                  onMouseEnter={() => setHoveredZone(stat.zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ 
                    padding: '1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '8px',
                    border: hoveredZone === stat.zone ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: isHighlight ? 'white' : 'var(--text-primary)'
                  }}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem'
                  }}>
                    {stat.zone}
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <div>{selectedPlayerName}: <strong>{stat.playerPercent.toFixed(1)}%</strong> ({stat.playerCount})</div>
                    <div style={{ opacity: 0.85 }}>Moyenne: {stat.avgPercent.toFixed(1)}%</div>
                    <div style={{ 
                      marginTop: '0.25rem',
                      color: isHighlight ? 'white' : (stat.deviation > 0 ? 'var(--accent-secondary)' : 'var(--text-secondary)'),
                      fontWeight: Math.abs(stat.deviation) > 5 ? 'bold' : 'normal'
                    }}>
                      {stat.deviation > 0 ? '+' : ''}{stat.deviation.toFixed(1)}% vs moyenne
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {zoneAnalysis.dominantZone && zoneAnalysis.maxDeviation > 10 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem',
              fontSize: '0.95rem', 
              color: 'var(--accent-primary)', 
              fontWeight: 'bold',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '2px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <span>
                {selectedPlayerName} meurt significativement plus souvent en zone {zoneAnalysis.dominantZone} 
                ({'+' + zoneAnalysis.maxDeviation.toFixed(1)}% par rapport à la moyenne)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Map Visualization - full width section */}
      <div className="lycans-graphique-section" style={{ flex: '1 1 100%', minWidth: '100%' }}>
        {locationData.length > 0 ? (
          <FullscreenChart title={viewMode === 'deaths' ? `Carte des Morts de ${selectedPlayerName}` : `Carte des Kills de ${selectedPlayerName}`}>
            {/* Aspect ratio: map is 1640:922 ≈ 1.78:1, so height = width / 1.78 */}
            <div style={{ width: '100%', margin: '0 auto', aspectRatio: '1640 / 922' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                {/* Map background image */}
                {mapConfig && (
                  <ReferenceArea
                    x1={mapConfig.zMin}
                    x2={mapConfig.zMax}
                    y1={mapConfig.xMin}
                    y2={mapConfig.xMax}
                    fill="transparent"
                    stroke="none"
                    shape={(props: any) => {
                      const { x, y, width, height } = props;
                      return (
                        <image
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          href={mapConfig.src}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ opacity: 0.85 }}
                        />
                      );
                    }}
                  />
                )}
                
                {/* Zone highlights for Village map */}
                {selectedMap === 'Village' && hoveredZone && (
                  <>
                    {hoveredZone === 'Ruines' && (
                      <ReferenceArea
                        x1={-220}
                        x2={200}
                        y1={100}
                        y2={450}
                        fill="var(--accent-primary)"
                        fillOpacity={0.2}
                        stroke="var(--accent-primary)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                      />
                    )}
                    {hoveredZone === 'Village Principal' && (
                      <ReferenceArea
                        x1={-250}
                        x2={100}
                        y1={-120}
                        y2={-450}
                        fill="var(--accent-primary)"
                        fillOpacity={0.2}
                        stroke="var(--accent-primary)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                      />
                    )}
                    {hoveredZone === 'Ferme' && (
                      <ReferenceArea
                        x1={-550}
                        x2={-250}
                        y1={150}
                        y2={-150}
                        fill="var(--accent-primary)"
                        fillOpacity={0.2}
                        stroke="var(--accent-primary)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                      />
                    )}
                    {hoveredZone === 'Village Pêcheur' && (
                      <ReferenceArea
                        x1={150}
                        x2={500}
                        y1={80}
                        y2={-320}
                        fill="var(--accent-primary)"
                        fillOpacity={0.2}
                        stroke="var(--accent-primary)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                      />
                    )}
                    {hoveredZone === 'Reste de la Carte' && (
                      <ReferenceArea
                        x1={mapConfig?.zMin ?? -600}
                        x2={mapConfig?.zMax ?? 600}
                        y1={mapConfig?.xMin ?? -500}
                        y2={mapConfig?.xMax ?? 500}
                        fill="var(--accent-primary)"
                        fillOpacity={0.15}
                        stroke="var(--accent-primary)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                  </>
                )}
                
                <CartesianGrid strokeDasharray="3 3" stroke={mapConfig ? 'rgba(255,255,255,0.3)' : 'var(--border-color)'} />
                <XAxis 
                  dataKey="z" 
                  type="number"
                  name="Position Z"
                  domain={zDomain}
                  hide={true}
                />
                <YAxis 
                  dataKey="x"
                  type="number"
                  name="Position X"
                  domain={xDomain}
                  hide={true}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  data={clusteredData}
                  onClick={(data) => handleLocationClick(data)}
                  style={{ cursor: 'pointer' }}
                  isAnimationActive={false}
                >
                  {clusteredData.map((entry, index) => {
                    // Size scales with count
                    const sizeScale = Math.min(Math.log2(entry.count + 1) * 3 + 5, 18);
                    const baseSize = Math.round(sizeScale);
                    
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={getDeathColor(entry.deathType)}
                        stroke={entry.count > 1 ? 'white' : 'rgba(255,255,255,0.5)'}
                        strokeWidth={entry.count > 1 ? 2 : 1}
                        opacity={0.85}
                        r={baseSize}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
      ) : (
        <div className="donnees-manquantes" style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {viewMode === 'deaths' 
              ? `Aucune mort localisée pour ${selectedPlayerName} sur cette carte.`
              : `Aucun kill localisé pour ${selectedPlayerName} sur cette carte.`
            }
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Les données de position ne sont disponibles que pour les parties récentes.
          </p>
        </div>
      )}
      </div>

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
