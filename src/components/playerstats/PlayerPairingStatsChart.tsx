import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { usePlayerPairingStatsFromRaw } from '../../hooks/usePlayerPairingStatsFromRaw';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { findPlayerMostCommonPairings, findPlayerBestPerformingPairings, type ChartPlayerPairStat } from '../../hooks/utils/playerPairingUtils';
import { CHART_DEFAULTS } from '../../config/chartConstants';

export function PlayerPairingStatsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { data, isLoading, error } = usePlayerPairingStatsFromRaw();
  const { settings } = useSettings();
  
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Use navigationState to restore tab selection, fallback to 'wolves'
  const [selectedTab, setSelectedTab] = useState<'wolves' | 'lovers'>(
    navigationState.selectedPairingTab || 'wolves'
  );
  const [minWolfAppearances, setMinWolfAppearances] = useState<number>(CHART_DEFAULTS.MIN_WOLF_APPEARANCES);
  const [minLoverAppearances, setMinLoverAppearances] = useState<number>(CHART_DEFAULTS.MIN_LOVER_APPEARANCES);

  // Pairing selection state - initialize from navigationState or settings.highlightedPlayer
  const [pairingPlayer1, setPairingPlayer1] = useState<string | null>(
    navigationState.selectedPairingPlayers?.[0] || settings.highlightedPlayer || null
  );
  const [pairingPlayer2, setPairingPlayer2] = useState<string | null>(
    navigationState.selectedPairingPlayers?.[1] || null
  );

  // Sync pairing selection to navigationState
  useEffect(() => {
    const players = [pairingPlayer1, pairingPlayer2].filter(p => p !== null) as string[];
    if (players.length > 0) {
      updateNavigationState({ selectedPairingPlayers: players });
    } else {
      updateNavigationState({ selectedPairingPlayers: undefined });
    }
  }, [pairingPlayer1, pairingPlayer2, updateNavigationState]);

  // Options pour le nombre minimum d'apparitions
  const minLoverAppearancesOptions = [1, 2, 3, 5, 10];
  const minWolfAppearancesOptions = [1, 3, 5, 7, 10, 15];

  // Get unique player names from data for the selector
  const allPlayerNames = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    [...data.wolfPairs.pairs, ...data.loverPairs.pairs].forEach(pair => {
      pair.players.forEach(player => names.add(player));
    });
    return Array.from(names).sort();
  }, [data]);

  // Determine highlighting mode
  const isPairingMode = pairingPlayer1 !== null && pairingPlayer2 !== null;
  const isSinglePlayerMode = pairingPlayer1 !== null && pairingPlayer2 === null;
  const effectiveHighlightedPlayer = isSinglePlayerMode ? pairingPlayer1 : null;

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de paires...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée de paires disponible</div>;
  }

  // Helper function to get player color with fallback
  const getPlayerColor = (playerName: string): string => {
    return playersColor[playerName] || '#8884d8';
  };

  // Helper function to create gradient ID for a pair
  const createGradientId = (pair: string): string => {
    return `gradient-${pair.replace(/[^a-zA-Z0-9]/g, '')}`;
  };

  // Helper function to generate gradient definitions for all pairs
  const generateGradientDefs = (pairsData: any[]) => {
    return pairsData.map(pairData => {
      const [player1, player2] = pairData.players;
      const color1 = getPlayerColor(player1);
      const color2 = getPlayerColor(player2);
      const gradientId = createGradientId(pairData.pair);

      return (
        <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="50%" stopColor={color1} />
          <stop offset="50%" stopColor={color2} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      );
    });
  };

  // Show all pairs, even those with only 1 appearance
  const wolfPairsData = data.wolfPairs.pairs.map(pair => ({
    ...pair,
    winRateNum: parseFloat(pair.winRate),
    winRateDisplay: Math.max(parseFloat(pair.winRate), 1), // Ensure minimum 1% for visibility and clickability
    gradientId: createGradientId(pair.pair)
  }));

  const loverPairsData = data.loverPairs.pairs.map(pair => ({
    ...pair,
    winRateNum: parseFloat(pair.winRate),
    winRateDisplay: Math.max(parseFloat(pair.winRate), 1), // Ensure minimum 1% for visibility and clickability
    gradientId: createGradientId(pair.pair)
  }));

  // Find highlighted player's most common pairings (for frequency charts)
  const highlightedPlayerWolfPairs = effectiveHighlightedPlayer 
    ? findPlayerMostCommonPairings(data.wolfPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];
  
  const highlightedPlayerLoverPairs = effectiveHighlightedPlayer 
    ? findPlayerMostCommonPairings(data.loverPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];

  // Find highlighted player's best performing pairings (for performance charts)
  const highlightedPlayerWolfPairsPerformance = effectiveHighlightedPlayer 
    ? findPlayerBestPerformingPairings(data.wolfPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];
  
  const highlightedPlayerLoverPairsPerformance = effectiveHighlightedPlayer 
    ? findPlayerBestPerformingPairings(data.loverPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];

  // Find specific pairing if both players selected
  const specificWolfPairing = isPairingMode
    ? data.wolfPairs.pairs.filter(pair => 
        pair.players.includes(pairingPlayer1!) && pair.players.includes(pairingPlayer2!)
      )
    : [];
  
  const specificLoverPairing = isPairingMode
    ? data.loverPairs.pairs.filter(pair => 
        pair.players.includes(pairingPlayer1!) && pair.players.includes(pairingPlayer2!)
      )
    : [];

  // Total wolf pairs with at least minWolfAppearances
  const totalWolfPairsWithMinAppearances = wolfPairsData.filter(pair => pair.appearances >= minWolfAppearances).length;
  // Total lover pairs with at least minLoverAppearances
  const totalLoverPairsWithMinAppearances = loverPairsData.filter(pair => pair.appearances >= minLoverAppearances).length;

  // Helper function to combine top pairs with highlighted player pairs or specific pairing
  // This ensures highlighted player pairs are always shown, even if they weren't in the original top 10
  const combineWithHighlighted = (
    topPairs: any[],
    highlightedPairs: any[],
    specificPairing: any[]
  ): ChartPlayerPairStat[] => {
    const result = new Map<string, ChartPlayerPairStat>();
    
    // Add all top pairs
    topPairs.forEach(pair => {
      result.set(pair.pair, { ...pair, isHighlightedAddition: false });
    });
    
    // In pairing mode, add the specific pairing if it exists
    if (isPairingMode && specificPairing.length > 0) {
      specificPairing.forEach(pair => {
        const existing = result.get(pair.pair);
        if (!existing) {
          result.set(pair.pair, {
            ...pair,
            winRateNum: parseFloat(pair.winRate),
            winRateDisplay: Math.max(parseFloat(pair.winRate), 1),
            gradientId: createGradientId(pair.pair),
            isHighlightedAddition: true
          });
        }
      });
    }
    // In single player mode, add highlighted pairs
    else if (isSinglePlayerMode) {
      highlightedPairs.forEach(pair => {
        const existing = result.get(pair.pair);
        if (existing) {
          // Already in top results, just ensure it's properly formatted
          result.set(pair.pair, { 
            ...existing, 
            winRateNum: parseFloat(existing.winRate),
            winRateDisplay: Math.max(parseFloat(existing.winRate), 1),
            gradientId: createGradientId(existing.pair)
          });
        } else {
          // New addition from highlighted player
          result.set(pair.pair, { 
            ...pair, 
            winRateNum: parseFloat(pair.winRate),
            winRateDisplay: Math.max(parseFloat(pair.winRate), 1),
            gradientId: createGradientId(pair.pair),
            isHighlightedAddition: true 
          });
        }
      });
    }
    
    // Return all results - highlighted pairs should always be included
    // even if it means showing more than maxResults
    return Array.from(result.values());
  };

  // Split data for frequency vs performance charts
  const topWolfPairsByAppearances = combineWithHighlighted(
    [...wolfPairsData]
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 10),
    highlightedPlayerWolfPairs,
    specificWolfPairing
  );

  const topWolfPairsByWinRate = combineWithHighlighted(
    [...wolfPairsData]
      .filter(pair => pair.appearances >= minWolfAppearances)
      .sort((a, b) => b.winRateNum - a.winRateNum)
      .slice(0, 10),
    highlightedPlayerWolfPairsPerformance.filter(pair => pair.appearances >= minWolfAppearances),
    specificWolfPairing.filter(pair => pair.appearances >= minWolfAppearances)
  );

  const topLoverPairsByAppearances = combineWithHighlighted(
    [...loverPairsData]
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 10),
    highlightedPlayerLoverPairs,
    specificLoverPairing
  );

  const topLoverPairsByWinRate = combineWithHighlighted(
    [...loverPairsData]
      .filter(pair => pair.appearances >= minLoverAppearances)
      .sort((a, b) => b.winRateNum - a.winRateNum)
      .slice(0, 10),
    highlightedPlayerLoverPairsPerformance.filter(pair => pair.appearances >= minLoverAppearances),
    specificLoverPairing.filter(pair => pair.appearances >= minLoverAppearances)
  );

  const renderWolfPairsSection = () => (
    <div>

      <div className="lycans-graphiques-groupe">
        {/* Most Common Wolf Pairs */}
        <div className="lycans-graphique-moitie">
          <h3>Paires de Loups les Plus Fréquentes</h3>
          <FullscreenChart title="Paires de Loups les Plus Fréquentes">
            {topWolfPairsByAppearances.length > 0 ? (
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topWolfPairsByAppearances}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      {generateGradientDefs(topWolfPairsByAppearances)}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="pair" 
                      angle={-45} 
                      textAnchor="end" 
                      height={90} 
                      interval={0}
                      fontSize={11}
                      tick={({ x, y, payload }) => {
                        const isPairHighlighted = (effectiveHighlightedPlayer && 
                          payload.value.includes(effectiveHighlightedPlayer)) ||
                          (isPairingMode && payload.value.includes(pairingPlayer1!) && payload.value.includes(pairingPlayer2!));
                        return (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill={isPairHighlighted ? 'var(--accent-primary)' : 'var(--text-primary)'}
                            fontSize={isPairHighlighted ? 12 : 11}
                            fontWeight={isPairHighlighted ? 'bold' : 'normal'}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis 
                      label={{ value: 'Apparitions', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          const [player1, player2] = data.players;
                          return (
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)', 
                              padding: 12, 
                              borderRadius: 8,
                              border: '1px solid var(--border-color)'
                            }}>
                              <div><strong>{data.pair}</strong></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player1), borderRadius: '2px' }}></span>
                                <span>{player1}</span>
                                <span>+</span>
                                <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player2), borderRadius: '2px' }}></span>
                                <span>{player2}</span>
                              </div>
                              <div>Apparitions: {data.appearances}</div>
                              <div>Victoires: {data.wins}</div>
                              <div>Taux de victoire: {data.winRate}%</div>
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
                      }}
                    />
                    <Bar
                      dataKey="appearances"
                      name="Apparitions"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props;
                        const entry = payload as any;
                        const isHighlightedPair =
                          (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                          (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));

                        return (
                          <Rectangle
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={`url(#${entry.gradientId})`}
                            stroke={
                              isHighlightedPair
                                ? 'var(--accent-primary)'
                                : entry.isHighlightedAddition
                                  ? 'var(--accent-secondary)'
                                  : 'transparent'
                            }
                            strokeWidth={
                              isHighlightedPair
                                ? 3
                                : entry.isHighlightedAddition
                                  ? 2
                                  : 0
                            }
                            onClick={() => {
                              navigateToGameDetails({
                                playerPairFilter: {
                                  selectedPlayerPair: entry.players,
                                  selectedPairRole: 'wolves'
                                },
                                fromComponent: 'Paires de Loups les Plus Fréquentes'
                              });
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="lycans-empty-section">
                <p>Aucune paire récurrente trouvée</p>
              </div>
            )}
            </FullscreenChart>
        </div>

        {/* Best Performing Wolf Pairs */}
        <div className="lycans-graphique-moitie">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Paires de Loups les Plus Performantes</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="min-wolf-appearances-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. apparitions:
              </label>
              <select
                id="min-wolf-appearances-select"
                value={minWolfAppearances}
                onChange={(e) => setMinWolfAppearances(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {minWolfAppearancesOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FullscreenChart title="Paires de Loups les Plus Performantes">
          {topWolfPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topWolfPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    {generateGradientDefs(topWolfPairsByWinRate)}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="pair" 
                    angle={-45} 
                    textAnchor="end" 
                    height={90} 
                    interval={0}
                    fontSize={11}
                    tick={({ x, y, payload }) => {
                      const isPairHighlighted = (effectiveHighlightedPlayer && 
                        payload.value.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && payload.value.includes(pairingPlayer1!) && payload.value.includes(pairingPlayer2!));
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={isPairHighlighted ? 'var(--accent-primary)' : 'var(--text-primary)'}
                          fontSize={isPairHighlighted ? 12 : 11}
                          fontWeight={isPairHighlighted ? 'bold' : 'normal'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    domain={[0, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const [player1, player2] = data.players;
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player1), borderRadius: '2px' }}></span>
                              <span>{player1}</span>
                              <span>+</span>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player2), borderRadius: '2px' }}></span>
                              <span>{player2}</span>
                            </div>
                            <div>Taux de victoire: {data.winRate}%</div>
                            <div>Victoires: {data.wins} / {data.appearances}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="winRateDisplay"
                    name="Taux de victoire (%)"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as any;
                      const isHighlightedPair =
                        (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#${entry.gradientId})`}
                          fillOpacity={parseFloat(entry.winRate) === 0 ? 0.3 : 1}
                          stroke={
                            isHighlightedPair
                              ? 'var(--accent-primary)'
                              : entry.isHighlightedAddition
                                ? 'var(--accent-secondary)'
                                : 'transparent'
                          }
                          strokeWidth={
                            isHighlightedPair
                              ? 3
                              : entry.isHighlightedAddition
                                ? 2
                                : 0
                          }
                          onClick={() => {
                            navigateToGameDetails({
                              playerPairFilter: {
                                selectedPlayerPair: entry.players,
                                selectedPairRole: 'wolves'
                              },
                              fromComponent: 'Paires de Loups les Plus Performantes'
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Pas assez de données pour analyser la performance</p>
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {topWolfPairsByWinRate.length} des paires (sur {totalWolfPairsWithMinAppearances}) avec au moins {minWolfAppearances} apparition{minWolfAppearances > 1 ? 's' : ''}
          </p>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );

  const renderLoverPairsSection = () => (
    <div>
      <div className="lycans-graphiques-groupe">
        {/* Most Common Lover Pairs */}
        <div className="lycans-graphique-moitie">
          <h3>Paires d'Amoureux les Plus Fréquentes</h3>
          <FullscreenChart title="Paires d'Amoureux les Plus Fréquentes">
          {topLoverPairsByAppearances.length > 0 ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLoverPairsByAppearances}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    {generateGradientDefs(topLoverPairsByAppearances)}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="pair" 
                    angle={-45} 
                    textAnchor="end" 
                    height={90} 
                    interval={0}
                    fontSize={11}
                    tick={({ x, y, payload }) => {
                      const isPairHighlighted = (effectiveHighlightedPlayer && 
                        payload.value.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && payload.value.includes(pairingPlayer1!) && payload.value.includes(pairingPlayer2!));
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={isPairHighlighted ? 'var(--accent-primary)' : 'var(--text-primary)'}
                          fontSize={isPairHighlighted ? 12 : 11}
                          fontWeight={isPairHighlighted ? 'bold' : 'normal'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <YAxis 
                    label={{ value: 'Apparitions', angle: 270, position: 'left', style: { textAnchor: 'middle' } }} 
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const [player1, player2] = data.players;
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player1), borderRadius: '2px' }}></span>
                              <span>{player1}</span>
                              <span>+</span>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player2), borderRadius: '2px' }}></span>
                              <span>{player2}</span>
                            </div>
                            <div>Apparitions: {data.appearances}</div>
                            <div>Victoires: {data.wins}</div>
                            <div>Taux de victoire: {data.winRate}%</div>
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
                    }}
                  />
                  <Bar
                    dataKey="appearances"
                    name="Apparitions"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as any;
                      const isHighlightedPair =
                        (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#${entry.gradientId})`}
                          stroke={
                            isHighlightedPair
                              ? 'var(--accent-primary)'
                              : entry.isHighlightedAddition
                                ? 'var(--accent-secondary)'
                                : 'transparent'
                          }
                          strokeWidth={
                            isHighlightedPair
                              ? 3
                              : entry.isHighlightedAddition
                                ? 2
                                : 0
                          }
                          onClick={() => {
                            navigateToGameDetails({
                              playerPairFilter: {
                                selectedPlayerPair: entry.players,
                                selectedPairRole: 'lovers'
                              },
                              fromComponent: 'Paires d\'Amoureux les Plus Fréquentes'
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Aucune paire d'amoureux trouvée</p>
            </div>
          )}
          </FullscreenChart>
        </div>

        {/* Best Performing Lover Pairs */}
        <div className="lycans-graphique-moitie">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Paires d'Amoureux les Plus Performantes</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="min-lover-appearances-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. apparitions:
              </label>
              <select
                id="min-lover-appearances-select"
                value={minLoverAppearances}
                onChange={(e) => setMinLoverAppearances(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {minLoverAppearancesOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FullscreenChart title="Paires d'Amoureux les Plus Performantes">
          {topLoverPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLoverPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    {generateGradientDefs(topLoverPairsByWinRate)}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="pair" 
                    angle={-45} 
                    textAnchor="end" 
                    height={90} 
                    interval={0}
                    fontSize={11}
                    tick={({ x, y, payload }) => {
                      const isPairHighlighted = (effectiveHighlightedPlayer && 
                        payload.value.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && payload.value.includes(pairingPlayer1!) && payload.value.includes(pairingPlayer2!));
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={16}
                          textAnchor="end"
                          fill={isPairHighlighted ? 'var(--accent-primary)' : 'var(--text-primary)'}
                          fontSize={isPairHighlighted ? 12 : 11}
                          fontWeight={isPairHighlighted ? 'bold' : 'normal'}
                          transform={`rotate(-45 ${x} ${y})`}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const [player1, player2] = data.players;
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player1), borderRadius: '2px' }}></span>
                              <span>{player1}</span>
                              <span>+</span>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player2), borderRadius: '2px' }}></span>
                              <span>{player2}</span>
                            </div>
                            <div>Taux de victoire: {data.winRate}%</div>
                            <div>Victoires: {data.wins} / {data.appearances}</div>
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
                    }}
                  />
                  <Bar
                    dataKey="winRateDisplay"
                    name="Taux de victoire (%)"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as any;
                      const isHighlightedPair =
                        (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#${entry.gradientId})`}
                          fillOpacity={parseFloat(entry.winRate) === 0 ? 0.3 : 1}
                          stroke={
                            isHighlightedPair
                              ? 'var(--accent-primary)'
                              : entry.isHighlightedAddition
                                ? 'var(--accent-secondary)'
                                : 'transparent'
                          }
                          strokeWidth={
                            isHighlightedPair
                              ? 3
                              : entry.isHighlightedAddition
                                ? 2
                                : 0
                          }
                          onClick={() => {
                            navigateToGameDetails({
                              playerPairFilter: {
                                selectedPlayerPair: entry.players,
                                selectedPairRole: 'lovers'
                              },
                              fromComponent: 'Paires d\'Amoureux les Plus Performantes'
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Pas assez de données pour analyser la performance</p>
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
            Top {topLoverPairsByWinRate.length} des paires (sur {totalLoverPairsWithMinAppearances}) avec au moins {minLoverAppearances} apparition{minLoverAppearances > 1 ? 's' : ''}
          </p>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );

  return (
    <div className="lycans-players-pairing">
      <h2>Analyse des Paires de Joueurs</h2>
      <p className="lycans-stats-info">
        Fréquence et performance des joueurs lorsqu'ils jouent ensemble en tant que loups ou amoureux
      </p>
      
      {/* Pairing Selection UI */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '1rem',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Mettre en évidence une paire:</label>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="pairing-player1-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Joueur 1:
            </label>
            <select
              id="pairing-player1-select"
              value={pairingPlayer1 || ''}
              onChange={(e) => setPairingPlayer1(e.target.value || null)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem',
                minWidth: '150px'
              }}
            >
              <option value="">-- Aucun --</option>
              {allPlayerNames.map(player => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="pairing-player2-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Joueur 2:
            </label>
            <select
              id="pairing-player2-select"
              value={pairingPlayer2 || ''}
              onChange={(e) => setPairingPlayer2(e.target.value || null)}
              disabled={!pairingPlayer1}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem',
                minWidth: '150px',
                opacity: !pairingPlayer1 ? 0.5 : 1,
                cursor: !pairingPlayer1 ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">-- Aucun --</option>
              {allPlayerNames.filter(p => p !== pairingPlayer1).map(player => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
          </div>

          {pairingPlayer1 && (
            <button
              onClick={() => {
                setPairingPlayer1(null);
                setPairingPlayer2(null);
              }}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              type="button"
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>
        
        {isPairingMode && (
          <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '0.5rem', marginBottom: 0 }}>
            📊 Mode paire activé: {pairingPlayer1} + {pairingPlayer2}
          </p>
        )}
        {isSinglePlayerMode && (
          <p style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
            👤 Mode joueur unique: {pairingPlayer1}
          </p>
        )}
      </div>
      
      {/* Tab Selection */}
      <nav className="lycans-submenu">
        <button
          className={`lycans-submenu-btn${selectedTab === 'wolves' ? ' active' : ''}`}
          onClick={() => {
            setSelectedTab('wolves');
            updateNavigationState({ selectedPairingTab: 'wolves' });
          }}
          type="button"
        >
          Paires de Loups ({data.wolfPairs.pairs.length})
        </button>
        <button
          className={`lycans-submenu-btn${selectedTab === 'lovers' ? ' active' : ''}`}
          onClick={() => {
            setSelectedTab('lovers');
            updateNavigationState({ selectedPairingTab: 'lovers' });
          }}
          type="button"
        >
          Paires d'Amoureux ({data.loverPairs.pairs.length})
        </button>
      </nav>

      <div className="lycans-dashboard-content">
        {selectedTab === 'wolves' ? renderWolfPairsSection() : renderLoverPairsSection()}
      </div>
    </div>
  );
}