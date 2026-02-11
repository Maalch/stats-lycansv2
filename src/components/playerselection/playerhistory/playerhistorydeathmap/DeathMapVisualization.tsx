import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, Cell, ReferenceArea } from 'recharts';
import { FullscreenChart } from '../../../common/FullscreenChart';
import { type DeathType, getDeathTypeLabel } from '../../../../types/deathTypes';
import { type MapImageConfig } from '../../../../hooks/utils/deathLocationUtils';

type VillageZone = 'Village Principal' | 'Ferme' | 'Village Pêcheur' | 'Ruines' | 'Reste de la Carte';

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

interface ClusteredDataPoint {
  x: number;
  z: number;
  count: number;
  allLocations: LocationData[];
  victimName: string | null;
  killerName: string | null;
  deathType: DeathType | null;
  mapName: string;
  camp: string;
  gameId: string | null;
  displayedGameId: string | null;
  clusterIndex: number;
}

interface DeathMapVisualizationProps {
  locationData: LocationData[];
  clusteredData: ClusteredDataPoint[];
  viewMode: 'deaths' | 'kills' | 'transformations';
  selectedPlayerName: string;
  selectedMap: string;
  mapConfig: MapImageConfig | null;
  xDomain: [number, number];
  zDomain: [number, number];
  hoveredZone: VillageZone | null;
  getDeathColor: (deathType: string | null, camp?: string) => string;
  handleLocationClick: (data: any) => void;
}

export function DeathMapVisualization({
  locationData,
  clusteredData,
  viewMode,
  selectedPlayerName,
  selectedMap,
  mapConfig,
  xDomain,
  zDomain,
  hoveredZone,
  getDeathColor,
  handleLocationClick
}: DeathMapVisualizationProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const locations = data.allLocations || [data];
    const isMultiple = locations.length > 1;
    const isTransformation = viewMode === 'transformations';
    
    if (isMultiple) {
      const victimCounts = new Map<string, number>();
      const deathTypeCounts = new Map<string, number>();
      const uniqueGames = new Set<string>();
      const campCounts = new Map<string, number>();
      
      locations.forEach((loc: LocationData) => {
        victimCounts.set(loc.victimName, (victimCounts.get(loc.victimName) || 0) + 1);
        if (!isTransformation) {
          const label = loc.deathType ? getDeathTypeLabel(loc.deathType) : 'Inconnu';
          deathTypeCounts.set(label, (deathTypeCounts.get(label) || 0) + 1);
        } else {
          campCounts.set(loc.camp, (campCounts.get(loc.camp) || 0) + 1);
        }
        uniqueGames.add(loc.gameId);
      });
      
      const topVictims = Array.from(victimCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      const topDeathTypes = Array.from(deathTypeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      const topCamps = Array.from(campCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
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
            marginBottom: '4px', 
            fontSize: '1rem',
            color: 'var(--accent-primary-text)'
          }}>
            {isTransformation ? '🐺' : viewMode === 'deaths' ? '💀' : '⚔️'} {locations.length} {isTransformation ? 'transformations' : viewMode === 'deaths' ? 'morts' : 'kills'} à cet endroit
          </div>
          
          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
            {isTransformation ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Camps loup:</strong>
                  {topCamps.map(([camp, count]) => (
                    <div key={camp} style={{ marginLeft: '0.5rem' }}>
                      • {camp} ({count}×)
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '4px' }}>
                  <strong>{viewMode === 'deaths' ? 'Victimes:' : 'Kills sur:'}</strong>
                  {topVictims.map(([name, count]) => (
                    <div key={name} style={{ marginLeft: '0.5rem' }}>
                      • {name} ({count}×)
                    </div>
                  ))}
                </div>
                
                <div style={{ marginBottom: '4px' }}>
                  <strong>Types de mort:</strong>
                  {topDeathTypes.map(([type, count]) => (
                    <div key={type} style={{ marginLeft: '0.5rem' }}>
                      • {type} ({count}×)
                    </div>
                  ))}
                </div>
              </>
            )}
            
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
          marginBottom: '4px', 
          fontSize: '1rem',
          color: 'var(--accent-primary-text)'
        }}>
          {isTransformation ? '🐺' : viewMode === 'deaths' ? '💀' : '⚔️'} {isTransformation ? 'Transformation de' : viewMode === 'deaths' ? 'Mort de' : 'Kill de'} {selectedPlayerName}
        </div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          {isTransformation ? (
            <>
              <div>👤 <strong>Joueur:</strong> {singleLoc.victimName}</div>
              <div>🏕️ <strong>Camp loup:</strong> {singleLoc.camp}</div>
              <div>🗺️ <strong>Carte:</strong> {singleLoc.mapName}</div>
              <div>🎮 <strong>Partie:</strong> #{singleLoc.gameId}</div>
            </>
          ) : viewMode === 'deaths' ? (
            <>
              <div>⚰️ <strong>Victime:</strong> {singleLoc.victimName}</div>
              <div>⚔️ <strong>Tueur:</strong> {singleLoc.killerName || 'Inconnu'}</div>
              <div>💀 <strong>Type:</strong> {singleLoc.deathType ? getDeathTypeLabel(singleLoc.deathType) : 'Inconnu'}</div>
            </>
          ) : (
            <>
              <div>🎯 <strong>Victime:</strong> {singleLoc.victimName}</div>
              <div>🏕️ <strong>Camp victime:</strong> {singleLoc.camp}</div>
              <div>💀 <strong>Type:</strong> {singleLoc.deathType ? getDeathTypeLabel(singleLoc.deathType) : 'Inconnu'}</div>
            </>
          )}
          {!isTransformation && (
            <>
              <div>🗺️ <strong>Carte:</strong> {singleLoc.mapName}</div>
              <div>🎮 <strong>Partie:</strong> #{singleLoc.gameId}</div>
            </>
          )}
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

  return (
    <div className="lycans-graphique-section" style={{ flex: '1 1 100%', minWidth: '100%' }}>
      {locationData.length > 0 ? (
        <FullscreenChart title={viewMode === 'deaths' ? `Carte des Morts de ${selectedPlayerName}` : `Carte des Kills de ${selectedPlayerName}`}>
          {/* Aspect ratio: map is 1640:922 ≈ 1.78:1, so height = width / 1.78 */}
          <div style={{ width: '100%', margin: '0 auto', aspectRatio: '1640 / 922' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
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
                        fill={getDeathColor(entry.deathType, entry.camp)}
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
              : viewMode === 'kills'
                ? `Aucun kill localisé pour ${selectedPlayerName} sur cette carte.`
                : `Aucune transformation en loup localisée pour ${selectedPlayerName} sur cette carte.`
            }
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Les données de position ne sont disponibles que pour les parties récentes.
          </p>
        </div>
      )}
    </div>
  );
}
