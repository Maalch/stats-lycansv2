import { PieChart, Pie, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Rectangle } from 'recharts';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor, getRandomColor } from '../../types/api';
import { useHarvestStatsFromRaw } from '../../hooks/useHarvestStatsFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { FullscreenChart } from '../common/FullscreenChart';

// Couleurs pour les différentes tranches de récolte
const lycansRecolteCouleurs = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1976d2'];

export function HarvestProgressChart() {
  const { harvestStats: recolteInfos, isLoading: recuperationDonnees, errorInfo: problemeChargement } = useHarvestStatsFromRaw();
  const { navigateToGameDetails } = useNavigation();

  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  if (recuperationDonnees) {
    return <div className="donnees-chargement">Récupération des données de récolte...</div>;
  }

  if (problemeChargement) {
    return <div className="donnees-erreur">Problème: {problemeChargement}</div>;
  }

  if (!recolteInfos) {
    return <div className="donnees-absentes">Données de récolte non disponibles</div>;
  }

  // Préparation des données pour le graphique en camembert
  const distributionDonnees = recolteInfos ? [
    { nom: "0-25%", valeur: recolteInfos.harvestDistribution["0-25%"] },
    { nom: "26-50%", valeur: recolteInfos.harvestDistribution["26-50%"] },
    { nom: "51-75%", valeur: recolteInfos.harvestDistribution["51-75%"] },
    { nom: "76-99%", valeur: recolteInfos.harvestDistribution["76-99%"] },
    { nom: "100+%", valeur: recolteInfos.harvestDistribution["100+%"] }
  ] : [];

  // Préparation des données pour le graphique en barres
  const moyenneParCamp = recolteInfos ? Object.entries(recolteInfos.harvestByWinner).map(([nomCamp, statistiques]) => ({
    camp: nomCamp,
    moyenne: parseFloat(statistiques.average)
  })).sort((a, b) => b.moyenne - a.moyenne) : [];

  return (
    <div className="lycans-recolte-stats">
      <h2>Statistiques de Récolte</h2>
      
      <div className="lycans-recolte-sommaire">
        <div className="lycans-stat-carte">
          <h3>Moyenne de Récolte</h3>
          <p className="lycans-nombre-grand">{recolteInfos.averageHarvestPercent}%</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Nombre total de parties</h3>
          <p className="lycans-nombre-grand">{recolteInfos.gamesWithHarvest}</p>
        </div>
      </div>

      <div className="lycans-graphiques-conteneur">
        <div className="lycans-graphique-moitie">
          <h3>Distribution des Récoltes</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionDonnees.map((entry, indice) => ({
                      ...entry,
                      fill: lycansRecolteCouleurs[indice % lycansRecolteCouleurs.length]
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry: any) => `${entry.nom}: ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    onClick={(data: any) => {
                      if (data && data.nom) {
                        navigateToGameDetails({
                          selectedHarvestRange: data.nom,
                          fromComponent: 'Distribution des Récoltes'
                        });
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    dataKey="valeur"
                    nameKey="nom"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>{d.nom}</strong></div>
                            <div>Nombre de parties : {d.valeur}</div>
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
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>

        <div className="lycans-graphique-moitie">
          <h3>Moyenne de Récolte au Moment de la Victoire</h3>
          <FullscreenChart title="Moyenne de Récolte au Moment de la Victoire">
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={moyenneParCamp}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="camp" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    interval={0}
                    tick={({ x, y, payload }) => (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="end"
                        fill="var(--text-secondary)"
                        fontSize={12}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis 
                    label={{ value: 'Moyenne de Récolte (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                              {d.camp}
                            </div>
                            <div>
                              Moyenne de Récolte : {d.moyenne}%
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
                    dataKey="moyenne" 
                    name="Moyenne de Récolte"
                    style={{ cursor: 'pointer' }}
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const entry = payload as { camp: string };
                      const fillColor = lycansColorScheme[entry.camp] || lycansOtherCategoryColor || getRandomColor(entry.camp);

                      return (
                        <Rectangle
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fillColor}
                          onClick={() => {
                            navigateToGameDetails({
                              campFilter: {
                                selectedCamp: entry.camp,
                                campFilterMode: 'wins-only'
                              },
                              fromComponent: 'Moyenne de Récolte par Camp'
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
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}