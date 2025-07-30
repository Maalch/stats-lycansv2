import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useHarvestStats } from '../hooks/useHarvestStats';

// Couleurs pour les différentes tranches de récolte
const lycansRecolteCouleurs = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1976d2'];

export function HarvestProgressChart() {
  const { harvestStats: recolteInfos, isLoading: recuperationDonnees, errorMessage: problemeChargement } = useHarvestStats();

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
  const distributionDonnees = [
    { nom: "0-25%", valeur: recolteInfos.harvestDistribution["0-25%"] },
    { nom: "26-50%", valeur: recolteInfos.harvestDistribution["26-50%"] },
    { nom: "51-75%", valeur: recolteInfos.harvestDistribution["51-75%"] },
    { nom: "76-99%", valeur: recolteInfos.harvestDistribution["76-99%"] },
    { nom: "100%", valeur: recolteInfos.harvestDistribution["100%"] }
  ];

  // Préparation des données pour le graphique en barres
  const moyenneParCamp = Object.entries(recolteInfos.harvestByWinner).map(([nomCamp, statistiques]) => ({
    camp: nomCamp,
    moyenne: parseFloat(statistiques.average)
  })).sort((a, b) => b.moyenne - a.moyenne);

  return (
    <div className="lycans-recolte-stats">
      <h2>Statistiques de Récolte</h2>
      
      <div className="lycans-recolte-sommaire">
        <div className="lycans-stat-carte">
          <h3>Moyenne de Récolte</h3>
          <p className="lycans-nombre-grand">{recolteInfos.averageHarvestPercent}%</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Parties avec Récolte</h3>
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
                  data={distributionDonnees}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ nom, percent }) => `${nom}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valeur"
                  nameKey="nom"
                >
                  {distributionDonnees.map((_, indice) => (
                    <Cell key={`cellule-${indice}`} fill={lycansRecolteCouleurs[indice % lycansRecolteCouleurs.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(valeur) => [`${valeur} parties`, 'Nombre de parties']}
                  labelFormatter={(label) => `Récolte: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lycans-graphique-moitie">
          <h3>Moyenne de Récolte au Moment de la Victoire</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moyenneParCamp}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="camp" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Moyenne de Récolte (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            Camp : {d.camp}
                          </div>
                          <div>
                            Moyenne de Récolte : {d.moyenne}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="moyenne" name="Moyenne de Récolte" fill="#388e3c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};