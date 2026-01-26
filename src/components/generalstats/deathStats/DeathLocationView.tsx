import { useMemo, useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useFilteredGameLogData } from '../../../hooks/useCombinedRawData';
import { computeDeathLocationStats, getAvailableMapsWithDeathData, getMapConfig, clusterLocationPoints, getDominantDeathType } from '../../../hooks/utils/deathLocationUtils';
import type { DeathLocationData } from '../../../hooks/utils/deathLocationUtils';
import { type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { getDeathTypeLabel } from '../../../types/deathTypes';
import { DeathLocationHeatmapCanvas } from './DeathLocationHeatmapCanvas';
import { CHART_DEFAULTS } from '../../../config/chartConstants';

interface DeathLocationViewProps {
  selectedCamp: string;
  availableDeathTypes: DeathTypeCodeType[];
  deathTypeColors: Record<DeathTypeCodeType, string>;
}

export function DeathLocationView({
  selectedCamp,
  availableDeathTypes,
  deathTypeColors
}: DeathLocationViewProps) {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { settings } = useSettings();
  const { data: gameLogData, isLoading, error } = useFilteredGameLogData();
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [selectedDeathTypes, setSelectedDeathTypes] = useState<string[]>(
    navigationState.deathLocationState?.selectedDeathTypes || []
  );
  const [hoveredDeath, setHoveredDeath] = useState<DeathLocationData | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'scatter'>('heatmap');
  const [clusterRadius, setClusterRadius] = useState<number>(CHART_DEFAULTS.CLUSTER_RADIUS); // Clustering radius in game units
  const [isDeathTypesExpanded, setIsDeathTypesExpanded] = useState<boolean>(false); // Toggle for death types panel

  // Initialize selectedDeathTypes with all types except VOTED if no saved state exists
  useEffect(() => {
    if (selectedDeathTypes.length === 0 && availableDeathTypes.length > 0) {
      const defaultTypes = availableDeathTypes.filter(type => type !== 'VOTED');
      setSelectedDeathTypes(defaultTypes);
      updateNavigationState({
        deathLocationState: {
          ...navigationState.deathLocationState,
          selectedCamp: selectedCamp,
          selectedDeathTypes: defaultTypes
        }
      });
    }
  }, [availableDeathTypes.length]); // Only run when availableDeathTypes becomes available

  // Get available maps with death position data, sorted by number of deaths (descending)
  const availableMaps = useMemo(() => {
    if (!gameLogData) return [];
    
    const maps = getAvailableMapsWithDeathData(gameLogData);
    const allDeaths = computeDeathLocationStats(gameLogData, selectedCamp);
    
    // Count deaths per map
    const deathCountByMap = new Map<string, number>();
    allDeaths.forEach(death => {
      deathCountByMap.set(death.mapName, (deathCountByMap.get(death.mapName) || 0) + 1);
    });
    
    // Sort maps by death count (descending)
    return maps.sort((a, b) => {
      const countA = deathCountByMap.get(a) || 0;
      const countB = deathCountByMap.get(b) || 0;
      return countB - countA;
    });
  }, [gameLogData, selectedCamp]);

  // Set default selected map to first available map (which is now the one with most deaths)
  const defaultMap = availableMaps.length > 0 ? availableMaps[0] : '';
  if (selectedMap === '' && defaultMap !== '') {
    setSelectedMap(defaultMap);
  }

  // Compute death location data with filters
  const deathLocations = useMemo(() => {
    if (!gameLogData) return [];
    
    // Get all death locations with camp filter
    let locations = computeDeathLocationStats(gameLogData, selectedCamp);
    
    // Apply map filter (always filter by selected map, no "all" option)
    if (selectedMap) {
      locations = locations.filter(loc => loc.mapName === selectedMap);
    }
    
    // Apply death type filter
    // When no types selected: show all deaths
    // When types selected: only show deaths matching those types
    if (selectedDeathTypes.length > 0) {
      locations = locations.filter(loc => selectedDeathTypes.includes(loc.deathType));
    }
    
    return locations;
  }, [gameLogData, selectedCamp, selectedMap, selectedDeathTypes]);

  // Group deaths by coordinates to show density and aggregate data
  // Uses spatial clustering to group nearby deaths together
  const locationData = useMemo(() => {
    return clusterLocationPoints(deathLocations, clusterRadius);
  }, [deathLocations, clusterRadius]);

  // Create aggregated data points for rendering (one point per cluster)
  const aggregatedLocationData = useMemo(() => {
    return locationData.map((cluster, index) => {
      const firstDeath = cluster.items[0];
      const dominantDeathType = getDominantDeathType(cluster.items);
      
      return {
        x: cluster.centroidX,
        z: cluster.centroidZ,
        deathCount: cluster.items.length,
        allDeaths: cluster.items,
        dominantDeathType,
        playerName: cluster.items.length === 1 ? firstDeath.playerName : null,
        gameId: cluster.items.length === 1 ? firstDeath.gameId : null,
        camp: firstDeath.camp,
        mapName: firstDeath.mapName,
        deathType: dominantDeathType,
        killerName: cluster.items.length === 1 ? firstDeath.killerName : null,
        clusterIndex: index
      };
    });
  }, [locationData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const deathsAtLocation: DeathLocationData[] = data.allDeaths || [data];
    const isMultipleDeaths = deathsAtLocation.length > 1;
    
    if (isMultipleDeaths) {
      // Get unique death types, players, and game IDs
      const deathTypeCounts = new Map<string, number>();
      const uniqueGameIds = new Set<string>();
      const playerCounts = new Map<string, number>();
      
      deathsAtLocation.forEach((death: DeathLocationData) => {
        const deathTypeLabel = death.deathType ? getDeathTypeLabel(death.deathType) : 'Inconnu';
        deathTypeCounts.set(deathTypeLabel, (deathTypeCounts.get(deathTypeLabel) || 0) + 1);
        uniqueGameIds.add(death.gameId);
        playerCounts.set(death.playerName, (playerCounts.get(death.playerName) || 0) + 1);
      });
      
      // Get top players (max 3)
      const sortedPlayers = Array.from(playerCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const hasMorePlayers = playerCounts.size > 3;
      
      // Get top death types (max 3)
      const sortedDeathTypes = Array.from(deathTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const hasMoreDeathTypes = deathTypeCounts.size > 3;
      
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
            {deathsAtLocation.length} morts dans cette zone
          </div>
          
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Centre:</strong> ({Math.round(data.x)}, {Math.round(data.z)})
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Joueurs:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {sortedPlayers.map(([player, count]) => (
                  <li key={player}>
                    {player} {count > 1 ? `(${count} morts)` : ''}
                  </li>
                ))}
                {hasMorePlayers && <li style={{ color: 'var(--text-secondary)' }}>...et {playerCounts.size - 3} autres</li>}
              </ul>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Types de mort:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {sortedDeathTypes.map(([type, count]) => (
                  <li key={type}>{type} ({count})</li>
                ))}
                {hasMoreDeathTypes && <li style={{ color: 'var(--text-secondary)' }}>...et {deathTypeCounts.size - 3} autres</li>}
              </ul>
            </div>
            
            <div>
              <strong>Parties:</strong> {uniqueGameIds.size} parties
              {uniqueGameIds.size <= 5 && (
                <span> ({Array.from(uniqueGameIds).filter(id => id).map(id => `#${id}`).join(', ')})</span>
              )}
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
    
    // Single death tooltip - get the actual death data
    const singleDeath = deathsAtLocation[0];
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
          {singleDeath.playerName}
        </div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <div><strong>Camp:</strong> {singleDeath.camp}</div>
          <div><strong>Type de mort:</strong> {singleDeath.deathType ? getDeathTypeLabel(singleDeath.deathType) : 'Inconnu'}</div>
          {singleDeath.killerName && <div><strong>Tué par:</strong> {singleDeath.killerName}</div>}
          <div><strong>Carte:</strong> {singleDeath.mapName}</div>
          <div><strong>Partie:</strong> #{singleDeath.gameId}</div>
          <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Position: ({Math.round(singleDeath.x)}, {Math.round(singleDeath.z)})
          </div>
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

  // Handle click on death location to navigate to game details
  const handleDeathClick = (data: any) => {
    if (!data) return;
    
    // Data now contains allDeaths array with all deaths at this location
    const deathsAtLocation = data.allDeaths || [data];
    
    if (deathsAtLocation.length === 1) {
      // Single death - navigate to specific game
      navigateToGameDetails({
        selectedGame: deathsAtLocation[0].gameId,
        fromComponent: 'Death Location View'
      });
    } else {
      // Multiple deaths - navigate with game IDs filter
      const gameIds = deathsAtLocation
        .map((d: DeathLocationData) => d.gameId)
        .filter((id: string) => id);
      
      navigateToGameDetails({
        selectedGameIds: gameIds,
        fromComponent: 'Death Location View'
      });
    }
  };

  // Get color for death type
  const getDeathColor = (deathType: string | null): string => {
    if (!deathType) return 'var(--text-secondary)';
    return deathTypeColors[deathType as DeathTypeCodeType] || 'var(--text-secondary)';
  };

  // Get map configuration for the selected map
  const mapConfig = useMemo(() => {
    return getMapConfig(selectedMap);
  }, [selectedMap]);

  // Calculate axis domains - use fixed map coordinates if available
  // Z is horizontal (X-axis), X is vertical (Y-axis)
  const { xDomain, zDomain } = useMemo(() => {
    // If we have a map configuration, use its fixed coordinates
    if (mapConfig) {
      return {
        xDomain: [mapConfig.xMin, mapConfig.xMax] as [number, number],
        zDomain: [mapConfig.zMin, mapConfig.zMax] as [number, number]
      };
    }
    
    // Fallback to dynamic calculation based on death data
    if (aggregatedLocationData.length === 0) {
      return { xDomain: [0, 100] as [number, number], zDomain: [0, 100] as [number, number] };
    }
    
    const xValues = aggregatedLocationData.map(d => d.x);
    const zValues = aggregatedLocationData.map(d => d.z);
    
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
  }, [aggregatedLocationData, mapConfig]);

  if (isLoading) return <div className="donnees-attente">Chargement des localisations de mort...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!gameLogData) return <div className="donnees-manquantes">Aucune donnée disponible</div>;

  return (
    <div>
      {/* Filter Selection */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Mode :
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
              onClick={() => setViewMode('heatmap')}
              style={{
                background: viewMode === 'heatmap' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'heatmap' ? 'white' : 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'heatmap' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              Carte de chaleur
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scatter')}
              style={{
                background: viewMode === 'scatter' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'scatter' ? 'white' : 'var(--text-primary)',
                border: 'none',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'scatter' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              Points
            </button>

          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="map-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Carte :
          </label>
          <select
            id="map-select"
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
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
            {availableMaps
              .filter(map => map === 'Village' || map === 'Château')
              .map(map => (
                <option key={map} value={map}>
                  {map}
                </option>
              ))}
          </select>
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
                    updateNavigationState({
                      deathLocationState: {
                        ...navigationState.deathLocationState,
                        selectedCamp: selectedCamp,
                        selectedDeathTypes: availableDeathTypes
                      }
                    });
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
                    updateNavigationState({
                      deathLocationState: {
                        ...navigationState.deathLocationState,
                        selectedCamp: selectedCamp,
                        selectedDeathTypes: []
                      }
                    });
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
                    const newSelectedTypes = isSelected
                      ? selectedDeathTypes.filter(t => t !== deathType)
                      : [...selectedDeathTypes, deathType];
                    
                    setSelectedDeathTypes(newSelectedTypes);
                    updateNavigationState({
                      deathLocationState: {
                        ...navigationState.deathLocationState,
                        selectedCamp: selectedCamp,
                        selectedDeathTypes: newSelectedTypes
                      }
                    });
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

        {/* Cluster Radius Slider - only visible in scatter mode */}
        {viewMode === 'scatter' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="cluster-radius" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Regroupement :
            </label>
            <input
              id="cluster-radius"
              type="range"
              min="0"
              max="60"
              step="5"
              value={clusterRadius}
              onChange={(e) => setClusterRadius(Number(e.target.value))}
              style={{
                width: '100px',
                cursor: 'pointer'
              }}
            />
            <span style={{ 
              color: 'var(--text-primary)', 
              fontSize: '0.85rem',
              minWidth: '70px'
            }}>
              {clusterRadius === 0 ? 'Aucun' : `${clusterRadius} unités`}
            </span>
          </div>
        )}
      </div>

      {/* Death Location Visualization */}
      {deathLocations.length > 0 ? (
        <FullscreenChart title={viewMode === 'scatter' ? 'Carte des Morts' : 'Carte de Chaleur des Morts'}>
          {viewMode === 'scatter' ? (
            <div style={{ height: 700, width: '100%', maxWidth: 1000, margin: '0 auto' }}>
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
                            preserveAspectRatio="none"
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
                    data={aggregatedLocationData}
                    onClick={(data) => handleDeathClick(data)}
                    onMouseEnter={(data) => setHoveredDeath(data as DeathLocationData)}
                    onMouseLeave={() => setHoveredDeath(null)}
                    style={{ cursor: 'pointer' }}
                    isAnimationActive={false}
                  >
                    {aggregatedLocationData.map((entry, index) => {
                      // Check if any death in this cluster belongs to the highlighted player
                      const hasHighlightedPlayer = entry.allDeaths.some(
                        (d: DeathLocationData) => settings.highlightedPlayer === d.playerName
                      );
                      const isHovered = hoveredDeath && entry.clusterIndex === (hoveredDeath as any).clusterIndex;
                      
                      // Size scales with number of deaths (logarithmic to avoid huge dots)
                      // Base: 5 for 1 death, grows with log scale
                      const sizeScale = Math.min(Math.log2(entry.deathCount + 1) * 3 + 4, 18);
                      const baseSize = Math.round(sizeScale);
                      const highlightedSize = baseSize + 2;
                      
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={hasHighlightedPlayer ? 'var(--accent-primary-text)' : getDeathColor(entry.deathType)}
                          stroke={hasHighlightedPlayer || isHovered ? 'white' : entry.deathCount > 1 ? 'rgba(255,255,255,0.6)' : 'none'}
                          strokeWidth={hasHighlightedPlayer ? 3 : isHovered ? 2 : entry.deathCount > 1 ? 1.5 : 0}
                          opacity={hasHighlightedPlayer ? 1 : 0.8}
                          r={hasHighlightedPlayer ? highlightedSize : isHovered ? baseSize + 1 : baseSize}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
              <DeathLocationHeatmapCanvas
                deathLocations={deathLocations}
                xDomain={xDomain as [number, number]}
                zDomain={zDomain as [number, number]}
                width={1000}
                height={700}
                bandwidth={25}
                mapConfig={mapConfig}
                onRegionClick={(deaths) => {
                  if (deaths.length === 1) {
                    navigateToGameDetails({
                      selectedGame: deaths[0].gameId,
                      fromComponent: 'Death Location View (Heatmap)'
                    });
                  } else {
                    const gameIds = deaths.map(d => d.gameId).filter(id => id);
                    navigateToGameDetails({
                      selectedGameIds: gameIds,
                      fromComponent: 'Death Location View (Heatmap)'
                    });
                  }
                }}
              />
            </div>
          )}
        </FullscreenChart>
      ) : (
        <div className="donnees-manquantes" style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            Aucune localisation de mort disponible pour les filtres sélectionnés
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Les données de position ne sont disponibles que pour les parties récentes (non-legacy).
          </p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="lycans-resume-conteneur" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <div className="lycans-stat-carte">
          <h3>Morts localisées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary-text)' }}>
            {deathLocations.length}
          </div>
          {viewMode === 'scatter' && clusterRadius > 0 && aggregatedLocationData.length < deathLocations.length && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              → {aggregatedLocationData.length} points groupés
            </div>
          )}
        </div>
        <div className="lycans-stat-carte">
          <h3>Camp filtré</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem' }}>
            {selectedCamp}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Types de mort</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-2)', fontSize: '1.2rem' }}>
            {selectedDeathTypes.length === 0 ? 'Tous' : 
             selectedDeathTypes.length === availableDeathTypes.length ? 'Tous' :
             `${selectedDeathTypes.length} type${selectedDeathTypes.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>À propos de cette visualisation :</strong>
        </p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Les positions sont basées sur les coordonnées Z (horizontal) et X (vertical) - vue 2D de la carte</li>
          {viewMode === 'scatter' ? (
            <>
              <li>Les morts proches sont regroupées en un seul point - ajustez le curseur "Regroupement" pour contrôler la distance</li>
              <li>Les points regroupés ont une petite bordure blanche</li>
              <li>La couleur indique le type de mort dominant dans ce regroupement</li>
              <li>Survolez un point pour voir tous les joueurs, types de mort et parties concernés</li>
              <li>Le joueur sélectionné est affiché en {' '}
                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                  couleur primaire
                </span>
              </li>
              <li>Cliquez sur un point pour voir les détails de la ou des parties</li>
            </>
          ) : (
            <>
              <li>La carte de chaleur montre les zones de forte densité de morts (du jaune au rouge)</li>
              <li>Les points noirs indiquent l'emplacement exact de chaque mort</li>
              <li>Les zones rouges indiquent une concentration élevée de morts</li>
              <li>Cliquez sur une zone pour voir les détails des parties associées</li>
              <li>Utilisez le mode "Points" pour voir les détails individuels par type de mort</li>
            </>
          )}
        </ul>
        <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          Note : Seules les parties récentes contiennent des données de position.
        </p>
      </div>
    </div>
  );
}
