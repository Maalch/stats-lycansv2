import { useEffect, useRef, useMemo, useState } from 'react';
import { contourDensity } from 'd3-contour';
import { scaleLinear } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import type { DeathLocationData } from '../../../hooks/utils/deathStatisticsUtils';
import { getMapConfig, worldToImageCoordinates, calculateScreenBounds } from '../../../utils/mapCoordinates';

interface DeathLocationHeatmapCanvasProps {
  deathLocations: DeathLocationData[];
  xDomain: [number, number];
  zDomain: [number, number];
  mapName: string;
  width?: number;
  height?: number;
  bandwidth?: number;
  onRegionClick?: (deaths: DeathLocationData[]) => void;
}

export function DeathLocationHeatmapCanvas({
  deathLocations,
  xDomain,
  zDomain,
  mapName,
  width,
  height,
  bandwidth = 25,
  onRegionClick
}: DeathLocationHeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  
  // Get map configuration for heatmap view
  const mapConfig = useMemo(() => getMapConfig(mapName, 'heatmap'), [mapName]);

  // Use map config dimensions if available, otherwise fall back to props
  const displayWidth = mapConfig?.imageWidth ?? width ?? 800;
  const displayHeight = mapConfig?.imageHeight ?? height ?? 600;

  // Calculate screen coordinate bounds when map config is available
  const screenBounds = useMemo(() => {
    if (!mapConfig) return null;
    return calculateScreenBounds(deathLocations, mapConfig);
  }, [mapConfig, deathLocations]);
  
  // Create scale functions for coordinate transformation
  const xScale = useMemo(() => {
    if (mapConfig && screenBounds) {
      // Use FIXED scale based on map image dimensions (no auto-fit)
      // This ensures the coordinate transformation values actually affect the display
      return scaleLinear()
        .domain([0, mapConfig.imageWidth])
        .range([0, displayWidth]);
    }
    // Fallback to world coordinates
    return scaleLinear()
      .domain(xDomain)
      .range([0, displayWidth]);
  }, [mapConfig, screenBounds, xDomain, displayWidth]);

  const zScale = useMemo(() => {
    if (mapConfig && screenBounds) {
      // Use FIXED scale based on map image dimensions (no auto-fit)
      return scaleLinear()
        .domain([0, mapConfig.imageHeight])
        .range([0, displayHeight]);
    }
    // Fallback to world coordinates (inverted)
    return scaleLinear()
      .domain(zDomain)
      .range([displayHeight, 0]);
  }, [mapConfig, screenBounds, zDomain, displayHeight]);

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
  
  // Transform death locations to screen coordinates when map is available
  const transformedDeathLocations = useMemo(() => {
    if (!mapConfig) return deathLocations;
    
    return deathLocations.map(loc => {
      const screenCoords = worldToImageCoordinates(loc.x, loc.z, mapConfig);
      return {
        ...loc,
        screenX: screenCoords.x,
        screenY: screenCoords.y
      };
    });
  }, [deathLocations, mapConfig]);
  
  // Calculate contour density
  const contours = useMemo(() => {
    if (transformedDeathLocations.length === 0) return [];

    const densityData = contourDensity<any>()
      .x(d => xScale(mapConfig ? d.screenX : d.x))
      .y(d => zScale(mapConfig ? d.screenY : d.z))
      .size([displayWidth, displayHeight])
      .bandwidth(bandwidth)
      .thresholds(15) // Number of contour levels
      (transformedDeathLocations);

    return densityData;
  }, [transformedDeathLocations, xScale, zScale, displayWidth, displayHeight, bandwidth, mapConfig]);

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

  // Render map background
  useEffect(() => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Draw map image if available
    if (mapImage && mapConfig) {
      // Draw the image to fill the canvas
      ctx.drawImage(mapImage, 0, 0, displayWidth, displayHeight);
      
      // Add slight overlay to make death points more visible
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else {
      // No map - draw plain background
      ctx.fillStyle = 'var(--bg-tertiary)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }
  }, [mapImage, mapConfig, displayWidth, displayHeight]);
  
  // Render heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contours.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

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
  }, [contours, displayWidth, displayHeight, getColorScale]);

  // Render death points overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || transformedDeathLocations.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw small dots for each death location
    transformedDeathLocations.forEach((death: any) => {
      const x = xScale(mapConfig ? death.screenX : death.x);
      const z = zScale(mapConfig ? death.screenY : death.z);

      ctx.beginPath();
      ctx.arc(x, z, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [transformedDeathLocations, xScale, zScale, displayWidth, displayHeight, mapConfig]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onRegionClick || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickZ = event.clientY - rect.top;

    // Find deaths within a radius of the click
    const radius = 30; // pixels
    const nearbyDeaths = deathLocations.filter((death, index) => {
      const transformedDeath = transformedDeathLocations[index];
      const x = xScale(mapConfig ? (transformedDeath as any).screenX : death.x);
      const z = zScale(mapConfig ? (transformedDeath as any).screenY : death.z);
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
    const nearbyDeaths = deathLocations.filter((death, index) => {
      const transformedDeath = transformedDeathLocations[index];
      const x = xScale(mapConfig ? (transformedDeath as any).screenX : death.x);
      const z = zScale(mapConfig ? (transformedDeath as any).screenY : death.z);
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
        width: `${displayWidth}px`, 
        height: `${displayHeight}px`,
        margin: '0 auto'
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasHover}
    >
      {/* Background layer (map image) */}
      <canvas
        ref={backgroundCanvasRef}
        width={displayWidth}
        height={displayHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          border: '1px solid var(--border-color)',
          borderRadius: '4px'
        }}
      />
      
      {/* Heatmap layer */}
      <canvas
        ref={canvasRef}
        width={displayWidth}
        height={displayHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* Death points overlay */}
      <canvas
        ref={overlayCanvasRef}
        width={displayWidth}
        height={displayHeight}
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
        width={displayWidth}
        height={displayHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      >
        {/* X-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const x = displayWidth * ratio;
          const value = xDomain[0] + (xDomain[1] - xDomain[0]) * ratio;
          return (
            <g key={`x-${ratio}`}>
              <line
                x1={x}
                y1={displayHeight}
                x2={x}
                y2={displayHeight - 5}
                stroke="var(--text-secondary)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={displayHeight - 10}
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
          const z = displayHeight * (1 - ratio); // Inverted
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
