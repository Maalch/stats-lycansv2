import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useFilteredGameLogData } from '../../../hooks/useCombinedRawData';
import { computeDeathLocationStats, getAvailableMapsWithDeathData } from '../../../hooks/utils/deathStatisticsUtils';
import type { DeathLocationData } from '../../../hooks/utils/deathStatisticsUtils';
import { type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { getDeathTypeLabel } from '../../../types/deathTypes';
import { DeathLocationHeatmapCanvas } from './DeathLocationHeatmapCanvas';

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
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const { data: gameLogData, isLoading, error } = useFilteredGameLogData();
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [selectedDeathType, setSelectedDeathType] = useState<string>('all');
  const [hoveredDeath, setHoveredDeath] = useState<DeathLocationData | null>(null);
  const [viewMode, setViewMode] = useState<'scatter' | 'heatmap'>('scatter');

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
    if (selectedDeathType !== 'all') {
      locations = locations.filter(loc => loc.deathType === selectedDeathType);
    }
    
    return locations;
  }, [gameLogData, selectedCamp, selectedMap, selectedDeathType]);

  // Group deaths by coordinates to show density and aggregate data
  const locationData = useMemo(() => {
    const locationMap = new Map<string, DeathLocationData[]>();
    
    deathLocations.forEach(loc => {
      const key = `${Math.round(loc.x)}_${Math.round(loc.z)}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, []);
      }
      locationMap.get(key)!.push(loc);
    });
    
    return locationMap;
  }, [deathLocations]);

  // Create aggregated data points for rendering (one point per unique location)
  const aggregatedLocationData = useMemo(() => {
    return Array.from(locationData.entries()).map(([key, deaths]) => {
      // Use the first death for position, but attach all deaths for the click handler
      const firstDeath = deaths[0];
      return {
        ...firstDeath,
        deathCount: deaths.length,
        allDeaths: deaths, // Attach all deaths at this location
        locationKey: key
      };
    });
  }, [locationData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload as DeathLocationData;
    const locationKey = `${Math.round(data.x)}_${Math.round(data.z)}`;
    const deathsAtLocation = locationData.get(locationKey) || [data];
    const isMultipleDeaths = deathsAtLocation.length > 1;
    
    if (isMultipleDeaths) {
      // Get unique death types and game IDs
      const deathTypeCounts = new Map<string, number>();
      const uniqueGameIds = new Set<string>();
      
      deathsAtLocation.forEach(death => {
        const deathTypeLabel = death.deathType ? getDeathTypeLabel(death.deathType) : 'Inconnu';
        deathTypeCounts.set(deathTypeLabel, (deathTypeCounts.get(deathTypeLabel) || 0) + 1);
        uniqueGameIds.add(death.gameId);
      });
      
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
            {deathsAtLocation.length} morts à cet endroit
          </div>
          
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Position:</strong> ({Math.round(data.x)}, {Math.round(data.z)})
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <strong>Types de mort:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {Array.from(deathTypeCounts.entries()).map(([type, count]) => (
                  <li key={type}>{type} ({count})</li>
                ))}
              </ul>
            </div>
            
            <div>
              <strong>Parties:</strong> {Array.from(uniqueGameIds).filter(id => id).map(id => `#${id}`).join(', ')}
            </div>
          </div>
          
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            Cliquez pour voir une des parties
          </div>
        </div>
      );
    }
    
    // Single death tooltip
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
          {data.playerName}
        </div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <div><strong>Camp:</strong> {data.camp}</div>
          <div><strong>Type de mort:</strong> {data.deathType ? getDeathTypeLabel(data.deathType) : 'Inconnu'}</div>
          {data.killerName && <div><strong>Tué par:</strong> {data.killerName}</div>}
          <div><strong>Carte:</strong> {data.mapName}</div>
          <div><strong>Partie:</strong> #{data.gameId}</div>
          <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Position: ({Math.round(data.x)}, {Math.round(data.z)})
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

  // Calculate axis domains with padding
  const { xDomain, zDomain } = useMemo(() => {
    if (aggregatedLocationData.length === 0) {
      return { xDomain: [0, 100], zDomain: [0, 100] };
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
      xDomain: [xMin - xPadding, xMax + xPadding],
      zDomain: [zMin - zPadding, zMax + zPadding]
    };
  }, [aggregatedLocationData]);

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
            <button
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
            {availableMaps.map(map => (
              <option key={map} value={map}>
                {map}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="death-type-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Type de mort :
          </label>
          <select
            id="death-type-select"
            value={selectedDeathType}
            onChange={(e) => setSelectedDeathType(e.target.value)}
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
            <option value="all">Tous les types</option>
            {availableDeathTypes.map(deathType => (
              <option key={deathType} value={deathType}>
                {getDeathTypeLabel(deathType)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="lycans-resume-conteneur" style={{ marginBottom: '2rem' }}>
        <div className="lycans-stat-carte">
          <h3>Morts localisées</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-primary)' }}>
            {deathLocations.length}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Camp filtré</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem' }}>
            {selectedCamp}
          </div>
        </div>
        <div className="lycans-stat-carte">
          <h3>Type de mort</h3>
          <div className="lycans-valeur-principale" style={{ color: 'var(--chart-color-2)', fontSize: '1.2rem' }}>
            {selectedDeathType === 'all' ? 'Tous' : getDeathTypeLabel(selectedDeathType)}
          </div>
        </div>
      </div>

      {/* Death Location Visualization */}
      {deathLocations.length > 0 ? (
        <FullscreenChart title={viewMode === 'scatter' ? 'Carte des Morts' : 'Carte de Chaleur des Morts'}>
          {viewMode === 'scatter' ? (
            <div style={{ height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="x" 
                    type="number"
                    name="Position X"
                    label={{ 
                      value: 'Position X', 
                      position: 'bottom',
                      offset: 10,
                      style: { fill: 'var(--text-secondary)' }
                    }}
                    domain={xDomain}
                    stroke="var(--text-secondary)"
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <YAxis 
                    dataKey="z"
                    type="number"
                    name="Position Z"
                    label={{ 
                      value: 'Position Z', 
                      angle: -90, 
                      position: 'left',
                      offset: 20,
                      style: { fill: 'var(--text-secondary)' }
                    }}
                    domain={zDomain}
                    stroke="var(--text-secondary)"
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    data={aggregatedLocationData}
                    onClick={(data) => handleDeathClick(data)}
                    onMouseEnter={(data) => setHoveredDeath(data as DeathLocationData)}
                    onMouseLeave={() => setHoveredDeath(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {aggregatedLocationData.map((entry, index) => {
                      const isHighlighted = settings.highlightedPlayer === entry.playerName;
                      const isHovered = hoveredDeath?.playerName === entry.playerName && 
                                       hoveredDeath?.gameId === entry.gameId;
                      
                      // Size based on number of deaths at this location
                      const baseSize = entry.deathCount > 1 ? 7 : 5;
                      const highlightedSize = baseSize + 2;
                      
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isHighlighted ? 'var(--accent-primary)' : getDeathColor(entry.deathType)}
                          stroke={isHighlighted || isHovered ? 'white' : entry.deathCount > 1 ? 'var(--accent-secondary)' : 'none'}
                          strokeWidth={isHighlighted ? 3 : isHovered ? 2 : entry.deathCount > 1 ? 1 : 0}
                          opacity={isHighlighted ? 1 : 0.7}
                          r={isHighlighted ? highlightedSize : isHovered ? baseSize + 1 : baseSize}
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
                width={800}
                height={600}
                bandwidth={25}
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

      {/* Legend Section */}
      {deathLocations.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Légende des types de mort</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '0.5rem' 
          }}>
            {availableDeathTypes.map(deathType => {
              const count = deathLocations.filter(d => d.deathType === deathType).length;
              if (count === 0) return null;
              
              return (
                <div key={deathType} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: deathTypeColors[deathType],
                    flexShrink: 0
                  }} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {getDeathTypeLabel(deathType)} ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="lycans-section-description" style={{ marginTop: '1.5rem' }}>
        <p>
          <strong>À propos de cette visualisation :</strong>
        </p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Les positions sont basées sur les coordonnées X et Z (vue 2D de la carte)</li>
          {viewMode === 'scatter' ? (
            <>
              <li>Chaque point représente la mort d'un joueur à un endroit précis</li>
              <li>La couleur indique le type de mort (voir légende ci-dessus)</li>
              <li>Les joueurs en surbrillance sont affichés en {' '}
                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                  couleur primaire
                </span>
              </li>
              <li>Cliquez sur un point pour voir les détails de la partie</li>
              <li>Survolez un point pour voir les informations détaillées</li>
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
          Note : Seules les parties récentes contiennent des données de position. Les parties legacy sont exclues.
        </p>
      </div>
    </div>
  );
}
