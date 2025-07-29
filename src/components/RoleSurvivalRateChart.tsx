import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useRoleSurvivalStats } from '../hooks/useSurvivalStats';

export function RoleSurvivalRateChart() {
  const { roleSurvivalStats: donneesSurvie, dataLoading: chargementStats, fetchError: erreurStats } = useRoleSurvivalStats();

  if (chargementStats) {
    return <div className="donnees-attente">Récupération des statistiques de survie des rôles...</div>;
  }

  if (erreurStats) {
    return <div className="donnees-probleme">Erreur: {erreurStats}</div>;
  }

  if (!donneesSurvie || !donneesSurvie.roleStats || donneesSurvie.roleStats.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée de survie disponible</div>;
  }

  // Filtrer pour n'afficher que les rôles avec un nombre minimum d'apparitions
  const rolesFiltres = donneesSurvie.roleStats.filter(role => role.appearances >= 3);

  // Données pour le graphique de corrélation
  const correlationDonnees = rolesFiltres.map(role => ({
    nom: role.role,
    tauxSurvie: parseFloat(role.survivalRate),
    dureeVie: parseFloat(role.avgLifespan),
    apparitions: role.appearances
  }));

  return (
    <div className="lycans-roles-survie">
      <h2>Statistiques de Survie des Rôles</h2>
      
      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Taux de Survie par Rôle</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rolesFiltres}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey="role" 
                  type="category" 
                  width={150}
                />
                <Tooltip 
                  formatter={(valeur, nom) => {
                    if (nom === "survivalRate") return [`${valeur}%`, "Taux de Survie"];
                    return [valeur, nom];
                  }}
                  labelFormatter={(etiquette) => `Rôle: ${etiquette}`}
                />
                <Legend />
                <Bar 
                  dataKey="survivalRate" 
                  name="Taux de Survie" 
                  fill="#82ca9d" 
                  background={{ fill: '#eee' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lycans-graphique-section">
          <h3>Durée de Vie Moyenne vs Taux de Survie</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="dureeVie" 
                  name="Durée de Vie Moyenne (jours)" 
                  label={{ value: 'Durée de Vie Moyenne (jours)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="tauxSurvie" 
                  name="Taux de Survie (%)" 
                  label={{ value: 'Taux de Survie (%)', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis 
                  type="number" 
                  dataKey="apparitions" 
                  range={[50, 400]} 
                  name="Nombre d'Apparitions" 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(valeur, nom) => {
                    if (nom === "dureeVie") return [`${valeur} jours`, "Durée de Vie Moyenne"];
                    if (nom === "tauxSurvie") return [`${valeur}%`, "Taux de Survie"];
                    if (nom === "apparitions") return [`${valeur} fois`, "Nombre d'Apparitions"];
                    return [valeur, nom];
                  }}
                  labelFormatter={(indice) => correlationDonnees[indice].nom}
                />
                <Legend />
                <Scatter 
                  name="Rôles" 
                  data={correlationDonnees} 
                  fill="#8884d8" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};