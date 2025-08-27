
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList, Cell } from 'recharts';
import { useGameDurationAnalysisFromRaw } from '../../hooks/useGameDurationAnalysisFromRaw';
import { lycansColorScheme, lycansOtherCategoryColor, getRandomColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function GameDurationInsights() {
  const { durationAnalysis: jeuDonnees, fetchingData: telechargementActif, apiError: erreurApi } = useGameDurationAnalysisFromRaw();

  if (telechargementActif) {
    return <div className="statistiques-attente">Analyse des durées de partie en cours...</div>;
  }

  if (erreurApi) {
    return <div className="statistiques-echec">Problème rencontré: {erreurApi}</div>;
  }

  if (!jeuDonnees) {
    return <div className="statistiques-indisponibles">Données d'analyse non disponibles</div>;
  }

  // Préparation des données pour le graphique de ratio loups/joueurs (ratio as number for continuous axis)
  const ratioLoupsJoueurs = jeuDonnees ? Object.entries(jeuDonnees.daysByWolfRatio).map(([ratio, donnees]) => ({
    ratio: parseFloat(ratio), // number, not string
    moyenne: parseFloat(donnees.average),
    parties: donnees.count
  })).sort((a, b) => a.ratio - b.ratio) : [];

  // Préparation des données pour le graphique par camp
  const dureesParCamp = jeuDonnees ? Object.entries(jeuDonnees.daysByWinnerCamp).map(([camp, donnees]) => ({
    camp,
    moyenne: parseFloat(donnees.average),
    parties: donnees.count
  })).sort((a, b) => b.moyenne - a.moyenne) : [];

  return (
    <div className="lycans-duree-analyse">
      <h2>Analyse des Durées de Partie</h2>
      
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Durée Moyenne</h3>
          <p className="lycans-valeur-principale">{jeuDonnees.averageDays} jours</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Durée Minimum</h3>
          <p className="lycans-valeur-principale">{jeuDonnees.minDays} jours</p>
        </div>
        <div className="lycans-stat-carte">
          <h3>Durée Maximum</h3>
          <p className="lycans-valeur-principale">{jeuDonnees.maxDays} jours</p>
        </div>
      </div>

      <div className="lycans-graphiques-section">
        <div className="lycans-graphique-element">
          <h3>Distribution des Durées de Partie</h3>
          <FullscreenChart title="Distribution des Durées de Partie">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jeuDonnees?.dayDistribution || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="days" 
                    label={{ value: 'Nombre de Jours', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Nombre de Parties', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>{d.days} jours</strong></div>
                            <div>{d.count} parties</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Nombre de Parties" 
                    fill="var(--chart-color-2)" // Use a CSS variable color
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        <div className="lycans-graphique-element">
          <h3>Durée Moyenne par Ratio Loups/Joueurs</h3>
          <FullscreenChart title="Durée Moyenne par Ratio Loups/Joueurs">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ratioLoupsJoueurs}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="ratio"
                    type="number"
                    domain={['auto', 'auto']}
                    allowDecimals={false}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: 'Ratio Loups/Joueurs (%)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Durée Moyenne (jours)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>Pourcentage de loups : {d.ratio}</strong></div>
                            <div>Durée moyenne : {d.moyenne} jours</div>
                            <div>Nombre de parties : {d.parties}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="moyenne" 
                    name="Durée Moyenne" 
                    stroke="var(--chart-color-5)" // Use a CSS variable color
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        <div className="lycans-graphique-element">
          <h3>Durée Moyenne par Camp Victorieux</h3>
          <FullscreenChart title="Durée Moyenne par Camp Victorieux">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dureesParCamp}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
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
                    label={{ value: 'Durée Moyenne (jours)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>{d.camp}</strong></div>
                            <div>Durée moyenne : {d.moyenne} jours</div>
                            <div>Nombre de parties : {d.parties}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="moyenne" 
                    name="moyenne" 
                    isAnimationActive={false}
                  >
                    {
                      dureesParCamp.map((entry) => (
                        <Cell key={`cell-${entry.camp}`}
                          fill={lycansColorScheme[entry.camp] || lycansOtherCategoryColor || getRandomColor(entry.camp)}
                        />
                      ))
                    }
                    <LabelList
                      dataKey="moyenne"
                      position="top"
                      formatter={(label) => {
                        const val = typeof label === 'number' ? label : Number(label);
                        return !isNaN(val) ? `${val.toFixed(1)}j` : '';
                      }}
                      fill="var(--text-primary)"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>
      </div>
    </div>
  );
}