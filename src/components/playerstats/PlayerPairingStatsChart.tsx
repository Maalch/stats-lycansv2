import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePlayerPairingStats } from '../../hooks/usePlayerPairingStats';

export function PlayerPairingStatsChart() {
  const { data, isLoading, error } = usePlayerPairingStats();
  const [selectedTab, setSelectedTab] = useState<'wolves' | 'lovers'>('wolves');

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de paires...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!data) {
    return <div className="donnees-manquantes">Aucune donnée de paires disponible</div>;
  }

  // Prepare data for charts
  const wolfPairsData = data.wolfPairs.pairs
    .filter(pair => pair.appearances >= 2) // Only show pairs with multiple appearances
    .map(pair => ({
      ...pair,
      winRateNum: parseFloat(pair.winRate)
    }));

  const loverPairsData = data.loverPairs.pairs
    .filter(pair => pair.appearances >= 1)
    .map(pair => ({
      ...pair,
      winRateNum: parseFloat(pair.winRate)
    }));

  // Split data for frequency vs performance charts
  const topWolfPairsByAppearances = wolfPairsData
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 10);

  const topWolfPairsByWinRate = wolfPairsData
    .filter(pair => pair.appearances >= 3) // Need meaningful sample size
    .sort((a, b) => b.winRateNum - a.winRateNum)
    .slice(0, 10);

  const topLoverPairsByAppearances = loverPairsData
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 10);

  const topLoverPairsByWinRate = loverPairsData
    .filter(pair => pair.appearances >= 2) // Need meaningful sample size
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
          <div className="lycans-valeur-principale">{wolfPairsData.length}</div>
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
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div>Apparitions: {data.appearances}</div>
                            <div>Victoires: {data.wins}</div>
                            <div>Taux de victoire: {data.winRate}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="appearances" 
                    name="Apparitions" 
                    fill="var(--chart-color-1)"
                  />
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
          <h3>Paires de Loups les Plus Performantes</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            (minimum 3 apparitions)
          </p>
          {topWolfPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topWolfPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
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
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div>Taux de victoire: {data.winRate}%</div>
                            <div>Victoires: {data.wins} / {data.appearances}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="winRateNum" 
                    name="Taux de victoire (%)" 
                    fill="var(--chart-color-4)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Pas assez de données pour analyser la performance</p>
            </div>
          )}
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
          <div className="lycans-valeur-principale">{loverPairsData.length}</div>
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
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div>Apparitions: {data.appearances}</div>
                            <div>Victoires: {data.wins}</div>
                            <div>Taux de victoire: {data.winRate}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="appearances" 
                    name="Apparitions" 
                    fill="var(--chart-color-5)"
                  />
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
          <h3>Paires d'Amoureux les Plus Performantes</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            (minimum 2 apparitions)
          </p>
          {topLoverPairsByWinRate.length > 0 ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLoverPairsByWinRate}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
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
                        return (
                          <div style={{ 
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            padding: 12, 
                            borderRadius: 8,
                            border: '1px solid var(--border-color)'
                          }}>
                            <div><strong>{data.pair}</strong></div>
                            <div>Taux de victoire: {data.winRate}%</div>
                            <div>Victoires: {data.wins} / {data.appearances}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="winRateNum" 
                    name="Taux de victoire (%)" 
                    fill="var(--chart-color-6)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="lycans-empty-section">
              <p>Pas assez de données pour analyser la performance</p>
            </div>
          )}
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