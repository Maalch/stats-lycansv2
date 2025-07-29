import { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useCampWinStats } from '../hooks/useCampWinStats';

// Custom color palette for camps
const lycansColorScheme: Record<string, string> = {
  'Villageois': '#4CAF50',
  'Loups': '#F44336',
  'Amoureux': '#E91E63',
  'Idiot du village': '#9C27B0',
  'Cannibale': '#795548',
  'La Bête': '#FF9800',
  'Espion': '#2196F3',
  'Vaudou': '#673AB7',
  'Chasseur de primes': '#FFC107'
};

// Fallback color for camps not in the scheme
const lycansDefaultColor = '#607D8B';

export const CampWinRateChart: FC = () => {
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
              yAxisId="left"
              orientation="left"
              stroke="#8884d8"
              label={{ value: 'Nombre de victoires', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#82ca9d"
              label={{ value: 'Taux de victoire (%)', angle: -90, position: 'insideRight' }}
            />
            <Tooltip formatter={(value, name) => {
              if (name === "wins") return [`${value} victoires`, "Victoires"];
              if (name === "winRate") return [`${value}%`, "Taux de victoire"];
              return [value, name];
            }} />
            <Legend 
              payload={[
                { value: 'Victoires', type: 'square', color: '#8884d8' },
                { value: 'Taux de victoire (%)', type: 'square', color: '#82ca9d' }
              ]}
            />
            <Bar 
              yAxisId="left"
              dataKey="wins" 
              name="wins" 
              fill="#8884d8"
            >
              {victoriesDonnees.campStats.map((entree, indice) => (
                <Cell 
                  key={`cellule-${indice}`} 
                  fill={lycansColorScheme[entree.camp] || lycansDefaultColor} 
                />
              ))}
            </Bar>
            <Bar 
              yAxisId="right"
              dataKey="winRate" 
              name="winRate" 
              fill="#82ca9d" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};