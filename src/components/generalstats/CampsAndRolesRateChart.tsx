import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCampWinStats } from '../../hooks/useCampWinStats';
import { lycansColorScheme } from '../../types/api';

// Fallback color for camps not in the scheme
const lycansDefaultColor = '#607D8B';

export function CampsAndRolesRateChart() {
  const { campWinStats: victoriesDonnees, isLoading: chargementEnCours, errorInfo: messageErreur } = useCampWinStats();

  if (chargementEnCours) {
    return <div className="donnees-attente">Chargement des statistiques de victoire...</div>;
  }

  if (messageErreur) {
    return <div className="donnees-probleme">Erreur: {messageErreur}</div>;
  }

  if (!victoriesDonnees || !victoriesDonnees.campStats || victoriesDonnees.campStats.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée de victoire disponible</div>;
  }

  const campStatsForChart = victoriesDonnees?.campStats?.map(camp => ({
    ...camp,
    winRateNum: typeof camp.winRate === 'string' ? parseFloat(camp.winRate) : camp.winRate
  })) || [];

  {/*
  // Calculate percentages for solo roles
  const soloRolesAvecPourcentage = victoriesDonnees?.soloCamps?.map(solo => ({
    ...solo,
    pourcentage: parseFloat((solo.appearances / victoriesDonnees.totalGames * 100).toFixed(2))
  })) || [];
  */}
  return (
    <div className="lycans-stats-container">
      <h2>Statistiques de Victoire par Camp</h2>
      <p className="lycans-stats-info">
        Total des parties: {victoriesDonnees.totalGames}
      </p>
      
      <div className="lycans-chart-wrapper" style={{ height: 450 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={campStatsForChart}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={140}
              fill="#8884d8"
              dataKey="winRateNum"  // Use the numeric version
              nameKey="camp"
              label={({ camp, winRate }) => `${camp}: ${winRate}%`}
            >
              {campStatsForChart.map((entree, indice) => (
                <Cell 
                  key={`cellule-camp-${indice}`} 
                  fill={lycansColorScheme[entree.camp] || lycansDefaultColor} 
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload;
                  return (
                    <div style={{ 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-primary)', 
                      padding: 12, 
                      borderRadius: 8,
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {d.camp}
                      </div>
                      <div>
                        Victoires: {d.wins}
                      </div>
                      <div>
                        Total parties: {d.totalGames}
                      </div>
                      <div>
                        Taux de victoire: {d.winRate}%
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

          
      {/* Fréquence des rôles solo: non utilisé pour le moment, pas très utile et il faudrait les amoureux avec...
      {soloRolesAvecPourcentage.length > 0 && (
        <>
          <h2>Fréquence d'Apparition des Rôles Solo</h2>
          <p className="lycans-stats-info">
            Distribution des rôles spéciaux dans les parties
          </p>
          <div className="lycans-chart-wrapper" style={{ height: 450 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={soloRolesAvecPourcentage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="pourcentage"
                  nameKey="soloRole"
                  label={({ soloRole, pourcentage }) => `${soloRole}: ${pourcentage}%`}
                >
                  {soloRolesAvecPourcentage.map((entree, indice) => (
                    <Cell 
                      key={`cellule-solo-${indice}`} 
                      fill={lycansColorScheme[entree.soloRole] || lycansDefaultColor} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ 
                          background: 'var(--bg-secondary)', 
                          color: 'var(--text-primary)', 
                          padding: 12, 
                          borderRadius: 8,
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {d.soloRole}
                          </div>
                          <div>
                            Apparitions: {d.appearances}
                          </div>
                          <div>
                            Total parties: {victoriesDonnees.totalGames}
                          </div>
                          <div>
                            Fréquence: {d.pourcentage}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}*/}
    </div>
  );
}