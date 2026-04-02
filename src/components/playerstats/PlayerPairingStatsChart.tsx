import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle, ReferenceLine } from 'recharts';
import { usePlayerPairingStatsFromRaw } from '../../hooks/usePlayerPairingStatsFromRaw';
import { useJoueursData } from '../../hooks/useJoueursData';
import { useThemeAdjustedDynamicPlayersColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { useNavigation } from '../../context/NavigationContext';
import { useSettings } from '../../context/SettingsContext';
import { findPlayerMostCommonPairings, findPlayerBestPerformingPairings, type ChartPlayerPairStat, type ChartAgentPairStat } from '../../hooks/utils/playerPairingUtils';
import { usePlayerSynergyFromRaw } from '../../hooks/usePlayerSynergyFromRaw';
import { findPlayerBestSynergies, findPlayerWorstSynergies } from '../../hooks/utils/playerSynergyUtils';
import type { PlayerSynergyPair, ChartSynergyPair } from '../../hooks/utils/playerSynergyUtils';
import { CHART_DEFAULTS, CHART_LIMITS, MIN_GAMES_OPTIONS, MIN_GAMES_DEFAULTS } from '../../config/chartConstants';

export function PlayerPairingStatsChart() {
  const { navigateToGameDetails, navigationState, updateNavigationState } = useNavigation();
  const { data, isLoading, error } = usePlayerPairingStatsFromRaw();
  const { settings } = useSettings();
  
  const { joueursData } = useJoueursData();
  const playersColor = useThemeAdjustedDynamicPlayersColor(joueursData);

  // Use navigationState to restore tab selection, fallback to 'wolves'
  const [selectedTab, setSelectedTab] = useState<'wolves' | 'lovers' | 'agents' | 'synergies'>(
    navigationState.selectedPairingTab || 'wolves'
  );

  const { data: synergyData, isLoading: synergyLoading } = usePlayerSynergyFromRaw();
  const [minSameCampGames, setMinSameCampGames] = useState<number>(MIN_GAMES_DEFAULTS.STANDARD);
  const [minWolfAppearances, setMinWolfAppearances] = useState<number>(CHART_DEFAULTS.MIN_WOLF_APPEARANCES);
  const [minLoverAppearances, setMinLoverAppearances] = useState<number>(CHART_DEFAULTS.MIN_LOVER_APPEARANCES);
  const [minAgentAppearances, setMinAgentAppearances] = useState<number>(CHART_DEFAULTS.MIN_AGENT_APPEARANCES);

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


  // Get unique player names from data for the selector
  const allPlayerNames = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    [...data.wolfPairs.pairs, ...data.loverPairs.pairs, ...data.agentPairs.pairs].forEach(pair => {
      pair.players.forEach(player => names.add(player));
    });
    return Array.from(names).sort();
  }, [data]);

  // Determine highlighting mode
  const isPairingMode = pairingPlayer1 !== null && pairingPlayer2 !== null;
  const isSinglePlayerMode = pairingPlayer1 !== null && pairingPlayer2 === null;
  const effectiveHighlightedPlayer = isSinglePlayerMode ? pairingPlayer1 : null;

  // Synergy useMemo hooks — must be before early returns (Rules of Hooks)
  const synergyEligiblePairs = useMemo(() => {
    if (!synergyData) return [];
    return synergyData.pairs.filter(p => p.sameCampGames >= minSameCampGames);
  }, [synergyData, minSameCampGames]);

  // Find the specific synergy pair when two players are selected
  const specificSynergyPair = useMemo(() => {
    if (!isPairingMode || !synergyData) return [];
    return synergyData.pairs.filter(pair =>
      pair.players.includes(pairingPlayer1!) && pair.players.includes(pairingPlayer2!)
    );
  }, [isPairingMode, synergyData, pairingPlayer1, pairingPlayer2]);

  const bestSynergies = useMemo(() => {
    const createId = (pair: string, prefix: string) => `${prefix}-syn-${pair.replace(/[^a-zA-Z0-9]/g, '')}`;
    const combine = (topPairs: PlayerSynergyPair[], highlightedPairs: PlayerSynergyPair[], specific: PlayerSynergyPair[], prefix: string): ChartSynergyPair[] => {
      const result = new Map<string, ChartSynergyPair>();
      topPairs.forEach(pair => result.set(pair.pair, { ...pair, isHighlightedAddition: false, gradientId: createId(pair.pair, prefix) }));
      // In pairing mode, add the specific pair if not already present
      if (isPairingMode && specific.length > 0) {
        specific.forEach(pair => {
          if (!result.has(pair.pair)) {
            result.set(pair.pair, { ...pair, isHighlightedAddition: true, gradientId: createId(pair.pair, prefix) });
          }
        });
      }
      // In single player mode, add highlighted pairs
      else if (effectiveHighlightedPlayer) {
        highlightedPairs.forEach(pair => {
          const existing = result.get(pair.pair);
          if (existing) result.set(pair.pair, { ...existing, gradientId: createId(existing.pair, prefix) });
          else result.set(pair.pair, { ...pair, isHighlightedAddition: true, gradientId: createId(pair.pair, prefix) });
        });
      }
      return Array.from(result.values());
    };
    const top = synergyEligiblePairs.filter(p => p.synergyScore > 0).slice(0, CHART_LIMITS.TOP_10);
    const highlighted = effectiveHighlightedPlayer
      ? findPlayerBestSynergies(synergyData?.pairs || [], effectiveHighlightedPlayer, minSameCampGames, 5).filter(p => p.synergyScore > 0)
      : [];
    return combine(top, highlighted, specificSynergyPair.filter(p => p.synergyScore > 0), 'best');
  }, [synergyEligiblePairs, effectiveHighlightedPlayer, isPairingMode, specificSynergyPair, synergyData, minSameCampGames]);

  const worstSynergies = useMemo(() => {
    const createId = (pair: string, prefix: string) => `${prefix}-syn-${pair.replace(/[^a-zA-Z0-9]/g, '')}`;
    const combine = (topPairs: PlayerSynergyPair[], highlightedPairs: PlayerSynergyPair[], specific: PlayerSynergyPair[], prefix: string): ChartSynergyPair[] => {
      const result = new Map<string, ChartSynergyPair>();
      topPairs.forEach(pair => result.set(pair.pair, { ...pair, isHighlightedAddition: false, gradientId: createId(pair.pair, prefix) }));
      if (isPairingMode && specific.length > 0) {
        specific.forEach(pair => {
          if (!result.has(pair.pair)) {
            result.set(pair.pair, { ...pair, isHighlightedAddition: true, gradientId: createId(pair.pair, prefix) });
          }
        });
      }
      else if (effectiveHighlightedPlayer) {
        highlightedPairs.forEach(pair => {
          const existing = result.get(pair.pair);
          if (existing) result.set(pair.pair, { ...existing, gradientId: createId(existing.pair, prefix) });
          else result.set(pair.pair, { ...pair, isHighlightedAddition: true, gradientId: createId(pair.pair, prefix) });
        });
      }
      return Array.from(result.values());
    };
    const bottom = [...synergyEligiblePairs]
      .filter(p => p.synergyScore < 0)
      .sort((a, b) => a.synergyScore - b.synergyScore)
      .slice(0, CHART_LIMITS.TOP_10);
    const highlighted = effectiveHighlightedPlayer
      ? findPlayerWorstSynergies(synergyData?.pairs || [], effectiveHighlightedPlayer, minSameCampGames, 5).filter(p => p.synergyScore < 0)
      : [];
    return combine(bottom, highlighted, specificSynergyPair.filter(p => p.synergyScore < 0), 'worst');
  }, [synergyEligiblePairs, effectiveHighlightedPlayer, isPairingMode, specificSynergyPair, synergyData, minSameCampGames]);

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

  const agentPairsData = data.agentPairs.pairs.map(pair => ({
    ...pair,
    winRateNum: parseFloat(pair.winRate),
    winRateDisplay: Math.max(parseFloat(pair.winRate), 1),
    player1WinRateNum: parseFloat(pair.player1WinRate),
    player2WinRateNum: parseFloat(pair.player2WinRate),
    gradientId: createGradientId(pair.pair)
  }));
  const highlightedPlayerWolfPairs = effectiveHighlightedPlayer 
    ? findPlayerMostCommonPairings(data.wolfPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];
  
  const highlightedPlayerLoverPairs = effectiveHighlightedPlayer 
    ? findPlayerMostCommonPairings(data.loverPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];

  const highlightedPlayerAgentPairs = effectiveHighlightedPlayer 
    ? findPlayerMostCommonPairings(data.agentPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];

  // Find highlighted player's best performing pairings (for performance charts)
  const highlightedPlayerWolfPairsPerformance = effectiveHighlightedPlayer 
    ? findPlayerBestPerformingPairings(data.wolfPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];
  
  const highlightedPlayerLoverPairsPerformance = effectiveHighlightedPlayer 
    ? findPlayerBestPerformingPairings(data.loverPairs.pairs, effectiveHighlightedPlayer, 5)
    : [];

  const highlightedPlayerAgentPairsPerformance = effectiveHighlightedPlayer 
    ? findPlayerBestPerformingPairings(data.agentPairs.pairs, effectiveHighlightedPlayer, 5)
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

  const specificAgentPairing = isPairingMode
    ? data.agentPairs.pairs.filter(pair => 
        pair.players.includes(pairingPlayer1!) && pair.players.includes(pairingPlayer2!)
      )
    : [];

  // Total wolf pairs with at least minWolfAppearances
  const totalWolfPairsWithMinAppearances = wolfPairsData.filter(pair => pair.appearances >= minWolfAppearances).length;
  // Total lover pairs with at least minLoverAppearances
  const totalLoverPairsWithMinAppearances = loverPairsData.filter(pair => pair.appearances >= minLoverAppearances).length;
  // Total agent pairs with at least minAgentAppearances
  const totalAgentPairsWithMinAppearances = agentPairsData.filter(pair => pair.appearances >= minAgentAppearances).length;

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

  // Agent pair combining function (similar but typed for ChartAgentPairStat)
  const combineWithHighlightedAgents = (
    topPairs: any[],
    highlightedPairs: any[],
    specificPairing: any[]
  ): ChartAgentPairStat[] => {
    const result = new Map<string, ChartAgentPairStat>();
    
    topPairs.forEach(pair => {
      result.set(pair.pair, { ...pair, isHighlightedAddition: false });
    });
    
    if (isPairingMode && specificPairing.length > 0) {
      specificPairing.forEach(pair => {
        const existing = result.get(pair.pair);
        if (!existing) {
          result.set(pair.pair, {
            ...pair,
            winRateNum: parseFloat(pair.winRate),
            winRateDisplay: Math.max(parseFloat(pair.winRate), 1),
            player1WinRateNum: parseFloat(pair.player1WinRate),
            player2WinRateNum: parseFloat(pair.player2WinRate),
            gradientId: createGradientId(pair.pair),
            isHighlightedAddition: true
          });
        }
      });
    } else if (isSinglePlayerMode) {
      highlightedPairs.forEach(pair => {
        const existing = result.get(pair.pair);
        if (existing) {
          result.set(pair.pair, { 
            ...existing, 
            winRateNum: parseFloat(existing.winRate),
            winRateDisplay: Math.max(parseFloat(existing.winRate), 1),
            gradientId: createGradientId(existing.pair)
          });
        } else {
          result.set(pair.pair, { 
            ...pair, 
            winRateNum: parseFloat(pair.winRate),
            winRateDisplay: Math.max(parseFloat(pair.winRate), 1),
            player1WinRateNum: parseFloat(pair.player1WinRate),
            player2WinRateNum: parseFloat(pair.player2WinRate),
            gradientId: createGradientId(pair.pair),
            isHighlightedAddition: true 
          });
        }
      });
    }
    
    return Array.from(result.values());
  };

  const topAgentPairsByAppearances = combineWithHighlightedAgents(
    [...agentPairsData]
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 10),
    highlightedPlayerAgentPairs,
    specificAgentPairing
  );

  const topAgentPairsByWinRate = combineWithHighlightedAgents(
    [...agentPairsData]
      .filter(pair => pair.appearances >= minAgentAppearances)
      .sort((a, b) => b.winRateNum - a.winRateNum)
      .slice(0, 10),
    highlightedPlayerAgentPairsPerformance.filter(pair => pair.appearances >= minAgentAppearances),
    specificAgentPairing.filter(pair => pair.appearances >= minAgentAppearances)
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
                {MIN_GAMES_OPTIONS.MINIMAL.map(option => (
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
                {MIN_GAMES_OPTIONS.MINIMAL.map(option => (
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

  const renderAgentPairsSection = () => (
    <div>
      <div className="lycans-graphiques-groupe">
        {/* Most Common Agent Pairs */}
        <div className="lycans-graphique-moitie">
          <h3>Paires d'Agents les Plus Fréquentes</h3>
          <FullscreenChart title="Paires d'Agents les Plus Fréquentes">
          {topAgentPairsByAppearances.length > 0 ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topAgentPairsByAppearances}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    {generateGradientDefs(topAgentPairsByAppearances)}
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
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player1), borderRadius: '2px', display: 'inline-block' }}></span>
                              <span>{player1}</span>
                              <span>vs</span>
                              <span style={{ width: '12px', height: '12px', backgroundColor: getPlayerColor(player2), borderRadius: '2px', display: 'inline-block' }}></span>
                              <span>{player2}</span>
                            </div>
                            <div>Apparitions: {data.appearances}</div>
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ color: getPlayerColor(player1) }}>🏆 {player1}: {data.player1Wins ?? 0} victoire{(data.player1Wins ?? 0) > 1 ? 's' : ''} ({data.player1WinRate ?? '0.00'}%)</div>
                              <div style={{ color: getPlayerColor(player2) }}>🏆 {player2}: {data.player2Wins ?? 0} victoire{(data.player2Wins ?? 0) > 1 ? 's' : ''} ({data.player2WinRate ?? '0.00'}%)</div>
                            </div>
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
                                selectedPairRole: 'agents'
                              },
                              fromComponent: 'Paires d\'Agents les Plus Fréquentes'
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
              <p>Aucune paire d'agents trouvée</p>
            </div>
          )}
          </FullscreenChart>
        </div>

        {/* Best Performing Agent Pairs - shows per-player win rates */}
        <div className="lycans-graphique-moitie">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Performance des Paires d'Agents</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="min-agent-appearances-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Min. apparitions:
              </label>
              <select
                id="min-agent-appearances-select"
                value={minAgentAppearances}
                onChange={(e) => setMinAgentAppearances(Number(e.target.value))}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                {MIN_GAMES_OPTIONS.MINIMAL.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FullscreenChart title="Performance des Paires d'Agents">
          {topAgentPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topAgentPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barGap={0}
                  barCategoryGap="20%"
                >
                  <defs>
                    {topAgentPairsByWinRate.map(pairData => {
                      const [player1, player2] = pairData.players;
                      return [
                        <linearGradient key={`p1-${pairData.pair}`} id={`agent-p1-${pairData.pair.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={getPlayerColor(player1)} stopOpacity={1} />
                          <stop offset="100%" stopColor={getPlayerColor(player1)} stopOpacity={0.7} />
                        </linearGradient>,
                        <linearGradient key={`p2-${pairData.pair}`} id={`agent-p2-${pairData.pair.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={getPlayerColor(player2)} stopOpacity={1} />
                          <stop offset="100%" stopColor={getPlayerColor(player2)} stopOpacity={0.7} />
                        </linearGradient>
                      ];
                    })}
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
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              {data.appearances} confrontation{data.appearances > 1 ? 's' : ''}
                            </div>
                            <div style={{ color: getPlayerColor(player1), fontWeight: 'bold' }}>
                              🏆 {player1}: {data.player1Wins ?? 0} victoire{(data.player1Wins ?? 0) > 1 ? 's' : ''} ({data.player1WinRate ?? '0.00'}%)
                            </div>
                            <div style={{ color: getPlayerColor(player2), fontWeight: 'bold' }}>
                              🏆 {player2}: {data.player2Wins ?? 0} victoire{(data.player2Wins ?? 0) > 1 ? 's' : ''} ({data.player2WinRate ?? '0.00'}%)
                            </div>
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
                    dataKey="player1WinRateNum"
                    name="Joueur 1"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as any;
                      const isHighlightedPair =
                        (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));
                      const gradId = `agent-p1-${entry.pair.replace(/[^a-zA-Z0-9]/g, '')}`;

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#${gradId})`}
                          fillOpacity={parseFloat(entry.player1WinRate) === 0 ? 0.3 : 1}
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
                                selectedPairRole: 'agents'
                              },
                              fromComponent: 'Performance des Paires d\'Agents'
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  />
                  <Bar
                    dataKey="player2WinRateNum"
                    name="Joueur 2"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as any;
                      const isHighlightedPair =
                        (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                        (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));
                      const gradId = `agent-p2-${entry.pair.replace(/[^a-zA-Z0-9]/g, '')}`;

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={`url(#${gradId})`}
                          fillOpacity={parseFloat(entry.player2WinRate) === 0 ? 0.3 : 1}
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
                                selectedPairRole: 'agents'
                              },
                              fromComponent: 'Performance des Paires d\'Agents'
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
            Top {topAgentPairsByWinRate.length} des paires (sur {totalAgentPairsWithMinAppearances}) avec au moins {minAgentAppearances} apparition{minAgentAppearances > 1 ? 's' : ''}
            <br />
            <span style={{ fontStyle: 'italic' }}>Chaque barre représente le taux de victoire de chaque agent</span>
          </p>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );

  // --- Synergy section helpers ---
  const createSynergyGradientId = (pair: string, prefix: string): string =>
    `${prefix}-syn-${pair.replace(/[^a-zA-Z0-9]/g, '')}`;

  const generateSynergyGradientDefs = (pairsData: ChartSynergyPair[], prefix: string) =>
    pairsData.map(pairData => {
      const [p1, p2] = pairData.players;
      const gradientId = createSynergyGradientId(pairData.pair, prefix);
      return (
        <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={playersColor[p1] || '#8884d8'} />
          <stop offset="50%" stopColor={playersColor[p1] || '#8884d8'} />
          <stop offset="50%" stopColor={playersColor[p2] || '#8884d8'} />
          <stop offset="100%" stopColor={playersColor[p2] || '#8884d8'} />
        </linearGradient>
      );
    });

  const renderSynergyTooltip = (active: boolean | undefined, payload: any[] | undefined) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0].payload as ChartSynergyPair;
    const [p1, p2] = entry.players;
    const scoreColor = entry.synergyScore >= 0 ? '#4caf50' : '#f44336';
    return (
      <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', maxWidth: 320 }}>
        <div style={{ marginBottom: 8 }}><strong>{entry.pair}</strong></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
          <span style={{ width: 12, height: 12, backgroundColor: playersColor[p1] || '#8884d8', borderRadius: 2, display: 'inline-block' }}></span>
          <span>{p1}</span><span>+</span>
          <span style={{ width: 12, height: 12, backgroundColor: playersColor[p2] || '#8884d8', borderRadius: 2, display: 'inline-block' }}></span>
          <span>{p2}</span>
        </div>
        <div>Parties ensemble : {entry.gamesTogether}</div>
        <div>Même camp : {entry.sameCampGames} parties</div>
        <div>Victoires même camp : {entry.sameCampWins} ({entry.sameCampWinRate}%)</div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
        <div>Taux individuel {p1} : {entry.player1WinRate}%</div>
        <div>Taux individuel {p2} : {entry.player2WinRate}%</div>
        <div>Taux attendu : {entry.expectedWinRate}%</div>
        <div style={{ marginTop: 6, fontWeight: 'bold', color: scoreColor, fontSize: '1.05rem' }}>
          Synergie : {entry.synergyScore > 0 ? '+' : ''}{entry.synergyScore}%
        </div>
      </div>
    );
  };

  const renderSynergyHalf = (chartData: ChartSynergyPair[], title: string, prefix: string, emptyMessage: string) => (
    <div className="lycans-graphique-moitie">
      <h3>{title}</h3>
      <FullscreenChart title={title}>
        {chartData.length > 0 ? (
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>{generateSynergyGradientDefs(chartData, prefix)}</defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="pair" angle={-45} textAnchor="end" height={90} interval={0} fontSize={11}
                  tick={({ x, y, payload }) => {
                    const isHighlighted = (effectiveHighlightedPlayer && payload.value.includes(effectiveHighlightedPlayer)) ||
                      (isPairingMode && payload.value.includes(pairingPlayer1!) && payload.value.includes(pairingPlayer2!));
                    return (
                      <text x={x} y={y} dy={16} textAnchor="end"
                        fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-primary)'}
                        fontSize={isHighlighted ? 12 : 11}
                        fontWeight={isHighlighted ? 'bold' : 'normal'}
                        transform={`rotate(-45 ${x} ${y})`}>
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <YAxis
                  label={{ value: 'Score de Synergie (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                />
                <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="3 3" />
                <Tooltip content={({ active, payload }) => renderSynergyTooltip(active, payload ? [...payload] : undefined)} />
                <Bar dataKey="synergyScore" name="Synergie"
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const entry = payload as ChartSynergyPair;
                    const isHighlightedPair = (effectiveHighlightedPlayer && entry.players.includes(effectiveHighlightedPlayer)) ||
                      (isPairingMode && entry.players.includes(pairingPlayer1!) && entry.players.includes(pairingPlayer2!));
                    return (
                      <Rectangle x={x} y={y} width={width} height={height}
                        fill={`url(#${entry.gradientId})`}
                        stroke={isHighlightedPair ? 'var(--accent-primary)' : entry.isHighlightedAddition ? 'var(--accent-secondary)' : 'transparent'}
                        strokeWidth={isHighlightedPair ? 3 : entry.isHighlightedAddition ? 2 : 0}
                        strokeDasharray={entry.isHighlightedAddition ? '5,5' : 'none'}
                        opacity={entry.isHighlightedAddition ? 0.8 : 1}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="lycans-empty-section"><p>{emptyMessage}</p></div>
        )}
      </FullscreenChart>
    </div>
  );

  const renderSynergiesSection = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Le score de synergie mesure la différence entre le taux de victoire quand deux joueurs sont dans le même camp
          et la moyenne de leurs taux de victoire individuels. Un score positif signifie qu'ils performent mieux ensemble.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
          {synergyEligiblePairs.length} paires avec au moins {minSameCampGames} parties dans le même camp
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <label htmlFor="min-synergy-games-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Min. parties même camp :
        </label>
        <select
          id="min-synergy-games-select"
          value={minSameCampGames}
          onChange={(e) => setMinSameCampGames(Number(e.target.value))}
          style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
        >
          {MIN_GAMES_OPTIONS.STANDARD.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      {synergyLoading ? (
        <div className="donnees-attente">Chargement des synergies...</div>
      ) : (
        <div className="lycans-graphiques-groupe">
          {renderSynergyHalf(bestSynergies, 'Meilleures Synergies', 'best', 'Aucune paire avec une synergie positive trouvée')}
          {renderSynergyHalf(worstSynergies, 'Pires Anti-Synergies', 'worst', 'Aucune paire avec une anti-synergie trouvée')}
        </div>
      )}
    </div>
  );

  return (
    <div className="lycans-players-pairing">
      <h2>Analyse des Paires de Joueurs</h2>
      <p className="lycans-stats-info">
        Fréquence et performance des joueurs lorsqu'ils jouent ensemble en tant que loups, amoureux ou agents
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
        <button
          className={`lycans-submenu-btn${selectedTab === 'agents' ? ' active' : ''}`}
          onClick={() => {
            setSelectedTab('agents');
            updateNavigationState({ selectedPairingTab: 'agents' });
          }}
          type="button"
        >
          Paires d'Agents ({data.agentPairs.pairs.length})
        </button>
        <button
          className={`lycans-submenu-btn${selectedTab === 'synergies' ? ' active' : ''}`}
          onClick={() => {
            setSelectedTab('synergies');
            updateNavigationState({ selectedPairingTab: 'synergies' });
          }}
          type="button"
        >
          Synergies
        </button>
      </nav>

      <div className="lycans-dashboard-content">
        {selectedTab === 'wolves' && renderWolfPairsSection()}
        {selectedTab === 'lovers' && renderLoverPairsSection()}
        {selectedTab === 'agents' && renderAgentPairsSection()}
        {selectedTab === 'synergies' && renderSynergiesSection()}
      </div>
    </div>
  );
}