
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList, Cell } from 'recharts';
import { useGameDurationAnalysisFromRaw } from '../../hooks/useGameDurationAnalysisFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor, getRandomColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function GameDurationInsights() {
  const { durationAnalysis: jeuDonnees, fetchingData: telechargementActif, apiError: erreurApi } = useGameDurationAnalysisFromRaw();
  const { navigateToGameDetails } = useNavigation();

  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  if (telechargementActif) {
    return <div className="statistiques-attente">Analyse des durées de partie en cours...</div>;
  }

  if (erreurApi) {
    return <div className="statistiques-echec">Problème rencontré: {erreurApi}</div>;
  }

  if (!jeuDonnees) {
    return <div className="statistiques-indisponibles">Données d'analyse non disponibles</div>;
  }

  // Helper function to convert duration string to minutes for chart display
  const parseDurationToMinutes = (durationStr: string): number => {
    const hourMatch = durationStr.match(/(\d+)h/);
    const minuteMatch = durationStr.match(/(\d+)m/);
    const secondMatch = durationStr.match(/(\d+)s/);
    
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
    
    return hours * 60 + minutes + (seconds / 60);
  };

  // Préparation des données pour le graphique de ratio loups/villageois (ratio as number for continuous axis)
  const ratioLoupsVillageois = jeuDonnees ? Object.entries(jeuDonnees.durationsByWolfRatio).map(([ratio, donnees]) => ({
    ratio: parseFloat(ratio), // number, not string
    moyenne: parseDurationToMinutes(donnees.average),
    parties: donnees.count,
    dureeFormatee: donnees.average // Keep formatted string for tooltip
  })).sort((a, b) => a.ratio - b.ratio) : [];

  // Préparation des données pour le graphique par camp
  const dureesParCamp = jeuDonnees ? Object.entries(jeuDonnees.durationsByWinnerCamp).map(([camp, donnees]) => ({
    camp,
    moyenne: parseDurationToMinutes(donnees.average),
    parties: donnees.count,
    dureeFormatee: donnees.average // Keep formatted string for tooltip
  })).sort((a, b) => b.moyenne - a.moyenne) : [];

  return (
    <div className="lycans-duree-analyse">
      <h2>Analyse des Durées de Partie</h2>
      
      <div className="lycans-resume-conteneur">
        <div className="lycans-stat-carte">
          <h3>Durée Moyenne</h3>
          <p className="lycans-valeur-principale">{jeuDonnees.averageDuration || 'N/A'}</p>
        </div>
        <div 
          className="lycans-stat-carte" 
          onClick={() => {
            if (jeuDonnees.minDurationGameId) {
              navigateToGameDetails({
                selectedGame: jeuDonnees.minDurationGameId,
                fromComponent: 'Analyse des Durées de Partie'
              });
            }
          }}
          style={{ 
            cursor: jeuDonnees.minDurationGameId ? 'pointer' : 'default',
            opacity: jeuDonnees.minDurationGameId ? 1 : 0.7,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (jeuDonnees.minDurationGameId) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (jeuDonnees.minDurationGameId) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }
          }}
          title={jeuDonnees.minDurationGameId ? 'Cliquez pour voir cette partie' : 'Aucune partie trouvée'}
        >
          <h3>Durée Minimum</h3>
          <p className="lycans-valeur-principale">{Math.floor(jeuDonnees.minDuration / 60)}min {jeuDonnees.minDuration % 60}s</p>
          {jeuDonnees.minDurationGameId && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              🖱️ Partie #{jeuDonnees.minDurationGameId}
            </p>
          )}
        </div>
        <div 
          className="lycans-stat-carte" 
          onClick={() => {
            if (jeuDonnees.maxDurationGameId) {
              navigateToGameDetails({
                selectedGame: jeuDonnees.maxDurationGameId,
                fromComponent: 'Analyse des Durées de Partie'
              });
            }
          }}
          style={{ 
            cursor: jeuDonnees.maxDurationGameId ? 'pointer' : 'default',
            opacity: jeuDonnees.maxDurationGameId ? 1 : 0.7,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (jeuDonnees.maxDurationGameId) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (jeuDonnees.maxDurationGameId) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }
          }}
          title={jeuDonnees.maxDurationGameId ? 'Cliquez pour voir cette partie' : 'Aucune partie trouvée'}
        >
          <h3>Durée Maximum</h3>
          <p className="lycans-valeur-principale">{Math.floor(jeuDonnees.maxDuration / 60)}min {jeuDonnees.maxDuration % 60}s</p>
          {jeuDonnees.maxDurationGameId && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              🖱️ Partie #{jeuDonnees.maxDurationGameId}
            </p>
          )}
        </div>
      </div>

      <div className="lycans-graphiques-section">
        <div className="lycans-graphique-element">
          <h3>Distribution des Durées de Partie</h3>
          <FullscreenChart title="Distribution des Durées de Partie">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jeuDonnees?.durationDistribution || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="duration" 
                    label={{ value: 'Durée (minutes)', position: 'insideBottom', offset: -5 }}
                    tickFormatter={(value) => `${value}min`}
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
                            <div><strong>~{d.duration} minutes</strong></div>
                            <div>{d.count} parties</div>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--text-secondary)', 
                              marginTop: '0.25rem'
                            }}>
                              Durées regroupées par intervalles de 2 minutes
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Nombre de Parties" 
                    fill="var(--chart-color-2)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullscreenChart>
        </div>

        <div className="lycans-graphique-element">
          <h3>Durée Moyenne par Ratio Loups/Villageois</h3>
          <FullscreenChart title="Durée Moyenne par Ratio Loups/Villageois">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={ratioLoupsVillageois}
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
                    label={{ value: 'Durée Moyenne (minutes)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${Math.round(value)}min`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>Pourcentage de loups : {d.ratio}%</strong></div>
                            <div>Durée moyenne : {d.dureeFormatee}</div>
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
                    label={{ value: 'Durée Moyenne (minutes)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => `${Math.round(value)}min`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                            <div><strong>{d.camp}</strong></div>
                            <div>Durée moyenne : {d.dureeFormatee}</div>
                            <div>Nombre de parties : {d.parties}</div>
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
                    name="moyenne" 
                    isAnimationActive={false}
                    onClick={(data: any) => {
                      if (data && data.camp) {
                        navigateToGameDetails({
                          campFilter: {
                            selectedCamp: data.camp,
                            campFilterMode: 'wins-only'
                          },
                          fromComponent: 'Durée Moyenne par Camp Victorieux'
                        });
                      }
                    }}
                    style={{ cursor: 'pointer' }}
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
                        return !isNaN(val) ? `${Math.round(val)}min` : '';
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