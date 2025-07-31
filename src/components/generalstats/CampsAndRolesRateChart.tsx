import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useCampWinStats } from '../../hooks/useCampWinStats';
import { lycansColorScheme } from '../../types/api';

// Fallback color for camps not in the scheme
const lycansDefaultColor = '#607D8B';

export function CampsAndRolesRateChart() {
  const { campWinStats: victoriesDonnees, isLoading: chargementEnCours, errorInfo: messageErreur } = useCampWinStats();

  if (chargementEnCours) {
    return <div className="statistiques-chargement">Chargement des statistiques de victoire...</div>;
  }

  if (messageErreur) {
    return <div className="statistiques-erreur">Erreur: {messageErreur}</div>;
  }

  if (!victoriesDonnees || !victoriesDonnees.campStats || victoriesDonnees.campStats.length === 0) {
    return <div className="statistiques-vide">Aucune donnée de victoire disponible</div>;
  }

  // Calculate percentages for solo roles
  const soloRolesAvecPourcentage = victoriesDonnees?.soloCamps?.map(solo => ({
    ...solo,
    pourcentage: (solo.appearances / victoriesDonnees.totalGames * 100).toFixed(2)
  })) || [];

  return (
    <div className="lycans-stats-container">
      <h2>Statistiques de Victoire par Camp</h2>
      <p>Total des parties: {victoriesDonnees.totalGames}</p>
      
      <div className="lycans-chart-wrapper" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={victoriesDonnees.campStats}
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
              label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
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
                        Victoires : {d.wins}
                      </div>
                      <div>
                        Taux de victoire : {d.winRate}%
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              formatter={(value) => value === "winRate" ? "Taux de victoire" : value}
            />
            <Bar 
              dataKey="winRate" 
              name="winRate" 
              fill="#82ca9d"
            >
              {victoriesDonnees.campStats.map((entree, indice) => (
                <Cell 
                  key={`cellule-${indice}`} 
                  fill={lycansColorScheme[entree.camp] || lycansDefaultColor} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* New solo roles frequency chart */}
      {soloRolesAvecPourcentage.length > 0 && (
        <>
          <h2>Statistiques de Fréquence des rôles solo</h2>
          <div className="lycans-chart-wrapper" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={soloRolesAvecPourcentage}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="soloRole" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Fréquence (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, Math.max(...soloRolesAvecPourcentage.map(sr => parseFloat(sr.pourcentage))) + 5]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {d.soloRole}
                          </div>
                          <div>
                            Apparitions : {d.appearances}
                          </div>
                          <div>
                            Fréquence : {d.pourcentage}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  formatter={(value) => value === "pourcentage" ? "Fréquence d'apparition" : value}
                />
                <Bar 
                  dataKey="pourcentage" 
                  name="pourcentage" 
                  fill="#8884d8"
                >
                  {soloRolesAvecPourcentage.map((entree, indice) => (
                    <Cell 
                      key={`cellule-solo-${indice}`} 
                      fill={lycansColorScheme[entree.soloRole] || lycansDefaultColor} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}