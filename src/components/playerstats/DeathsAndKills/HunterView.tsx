import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { FullscreenChart } from '../../common/FullscreenChart';
import { useSettings } from '../../../context/SettingsContext';
import { useNavigation } from '../../../context/NavigationContext';
import { useJoueursData } from '../../../hooks/useJoueursData';
import { useThemeAdjustedLycansColorScheme, useThemeAdjustedDynamicPlayersColor } from '../../../types/api';

interface HunterViewProps {
  hunterStats: any;
  isLoading: boolean;
  error: string | null;
}

export function HunterView({
  hunterStats,
  isLoading,
  error
}: HunterViewProps) {
  const { navigateToGameDetails } = useNavigation();
  const { settings } = useSettings();
  const lycansColors = useThemeAdjustedLycansColorScheme();
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  if (isLoading) return <div className="donnees-attente">Chargement des statistiques chasseurs...</div>;
  if (error) return <div className="donnees-probleme">Erreur: {error}</div>;
  if (!hunterStats || hunterStats.hunterStats.length === 0) {
    return (
      <div className="lycans-empty-section">
        <h3>Aucune donnée Chasseur</h3>
        <p>Aucune statistique de chasseur disponible avec les filtres actuels.</p>
      </div>
    );
  }

  // Process best hunters data with highlighting logic
  const {
    finalBestHuntersData,
    highlightedPlayerAddedToBest,
    finalBadHuntersData,
    highlightedPlayerAddedToBad
  } = (() => {
    const eligibleBestHunters = hunterStats.hunterStats.filter((h: any) => h.gamesPlayedAsHunter >= 5);
    const topBestHunters = eligibleBestHunters
      .sort((a: any, b: any) => b.averageNonVillageoisKillsPerGame - a.averageNonVillageoisKillsPerGame)
      .slice(0, 15);
    
    const highlightedPlayerInBestTop15 = settings.highlightedPlayer && 
      topBestHunters.some((h: any) => h.hunterName === settings.highlightedPlayer);
    
    let finalBestHuntersData = [...topBestHunters];
    let highlightedPlayerAddedToBest = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInBestTop15) {
      const highlightedHunter = hunterStats.hunterStats.find((h: any) => h.hunterName === settings.highlightedPlayer);
      if (highlightedHunter) {
        finalBestHuntersData.push({
          ...highlightedHunter,
          isHighlightedAddition: true
        } as any);
        highlightedPlayerAddedToBest = true;
      }
    }

    // Process bad hunters data with highlighting logic  
    const badHuntersProcessed = hunterStats.hunterStats
      .filter((h: any) => h.gamesPlayedAsHunter >= 5)
      .map((hunter: any) => ({
        name: hunter.hunterName,
        averageVillageoisKills: Number((hunter.villageoisKills / hunter.gamesPlayedAsHunter).toFixed(2)),
        totalVillageoisKills: hunter.villageoisKills,
        totalNonVillageoisKills: hunter.nonVillageoisKills,
        totalKills: hunter.totalKills,
        gamesPlayed: hunter.gamesPlayedAsHunter,
        victimsByCamp: hunter.victimsByCamp,
        goodVictimsByCamp: hunter.goodVictimsByCamp,
        badVictimsByCamp: hunter.badVictimsByCamp,
        hunterName: hunter.hunterName
      }));
    
    const topBadHunters = badHuntersProcessed
      .sort((a: any, b: any) => b.averageVillageoisKills - a.averageVillageoisKills)
      .slice(0, 15);
    
    const highlightedPlayerInBadTop15 = settings.highlightedPlayer && 
      topBadHunters.some((h: any) => h.hunterName === settings.highlightedPlayer);
    
    let finalBadHuntersData = [...topBadHunters];
    let highlightedPlayerAddedToBad = false;
    
    if (settings.highlightedPlayer && !highlightedPlayerInBadTop15) {
      const highlightedBadHunter = badHuntersProcessed.find((h: any) => h.hunterName === settings.highlightedPlayer);
      if (highlightedBadHunter) {
        finalBadHuntersData.push({
          ...highlightedBadHunter,
          isHighlightedAddition: true
        } as any);
        highlightedPlayerAddedToBad = true;
      }
    }

    return {
      finalBestHuntersData,
      highlightedPlayerAddedToBest,
      finalBadHuntersData,
      highlightedPlayerAddedToBad
    };
  })();

  const BestHunterTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.hunterName;

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
            <strong>Kills non-Villageois/partie:</strong> {data.averageNonVillageoisKillsPerGame.toFixed(2)}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Total non-Villageois tués:</strong> {data.nonVillageoisKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties en Chasseur:</strong> {data.gamesPlayedAsHunter}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Total kills:</strong> {data.totalKills}
          </p>

          {/* Camp breakdown */}
          {data.goodVictimsByCamp && Object.keys(data.goodVictimsByCamp).length > 0 && (
            <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
                Bonnes victimes:
              </p>
              {Object.entries(data.goodVictimsByCamp).map(([camp, count]: [string, any]) => (
                <p key={camp} style={{ 
                  color: lycansColors[camp as keyof typeof lycansColors] || 'var(--text-secondary)', 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{camp}:</strong> {count}
                </p>
              ))}
            </div>
          )}

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

  const BadHunterTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHighlightedAddition = data.isHighlightedAddition;
      const isHighlightedFromSettings = settings.highlightedPlayer === data.hunterName;

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
            <strong>Villageois tués/partie:</strong> {data.averageVillageoisKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Total Villageois tués:</strong> {data.totalVillageoisKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Total non-Villageois tués:</strong> {data.totalNonVillageoisKills}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Parties en Chasseur:</strong> {data.gamesPlayed}
          </p>
          <p style={{ color: 'var(--text-primary)', margin: '4px 0' }}>
            <strong>Total kills:</strong> {data.totalKills}
          </p>

          {/* Camp breakdown */}
          {data.badVictimsByCamp && Object.keys(data.badVictimsByCamp).length > 0 && (
            <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
                Mauvaises victimes:
              </p>
              {Object.entries(data.badVictimsByCamp).map(([camp, count]: [string, any]) => (
                <p key={camp} style={{ 
                  color: lycansColors[camp as keyof typeof lycansColors] || 'var(--text-secondary)', 
                  margin: '2px 0', 
                  fontSize: '0.8rem' 
                }}>
                  <strong>{camp}:</strong> {count}
                </p>
              ))}
            </div>
          )}

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

  return (
    <div className="lycans-graphiques-groupe">
      <div className="lycans-graphique-section">
        <div>
          <h3>Bons Chasseurs</h3>
          {highlightedPlayerAddedToBest && settings.highlightedPlayer && (
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--accent-primary-text)', 
              fontStyle: 'italic',
              marginTop: '0.25rem',
              marginBottom: '0.5rem'
            }}>
              🎯 "{settings.highlightedPlayer}" affiché en plus du top 15
            </p>
          )}
        </div>
        <FullscreenChart title="Bons Chasseurs">
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={finalBestHuntersData}
                margin={{ top: 60, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hunterName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={10}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      textAnchor="end"
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis label={{ 
                  value: 'Moyenne kills non-Villageois/partie', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<BestHunterTooltip />} />
                <Bar
                  dataKey="averageNonVillageoisKillsPerGame"
                  fill="var(--chart-primary)"
                  style={{ cursor: 'pointer' }}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as any;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.hunterName;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[entry.hunterName] || lycansColors['Chasseur'] || '#8884d8'}
                        stroke={
                          isHighlightedFromSettings
                            ? 'var(--accent-primary)'
                            : hoveredPlayer === entry.hunterName
                              ? 'var(--text-primary)'
                              : 'none'
                        }
                        strokeWidth={
                          isHighlightedFromSettings
                            ? 3
                            : hoveredPlayer === entry.hunterName
                              ? 2
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onClick={() => {
                          if (entry?.hunterName) {
                            navigateToGameDetails({
                              selectedPlayer: entry.hunterName,
                              campFilter: { selectedCamp: 'Chasseur', campFilterMode: 'all-assignments' },
                              fromComponent: 'Statistiques de Mort - Bons Chasseurs'
                            });
                          }
                        }}
                        onMouseEnter={() => setHoveredPlayer(entry.hunterName || null)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Top {Math.min(15, finalBestHuntersData.filter((h: any) => !h.isHighlightedAddition).length)} des chasseurs les plus efficaces contre les non-Villageois (minimum 5 parties en Chasseur)
        </p>
      </div>

      {/* Bad Hunters Chart */}
      <div className="lycans-graphique-section">
        <div>
          <h3>Mauvais Chasseurs</h3>
          {highlightedPlayerAddedToBad && settings.highlightedPlayer && (
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
        <FullscreenChart title="Mauvais Chasseurs">
          <div style={{ height: 440 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={finalBadHuntersData}
                margin={{ top: 60, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hunterName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={10}
                      fill={settings.highlightedPlayer === payload.value ? 'var(--accent-primary-text)' : 'var(--text-secondary)'}
                      fontSize={settings.highlightedPlayer === payload.value ? 14 : 12}
                      fontWeight={settings.highlightedPlayer === payload.value ? 'bold' : 'normal'}
                      textAnchor="end"
                      transform={`rotate(-45 ${x} ${y})`}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <YAxis label={{ 
                  value: 'Moyenne Villageois tués/partie', 
                  angle: 270, 
                  position: 'left', 
                  style: { textAnchor: 'middle' } 
                }} />
                <Tooltip content={<BadHunterTooltip />} />
                <Bar
                  dataKey="averageVillageoisKills"
                  fill="var(--chart-primary)"
                  style={{ cursor: 'pointer' }}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as any;
                    const isHighlightedFromSettings = settings.highlightedPlayer === entry.hunterName;
                    const isHighlightedAddition = entry.isHighlightedAddition;

                    return (
                      <Rectangle
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={playersColor[entry.hunterName] || lycansColors['Chasseur'] || '#8884d8'}
                        stroke={
                          isHighlightedFromSettings
                            ? 'var(--accent-primary)'
                            : hoveredPlayer === entry.hunterName
                              ? 'var(--text-primary)'
                              : 'none'
                        }
                        strokeWidth={
                          isHighlightedFromSettings
                            ? 3
                            : hoveredPlayer === entry.hunterName
                              ? 2
                              : 0
                        }
                        strokeDasharray={isHighlightedAddition ? '5,5' : 'none'}
                        opacity={isHighlightedAddition ? 0.8 : 1}
                        onClick={() => {
                          if (entry?.hunterName) {
                            navigateToGameDetails({
                              selectedPlayer: entry.hunterName,
                              campFilter: { selectedCamp: 'Chasseur', campFilterMode: 'all-assignments' },
                              fromComponent: 'Statistiques de Mort - Mauvais Chasseurs'
                            });
                          }
                        }}
                        onMouseEnter={() => setHoveredPlayer(entry.hunterName || null)}
                        onMouseLeave={() => setHoveredPlayer(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FullscreenChart>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
          Top {Math.min(15, finalBadHuntersData.filter((h: any) => !h.isHighlightedAddition).length)} des chasseurs ayant le plus tué de Villageois (minimum 5 parties en Chasseur)
        </p>
      </div>
    </div>
  );
}