import { useMemo, useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { useSettings } from '../../../context/SettingsContext';
import type { DeathLocationData } from '../../../hooks/utils/deathStatisticsUtils';
import { getMapConfig, worldToImageCoordinates, calculateScreenBounds } from '../../../utils/mapCoordinates';

interface DeathLocationScatterProps {
  deathLocations: DeathLocationData[];
  aggregatedLocationData: any[];
  mapName: string;
  xDomain: [number, number];
  zDomain: [number, number];
  onDeathClick: (data: any) => void;
  CustomTooltip: React.ComponentType<any>;
  getDeathColor: (deathType: string | null) => string;
}

export function DeathLocationScatter({
  deathLocations,
  aggregatedLocationData,
  mapName,
  xDomain,
  zDomain,
  onDeathClick,
  CustomTooltip,
  getDeathColor
}: DeathLocationScatterProps) {
  const { settings } = useSettings();
  const [hoveredDeath, setHoveredDeath] = useState<DeathLocationData | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  
  // Get map configuration for scatter view
  const mapConfig = useMemo(() => getMapConfig(mapName, 'scatter'), [mapName]);
  
  // Load map image
  useEffect(() => {
    if (!mapConfig) {
      setMapImage(null);
      return;
    }
    
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.onerror = () => {
      console.error(`Failed to load map image: ${mapConfig.imagePath}`);
      setMapImage(null);
    };
    img.src = mapConfig.imagePath;
  }, [mapConfig]);
  
  // Calculate screen coordinate bounds when map config is available
  const screenBounds = useMemo(() => {
    if (!mapConfig) return null;
    return calculateScreenBounds(deathLocations, mapConfig);
  }, [mapConfig, deathLocations]);
  
  // Transform aggregated data to use screen coordinates when map is available
  const transformedAggregatedData = useMemo(() => {
    if (!mapConfig) return aggregatedLocationData;
    
    const transformed = aggregatedLocationData.map(item => {
      const screenCoords = worldToImageCoordinates(item.x, item.z, mapConfig);
      return {
        ...item,
        x: screenCoords.x,
        y: screenCoords.y  // Use 'y' for Recharts vertical axis
      };
    });
    
    return transformed;
  }, [aggregatedLocationData, mapConfig]);
  
  // Calculate axis domains based on map configuration
  const { effectiveXDomain, effectiveZDomain } = useMemo(() => {
    if (mapConfig && screenBounds) {
      // Always show the full map range (0 to imageWidth, 0 to imageHeight)
      // This keeps the map visible at its original size
      return {
        effectiveXDomain: [() => 0, () => mapConfig.imageWidth] as any,
        effectiveZDomain: [() => 0, () => mapConfig.imageHeight] as any,
      };
    }
    
    return {
      effectiveXDomain: xDomain,
      effectiveZDomain: zDomain,
    };
  }, [mapConfig, screenBounds, xDomain, zDomain]);

  // Calculate tick positions based on world coordinates (like heatmap)
  const xTickPositions = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const worldValue = xDomain[0] + (xDomain[1] - xDomain[0]) * ratio;
      const screenValue = mapConfig 
        ? worldToImageCoordinates(worldValue, 0, mapConfig).x
        : worldValue;
      return { worldValue, screenValue };
    });
  }, [xDomain, mapConfig]);

  const zTickPositions = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map(ratio => {
      const worldValue = zDomain[0] + (zDomain[1] - zDomain[0]) * ratio;
      const screenValue = mapConfig
        ? worldToImageCoordinates(0, worldValue, mapConfig).y
        : worldValue;
      return { worldValue, screenValue };
    });
  }, [zDomain, mapConfig]);

  return (
    <div style={{ height: 700, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
          <defs>
            {mapImage && mapConfig && (
              <pattern id={`map-pattern-${mapName}`} x="0" y="0" width="1" height="1">
                <image 
                  href={mapConfig.imagePath} 
                  x="0" 
                  y="0" 
                  width={mapConfig.imageWidth} 
                  height={mapConfig.imageHeight}
                  preserveAspectRatio="none"
                  opacity="0.3"
                />
              </pattern>
            )}
          </defs>
          {mapImage && mapConfig && (
            <ReferenceArea
              x1={0}
              x2={mapConfig.imageWidth}
              y1={0}
              y2={mapConfig.imageHeight}
              fill={`url(#map-pattern-${mapName})`}
              fillOpacity={1}
            />
          )}
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
            domain={effectiveXDomain}
            allowDataOverflow={false}
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)' }}
            ticks={xTickPositions.map(t => t.screenValue)}
            tickFormatter={(value) => {
              // Find closest tick position and show its world value
              const tick = xTickPositions.reduce((prev, curr) => 
                Math.abs(curr.screenValue - value) < Math.abs(prev.screenValue - value) ? curr : prev
              );
              return Math.round(tick.worldValue).toString();
            }}
          />
          <YAxis 
            dataKey="y"
            type="number"
            name="Position Z"
            label={{ 
              value: 'Position Z', 
              angle: -90, 
              position: 'left',
              offset: 20,
              style: { fill: 'var(--text-secondary)' }
            }}
            domain={effectiveZDomain}
            allowDataOverflow={false}
            stroke="var(--text-secondary)"
            tick={{ fill: 'var(--text-secondary)' }}
            ticks={zTickPositions.map(t => t.screenValue)}
            tickFormatter={(value) => {
              // Find closest tick position and show its world value
              const tick = zTickPositions.reduce((prev, curr) =>
                Math.abs(curr.screenValue - value) < Math.abs(prev.screenValue - value) ? curr : prev
              );
              return Math.round(tick.worldValue).toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter 
            data={transformedAggregatedData}
            onClick={(data) => onDeathClick(data)}
            onMouseEnter={(data) => setHoveredDeath(data as DeathLocationData)}
            onMouseLeave={() => setHoveredDeath(null)}
            style={{ cursor: 'pointer' }}
          >
            {transformedAggregatedData.map((entry, index) => {
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
                  opacity={isHighlighted ? 1 : 0.8}
                  r={isHighlighted ? highlightedSize : isHovered ? baseSize + 1 : baseSize}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
