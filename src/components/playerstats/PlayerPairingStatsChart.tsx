import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerPairingStatsFromRaw } from '../../hooks/usePlayerPairingStatsFromRaw';
import { playersColor } from '../../types/api';

export function PlayerPairingStatsChart() {
  const { data, isLoading, error } = usePlayerPairingStatsFromRaw();
  console.log('DEBUG playerPairingStats:', data);
  const [selectedTab, setSelectedTab] = useState<'wolves' | 'lovers'>('wolves');
  const [minWolfAppearances, setMinWolfAppearances] = useState<number>(2);
  const [minLoverAppearances, setMinLoverAppearances] = useState<number>(1);

  // Options pour le nombre minimum d'apparitions
  const minAppearancesOptions = [1, 2, 3, 4, 5];

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
    gradientId: createGradientId(pair.pair)
  }));

  const loverPairsData = data.loverPairs.pairs.map(pair => ({
    ...pair,
    winRateNum: parseFloat(pair.winRate),
    gradientId: createGradientId(pair.pair)
  }));

  // Total wolf pairs with at least minWolfAppearances
  const totalWolfPairsWithMinAppearances = wolfPairsData.filter(pair => pair.appearances >= minWolfAppearances).length;
  // Total lover pairs with at least minLoverAppearances
  const totalLoverPairsWithMinAppearances = loverPairsData.filter(pair => pair.appearances >= minLoverAppearances).length;

  // Calculate recurring pairs (2+ appearances) for display
  const recurringWolfPairs = wolfPairsData.filter(pair => pair.appearances >= 2);
  const recurringLoverPairs = loverPairsData.filter(pair => pair.appearances >= 2);

  // Split data for frequency vs performance charts
  const topWolfPairsByAppearances = [...wolfPairsData]
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 10);

  const topWolfPairsByWinRate = [...wolfPairsData]
    .filter(pair => pair.appearances >= minWolfAppearances)
    .sort((a, b) => b.winRateNum - a.winRateNum)
    .slice(0, 10);

  const topLoverPairsByAppearances = [...loverPairsData]
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 10);

  const topLoverPairsByWinRate = [...loverPairsData]
    .filter(pair => pair.appearances >= minLoverAppearances)
    .sort((a, b) => b.winRateNum - a.winRateNum)
    .slice(0, 10);

  const renderWolfPairsSection = () => (
    <div>
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Parties avec Plusieurs Loups</h3>
          <div className="lycans-valeur-principale">{data.wolfPairs.totalGames}</div>
          <p>parties analysées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Paires Différentes</h3>
          <div className="lycans-valeur-principale">{data.wolfPairs.pairs.length}</div>
          <p>combinaisons trouvées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Paires Récurrentes</h3>
          <div className="lycans-valeur-principale">{recurringWolfPairs.length}</div>
          <p>avec 2+ apparitions</p>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Most Common Wolf Pairs */}
        <div className="lycans-graphique-moitie">
          <h3>Paires de Loups les Plus Fréquentes</h3>
          {topWolfPairsByAppearances.length > 0 ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topWolfPairsByAppearances}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                  />
                  <YAxis 
                    label={{ value: 'Apparitions', angle: -90, position: 'insideLeft' }}
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
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="appearances" name="Apparitions">
                    {topWolfPairsByAppearances.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Aucune paire récurrente trouvée</p>
            </div>
          )}
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
                {minAppearancesOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {topWolfPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topWolfPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
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
                  <Bar dataKey="winRateNum" name="Taux de victoire (%)">
                    {topWolfPairsByWinRate.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                    ))}
                  </Bar>
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
        </div>
      </div>
    </div>
  );

  const renderLoverPairsSection = () => (
    <div>
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Parties avec des Amoureux</h3>
          <div className="lycans-valeur-principale">{data.loverPairs.totalGames}</div>
          <p>parties analysées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Paires Différentes</h3>
          <div className="lycans-valeur-principale">{data.loverPairs.pairs.length}</div>
          <p>combinaisons trouvées</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Paires Récurrentes</h3>
          <div className="lycans-valeur-principale">{recurringLoverPairs.length}</div>
          <p>avec 2+ apparitions</p>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {/* Most Common Lover Pairs */}
        <div className="lycans-graphique-moitie">
          <h3>Paires d'Amoureux les Plus Fréquentes</h3>
          {topLoverPairsByAppearances.length > 0 ? (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLoverPairsByAppearances}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                  />
                  <YAxis 
                    label={{ value: 'Apparitions', angle: -90, position: 'insideLeft' }}
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
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="appearances" name="Apparitions">
                    {topLoverPairsByAppearances.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Aucune paire d'amoureux trouvée</p>
            </div>
          )}
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
                {minAppearancesOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {topLoverPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLoverPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
                  />
                  <YAxis 
                    label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
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
                  <Bar dataKey="winRateNum" name="Taux de victoire (%)">
                    {topLoverPairsByWinRate.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                    ))}
                  </Bar>
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
      
      {/* Tab Selection */}
      <nav className="lycans-submenu">
        <button
          className={`lycans-submenu-btn${selectedTab === 'wolves' ? ' active' : ''}`}
          onClick={() => setSelectedTab('wolves')}
          type="button"
        >
          Paires de Loups ({data.wolfPairs.pairs.length})
        </button>
        <button
          className={`lycans-submenu-btn${selectedTab === 'lovers' ? ' active' : ''}`}
          onClick={() => setSelectedTab('lovers')}
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