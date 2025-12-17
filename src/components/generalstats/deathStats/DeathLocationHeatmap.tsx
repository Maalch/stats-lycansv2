import { useEffect, useRef, useMemo, useState } from 'react';
import { contourDensity } from 'd3-contour';
import { scaleLinear } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import type { DeathLocationData } from '../../../hooks/utils/deathLocationUtils';
import { useFilteredGameLogData } from '../../../hooks/useCombinedRawData';
import { useNavigation } from '../../../context/NavigationContext';
import { getAllDeathTypes } from '../../../hooks/utils/deathStatisticsUtils';
import { DeathTypeCode, type DeathTypeCodeType } from '../../../utils/datasyncExport';
import { useThemeAdjustedLycansColorScheme } from '../../../types/api';
import { DeathLocationView } from './DeathLocationView';
import { useAvailableCampsFromRaw } from '../../../hooks/useDeathStatisticsFromRaw';

interface DeathLocationHeatmapCanvasProps {
  deathLocations: DeathLocationData[];
  xDomain: [number, number];
  zDomain: [number, number];
  width?: number;
  height?: number;
  bandwidth?: number;
  onRegionClick?: (deaths: DeathLocationData[]) => void;
}

export function DeathLocationHeatmapCanvas({
  deathLocations,
  xDomain,
  zDomain,
  width = 800,
  height = 600,
  bandwidth = 25,
  onRegionClick
}: DeathLocationHeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create scale functions for coordinate transformation
  const xScale = useMemo(() => 
    scaleLinear()
      .domain(xDomain)
      .range([0, width]),
    [xDomain, width]
  );

  const zScale = useMemo(() => 
    scaleLinear()
      .domain(zDomain)
      .range([height, 0]), // Inverted for canvas coordinates
    [zDomain, height]
  );

  // Calculate contour density
  const contours = useMemo(() => {
    if (deathLocations.length === 0) return [];

    const densityData = contourDensity<DeathLocationData>()
      .x(d => xScale(d.x))
      .y(d => zScale(d.z))
      .size([width, height])
      .bandwidth(bandwidth)
      .thresholds(15) // Number of contour levels
      (deathLocations);

    return densityData;
  }, [deathLocations, xScale, zScale, width, height, bandwidth]);

  // Get color scale based on theme
  const getColorScale = useMemo(() => {
    const maxDensity = contours.length > 0 
      ? Math.max(...contours.map(c => c.value))
      : 1;

    return (value: number) => {
      const normalizedValue = value / maxDensity;
      // Use d3-scale-chromatic interpolator with theme fallback
      const color = interpolateYlOrRd(normalizedValue);
      return color;
    };
  }, [contours]);

  // Render heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contours.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw each contour level
    contours.forEach((contour) => {
      ctx.fillStyle = getColorScale(contour.value);
      ctx.globalAlpha = 0.6;

      contour.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          ctx.beginPath();
          ring.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point[0], point[1]);
            } else {
              ctx.lineTo(point[0], point[1]);
            }
          });
          ctx.closePath();
          ctx.fill();
        });
      });
    });

    ctx.globalAlpha = 1;
  }, [contours, width, height, getColorScale]);

  // Render death points overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || deathLocations.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw small dots for each death location
    deathLocations.forEach((death) => {
      const x = xScale(death.x);
      const z = zScale(death.z);

      ctx.beginPath();
      ctx.arc(x, z, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }, [deathLocations, xScale, zScale, width, height]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onRegionClick || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickZ = event.clientY - rect.top;

    // Find deaths within a radius of the click
    const radius = 30; // pixels
    const nearbyDeaths = deathLocations.filter((death) => {
      const x = xScale(death.x);
      const z = zScale(death.z);
      const distance = Math.sqrt(Math.pow(x - clickX, 2) + Math.pow(z - clickZ, 2));
      return distance <= radius;
    });

    if (nearbyDeaths.length > 0) {
      onRegionClick(nearbyDeaths);
    }
  };

  // Handle hover for tooltip
  const handleCanvasHover = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const hoverZ = event.clientY - rect.top;

    // Find deaths within a small radius
    const radius = 20;
    const nearbyDeaths = deathLocations.filter((death) => {
      const x = xScale(death.x);
      const z = zScale(death.z);
      const distance = Math.sqrt(Math.pow(x - hoverX, 2) + Math.pow(z - hoverZ, 2));
      return distance <= radius;
    });

    // Update cursor style
    if (containerRef.current) {
      containerRef.current.style.cursor = nearbyDeaths.length > 0 ? 'pointer' : 'default';
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: `${width}px`, 
        height: `${height}px`,
        margin: '0 auto'
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasHover}
    >
      {/* Heatmap layer */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      />
      
      {/* Death points overlay */}
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Axis labels */}
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        Position X
      </div>
      <div style={{
        position: 'absolute',
        left: '-50px',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        fontWeight: 'bold'
      }}>
        Position Z
      </div>

      {/* Axis tick marks and labels */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      >
        {/* X-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const x = width * ratio;
          const value = xDomain[0] + (xDomain[1] - xDomain[0]) * ratio;
          return (
            <g key={`x-${ratio}`}>
              <line
                x1={x}
                y1={height}
                x2={x}
                y2={height - 5}
                stroke="var(--text-secondary)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="0.75rem"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {/* Z-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const z = height * (1 - ratio); // Inverted
          const value = zDomain[0] + (zDomain[1] - zDomain[0]) * ratio;
          return (
            <g key={`z-${ratio}`}>
              <line
                x1={0}
                y1={z}
                x2={5}
                y2={z}
                stroke="var(--text-secondary)"
                strokeWidth={1}
              />
              <text
                x={10}
                y={z}
                dominantBaseline="middle"
                fill="var(--text-secondary)"
                fontSize="0.75rem"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Wrapper component that provides camp filter and death type colors
export function DeathLocationHeatmap() {
  const { navigationState, updateNavigationState } = useNavigation();
  const [selectedCamp, setSelectedCamp] = useState<string>(
    navigationState.deathLocationState?.selectedCamp || 'Tous les camps'
  );
  const { data: availableCamps } = useAvailableCampsFromRaw();
  const { data: gameLogData } = useFilteredGameLogData();
  const lycansColors = useThemeAdjustedLycansColorScheme();

  // Get all unique death types for chart configuration
  const availableDeathTypes = useMemo(() => {
    return gameLogData ? getAllDeathTypes(gameLogData) : [];
  }, [gameLogData]);

  // Initialize default selected death types: all except 'VOTED' (Mort aux votes)
  const defaultDeathTypes = useMemo(() => {
    return availableDeathTypes.filter(type => type !== 'VOTED');
  }, [availableDeathTypes]);

  // Initialize death types from navigation state or use default (all except VOTED)
  useEffect(() => {
    if (!navigationState.deathLocationState?.selectedDeathTypes && availableDeathTypes.length > 0) {
      updateNavigationState({
        deathLocationState: {
          selectedCamp,
          selectedDeathTypes: defaultDeathTypes
        }
      });
    }
  }, [availableDeathTypes, defaultDeathTypes, navigationState.deathLocationState, selectedCamp, updateNavigationState]);

  // Define colors for different death types
  const deathTypeColors = useMemo(() => {
    const colorMap: Record<DeathTypeCodeType, string> = {} as Record<DeathTypeCodeType, string>;
    
    availableDeathTypes.forEach(deathTypeCode => {
      if (deathTypeCode === DeathTypeCode.BY_WOLF) {
        colorMap[deathTypeCode] = lycansColors['Loup'];
      } else if (deathTypeCode === DeathTypeCode.VOTED) {
        colorMap[deathTypeCode] = 'var(--chart-color-1)';
      } else if (deathTypeCode === DeathTypeCode.BULLET || deathTypeCode === DeathTypeCode.BULLET_HUMAN || deathTypeCode === DeathTypeCode.BULLET_WOLF) {
        colorMap[deathTypeCode] = lycansColors['Chasseur'];
      } else if (deathTypeCode === DeathTypeCode.BY_ZOMBIE) {
        colorMap[deathTypeCode] = lycansColors['Vaudou'];
      } else if (deathTypeCode === DeathTypeCode.ASSASSIN) {
        colorMap[deathTypeCode] = lycansColors['Alchimiste'];
      } else if (deathTypeCode === DeathTypeCode.AVENGER) {
        colorMap[deathTypeCode] = 'var(--chart-color-2)';
      } else if (deathTypeCode === DeathTypeCode.LOVER_DEATH) {
        colorMap[deathTypeCode] = lycansColors['Amoureux'];
      } else if (deathTypeCode === DeathTypeCode.BY_BEAST) {
        colorMap[deathTypeCode] = 'var(--chart-color-3)';
      } else if (deathTypeCode === DeathTypeCode.SHERIF_SUCCESS) {
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
    updateNavigationState({ 
      deathLocationState: {
        selectedCamp: newCamp
      }
    });
  };

  return (
    <div className="lycans-general-stats">
      <h2>🗺️ Carte de Chaleur des Morts</h2>

      {/* Camp Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <option key="tous" value="Tous les camps">Tous les camps</option>
            {availableCamps?.filter(camp => camp !== 'Tous les camps').map(camp => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Death Location View */}
      <DeathLocationView
        selectedCamp={selectedCamp}
        availableDeathTypes={availableDeathTypes}
        deathTypeColors={deathTypeColors}
      />
    </div>
  );
}
