import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { useCombinedFilteredRawData } from '../../../hooks/useCombinedRawData';
import { useNavigation } from '../../../context/NavigationContext';
import { getMapConfig, adjustCoordinatesForMap, clusterLocationPoints, getDominantDeathType } from '../../../hooks/utils/deathLocationUtils';
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
    
    return locations;
  }, [filteredGameData, selectedPlayerName, viewMode, selectedMap]);

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

  // Get color for death type
  const getDeathColor = (deathType: string | null): string => {
    if (!deathType) return 'var(--text-secondary)';
    
    if (deathType === 'BY_WOLF' || deathType === 'SURVIVALIST_NOT_SAVED') {
      return lycansColors['Loup'];
    } else if (deathType === 'VOTED') {
      return 'var(--chart-color-1)';
    } else if (deathType === 'BULLET' || deathType === 'BULLET_HUMAN' || deathType === 'BULLET_WOLF') {
      return lycansColors['Chasseur'];
    } else if (deathType === 'BY_ZOMBIE') {
      return lycansColors['Vaudou'];
    } else if (deathType === 'ASSASSIN') {
      return lycansColors['Alchimiste'];
    } else if (deathType === 'AVENGER') {
      return 'var(--chart-color-2)';
    } else if (deathType === 'LOVER_DEATH') {
      return lycansColors['Amoureux'];
    } else if (deathType === 'BY_BEAST') {
      return 'var(--chart-color-3)';
    } else if (deathType === 'SHERIF_SUCCESS') {
      return 'var(--chart-color-4)';
    }
    
    return 'var(--accent-primary)';
  };

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
            color: 'var(--accent-primary)'
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
          color: 'var(--accent-primary)'
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
            Groupement :
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
            {clusterRadius === 0 ? 'Aucun' : `${clusterRadius}u`}
          </span>
        </div>
      </div>

      {/* Summary - displayed as row above the chart, full width */}
      <div className="lycans-resume-conteneur" style={{ flex: '1 1 100%', marginBottom: '1.5rem' }}>
        <div className="lycans-stat-carte">
          <h3>{viewMode === 'deaths' ? 'Morts localisées' : 'Kills localisés'}</h3>
          <div className="lycans-valeur-principale" style={{ color: viewMode === 'deaths' ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}>
            {locationData.length}
          </div>
          {clusterRadius > 0 && clusteredData.length < locationData.length && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              → {clusteredData.length} points groupés
            </div>
          )}
        </div>
        <div className="lycans-stat-carte">
          <h3>Carte</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-2)', fontSize: '1.2rem' }}>
            {selectedMap || 'Aucune'}
          </div>
        </div>
      </div>

      {/* Map Visualization - full width section */}
      <div className="lycans-graphique-section" style={{ flex: '1 1 100%', minWidth: '100%' }}>
        {locationData.length > 0 ? (
          <FullscreenChart title={viewMode === 'deaths' ? `Carte des Morts de ${selectedPlayerName}` : `Carte des Kills de ${selectedPlayerName}`}>
            {/* Aspect ratio: map is 1640:922 ≈ 1.78:1, so height = width / 1.78 */}
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', aspectRatio: '1640 / 922' }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke={mapConfig ? 'rgba(255,255,255,0.3)' : 'var(--border-color)'} />
                <XAxis 
                  dataKey="z" 
                  type="number"
                  name="Position Z"
                  label={{ 
                    value: 'Position Z', 
                    position: 'bottom',
                    offset: 10,
                    style: { fill: 'var(--text-secondary)' }
                  }}
                  domain={zDomain}
                  stroke="var(--text-secondary)"
                  tick={{ fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => Math.round(value).toString()}
                />
                <YAxis 
                  dataKey="x"
                  type="number"
                  name="Position X"
                  label={{ 
                    value: 'Position X', 
                    angle: -90, 
                    position: 'left',
                    offset: 20,
                    style: { fill: 'var(--text-secondary)' }
                  }}
                  domain={xDomain}
                  stroke="var(--text-secondary)"
                  tick={{ fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => Math.round(value).toString()}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  data={clusteredData}
                  onClick={(data) => handleLocationClick(data)}
                  style={{ cursor: 'pointer' }}
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
          <strong>💀 Morts:</strong> Où le joueur a été éliminé<br/>
          <strong>⚔️ Kills:</strong> Où le joueur a éliminé d'autres joueurs
        </p>
      </div>
    </div>
  );
}
