
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, LabelList, Rectangle, PieChart, Pie, ComposedChart, Legend } from 'recharts';
import { useGameDurationAnalysisFromRaw } from '../../hooks/useGameDurationAnalysisFromRaw';
import { useGameTimeAnalysisFromRaw } from '../../hooks/useGameTimeAnalysisFromRaw';
import { useCampWinRateByGameTime } from '../../hooks/useCampWinRateByGameTime';
import { useSessionTimesAnalysis } from '../../hooks/useSessionTimesAnalysis';
import { minutesToHHMM } from '../../hooks/utils/sessionTimesAnalysisUtils';
import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor, getRandomColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';
import { formatDurationToMinutesSeconds, formatSecondsToMinutesSeconds, formatDurationWithDays } from '../../utils/durationFormatters';

export function GameDurationInsights() {
  const { durationAnalysis: jeuDonnees, fetchingData: telechargementActif, apiError: erreurApi } = useGameDurationAnalysisFromRaw();
  const { gameTimeAnalysis: tempsJeuDonnees, fetchingData: tempsJeuChargement, apiError: tempsJeuErreur } = useGameTimeAnalysisFromRaw();
  const { data: campWinRateData, isLoading: campWinRateLoading, error: campWinRateError } = useCampWinRateByGameTime();
  const { sessionTimesData, isLoading: sessionTimesLoading, error: sessionTimesError } = useSessionTimesAnalysis();
  const { navigateToGameDetails } = useNavigation();
  
  // State for duration type selection
  const [selectedDurationType, setSelectedDurationType] = useState<'real' | 'gametime' | 'session'>('real');

  // Get theme-adjusted colors
  const lycansColorScheme = useThemeAdjustedLycansColorScheme();

  // Utility function to convert abbreviated timing to full French format
  const formatTiming = (timing: string): string => {
    if (!timing) return timing;
    
    const match = timing.match(/^([JNM])(\d+)$/);
    if (!match) return timing;
    
    const [, phase, dayNumber] = match;
    const phaseLabels = {
      'J': 'Jour',
      'N': 'Nuit',
      'M': 'Meeting'
    };
    
    return `${phaseLabels[phase as keyof typeof phaseLabels] || phase} ${dayNumber}`;
  };

  if (telechargementActif || tempsJeuChargement || campWinRateLoading) {
    return <div className="statistiques-attente">Analyse des durées en cours...</div>;
  }

  if (erreurApi || tempsJeuErreur || campWinRateError) {
    return <div className="statistiques-echec">Problème rencontré: {erreurApi || tempsJeuErreur || campWinRateError}</div>;
  }

  if (!jeuDonnees || !tempsJeuDonnees) {
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
      <h2>Analyse des Durées</h2>
      
      {/* Duration Type Selection */}
      <div className="lycans-categories-selection">
        <button
          type="button"
          className={`lycans-categorie-btn ${selectedDurationType === 'real' ? 'active' : ''}`}
          onClick={() => setSelectedDurationType('real')}
        >
          Durée en jeu
        </button>
        <button
          type="button"
          className={`lycans-categorie-btn ${selectedDurationType === 'gametime' ? 'active' : ''}`}
          onClick={() => setSelectedDurationType('gametime')}
        >
          Temps de jeu
        </button>
        <button
          type="button"
          className={`lycans-categorie-btn ${selectedDurationType === 'session' ? 'active' : ''}`}
          onClick={() => setSelectedDurationType('session')}
        >
          Horaires de session
        </button>
      </div>
      
      {selectedDurationType === 'real' && (
        <>
          <div className="lycans-resume-conteneur">
            <div className="lycans-stat-carte">
              <h3>Durée Moyenne</h3>
              <p className="lycans-valeur-principale">{formatDurationToMinutesSeconds(jeuDonnees.averageDuration) || 'N/A'}</p>
            </div>
            <div className="lycans-stat-carte">
              <h3>Temps de jeu cumulés des parties</h3>
              <p className="lycans-valeur-principale">{formatDurationWithDays(jeuDonnees.totalGameTime) || 'N/A'}</p>
            </div>
            <div className="lycans-stat-carte">
              <h3>Temps de jeu cumulés par les joueurs</h3>
              <p className="lycans-valeur-principale">{formatDurationWithDays(jeuDonnees.totalPlayerTime) || 'N/A'}</p>
            </div>
          </div>

          <div className="lycans-resume-conteneur">
            <div 
              className="lycans-stat-carte" 
              onClick={() => {
                if (jeuDonnees.minDurationGameId) {
                  navigateToGameDetails({
                    selectedGame: jeuDonnees.minDurationGameId,
                    fromComponent: 'Analyse des Durées'
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
              <h3>Partie la plus courte</h3>
              <p className="lycans-valeur-principale">{formatSecondsToMinutesSeconds(jeuDonnees.minDuration)}</p>
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
                    fromComponent: 'Analyse des Duréee'
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
              <h3>Partie la plus longue</h3>
              <p className="lycans-valeur-principale">{formatSecondsToMinutesSeconds(jeuDonnees.maxDuration)}</p>
              {jeuDonnees.maxDurationGameId && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🖱️ Partie #{jeuDonnees.maxDurationGameId}
                </p>
              )}
            </div>
          </div>

      <div className="lycans-graphiques-section">
        <div className="lycans-graphique-element">
          <h3>Distribution des Durées</h3>
          <FullscreenChart title="Distribution des Durées">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jeuDonnees?.durationDistribution || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="duration" 
                    label={{ value: 'Durée (minutes)', position: 'insideBottom', offset: -5 }}
                    tickFormatter={(value) => `${value}min`}
                  />
                  <YAxis 
                    label={{ value: 'Nombre de Parties', angle: 270, position: 'insideLeft', style: { textAnchor: 'middle' } }}
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
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
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
                    label={{ value: 'Durée Moyenne (minutes)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
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
                  <Line 
                    type="monotone" 
                    dataKey="moyenne" 
                    name="Durée Moyenne" 
                    stroke="var(--chart-color-5)" 
                    strokeWidth={2}
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
                        fontSize={13}
                        transform={`rotate(-45 ${x} ${y})`}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <YAxis 
                    label={{ value: 'Durée Moyenne (minutes)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
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
                              fromComponent: 'Durée Moyenne par Camp Victorieux'
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    }}
                  >
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
        </>
      )}
      
      {selectedDurationType === 'gametime' && (
        <>
          <div className="lycans-section-description">
            <p>
              <strong>Analyse du temps de jeu :</strong> Ces graphiques montrent à quels moments les parties se terminent en fonction du cycle jour/nuit/meeting.
              <br/>
              Le chiffre indique le numéro du jour (Jour 3 = Phase "Jour" de la 3ème journée, Nuit 2 = Phase "Nuit" de la 2ème journée, Meeting 4 = 4ème meeting).
              <br/>
              Basé sur {tempsJeuDonnees.gamesWithEndTiming} parties avec données de timing sur {tempsJeuDonnees.totalGames} parties totales.
            </p>
          </div>
          
          <div className="lycans-resume-conteneur">
            <div className="lycans-stat-carte">
              <h3>Longueur Moyenne</h3>
              <p className="lycans-valeur-principale">{tempsJeuDonnees.averageGameLength.toFixed(1)} jours</p>
            </div>
            <div 
              className="lycans-stat-carte"
              onClick={() => {
                if (tempsJeuDonnees.shortestGame) {
                  navigateToGameDetails({
                    selectedGame: tempsJeuDonnees.shortestGame.gameId,
                    fromComponent: 'Analyse des Temps de Jeu'
                  });
                }
              }}
              style={{ 
                cursor: tempsJeuDonnees.shortestGame ? 'pointer' : 'default',
                opacity: tempsJeuDonnees.shortestGame ? 1 : 0.7,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (tempsJeuDonnees.shortestGame) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (tempsJeuDonnees.shortestGame) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }
              }}
              title={tempsJeuDonnees.shortestGame ? 'Cliquez pour voir cette partie' : 'Aucune partie trouvée'}
            >
              <h3>Partie la plus courte</h3>
              <p className="lycans-valeur-principale">
                {tempsJeuDonnees.shortestGame ? formatTiming(tempsJeuDonnees.shortestGame.endTiming) : 'N/A'}
              </p>
              {tempsJeuDonnees.shortestGame && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🖱️ Partie #{tempsJeuDonnees.shortestGame.gameId}
                </p>
              )}
            </div>
            <div 
              className="lycans-stat-carte"
              onClick={() => {
                if (tempsJeuDonnees.longestGame) {
                  navigateToGameDetails({
                    selectedGame: tempsJeuDonnees.longestGame.gameId,
                    fromComponent: 'Analyse des Temps de Jeu'
                  });
                }
              }}
              style={{ 
                cursor: tempsJeuDonnees.longestGame ? 'pointer' : 'default',
                opacity: tempsJeuDonnees.longestGame ? 1 : 0.7,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (tempsJeuDonnees.longestGame) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (tempsJeuDonnees.longestGame) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }
              }}
              title={tempsJeuDonnees.longestGame ? 'Cliquez pour voir cette partie' : 'Aucune partie trouvée'}
            >
              <h3>Partie la plus longue</h3>
              <p className="lycans-valeur-principale">
                {tempsJeuDonnees.longestGame ? formatTiming(tempsJeuDonnees.longestGame.endTiming) : 'N/A'}
              </p>
              {tempsJeuDonnees.longestGame && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🖱️ Partie #{tempsJeuDonnees.longestGame.gameId}
                </p>
              )}
            </div>
          </div>

          <div className="lycans-graphiques-section">
            <div className="lycans-graphique-element">
              <h3>Distribution par Phase de Fin</h3>
              <FullscreenChart title="Distribution par Phase de Fin">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tempsJeuDonnees.phaseDistribution.map((entry: any) => ({
                          ...entry,
                          fill: entry.phase === 'Jour' ? '#FFD700' :
                            entry.phase === 'Nuit' ? '#4169E1' :
                            entry.phase === 'Meeting' ? '#FF6347' :
                            getRandomColor(entry.phase)
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.phase} (${entry.percentage.toFixed(1)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                                <div><strong>{data.phase}</strong></div>
                                <div>{data.count} parties ({data.percentage.toFixed(1)}%)</div>
                                <div>Jour moyen: {data.averageDay.toFixed(1)}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>

            <div className="lycans-graphique-element">
              <h3>Distribution par Nombre de Jours</h3>
              <FullscreenChart title="Distribution par Nombre de Jours">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tempsJeuDonnees.dayDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="dayNumber" 
                        label={{ value: 'Nombre de Jours', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Nombre de Parties', angle: 270, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            const phaseDetails = Object.entries(data.phases)
                              .map(([phase, count]) => `${phase}: ${count}`)
                              .join(', ');
                            return (
                              <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                                <div><strong>Jour {data.dayNumber}</strong></div>
                                <div>{data.count} parties ({data.percentage.toFixed(1)}%)</div>
                                <div>Détail: {phaseDetails}</div>
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
                        dataKey="count" 
                        name="Nombre de Parties" 
                        fill="var(--chart-color-3)"
                        onClick={(data: any) => {
                          // Navigate to games that ended on this day (any phase)
                          navigateToGameDetails({
                            fromComponent: `Analyse des Temps de Jeu - Jour ${data.dayNumber}`
                          });
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>

            <div className="lycans-graphique-element">
              <h3>Détail par Timing de Fin</h3>
              <FullscreenChart title="Détail par Timing de Fin">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tempsJeuDonnees.endTimingDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timing" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        label={{ value: 'Timing de Fin', position: 'insideBottom', offset: -40 }}
                        tick={({ x, y, payload }) => (
                          <text
                            x={x}
                            y={y}
                            dy={16}
                            textAnchor="end"
                            fill="var(--text-secondary)"
                            fontSize={13}
                            transform={`rotate(-45 ${x} ${y})`}
                          >
                            {formatTiming(payload.value)}
                          </text>
                        )}
                      />
                      <YAxis 
                        label={{ value: 'Nombre de Parties', angle: 270, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                                <div><strong>{formatTiming(data.timing)}</strong></div>
                                <div>Phase: {data.phase}</div>
                                <div>Jour: {data.dayNumber}</div>
                                <div>{data.count} parties ({data.percentage.toFixed(1)}%)</div>
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
                        dataKey="count" 
                        name="Nombre de Parties"
                        style={{ cursor: 'pointer' }}
                        shape={(props) => {
                          const { x, y, width, height, payload } = props;
                          const entry = payload as { timing: string; phase: string };
                          const fillColor = entry.phase === 'Jour'
                            ? '#FFD700'
                            : entry.phase === 'Nuit'
                              ? '#4169E1'
                              : entry.phase === 'Meeting'
                                ? '#FF6347'
                                : getRandomColor(entry.timing);

                          return (
                            <Rectangle
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={fillColor}
                              onClick={() => {
                                navigateToGameDetails({
                                  fromComponent: `Analyse des Temps de Jeu - Timing ${formatTiming(entry.timing)}`
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

            <div className="lycans-graphique-element">
              <h3>Taux de Victoire par Jour de Jeu</h3>
              <FullscreenChart title="Taux de Victoire par Jour de Jeu">
                <div style={{ height: 450 }}>
                  {campWinRateData && campWinRateData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={campWinRateData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          label={{ value: 'Jour de fin de partie', position: 'insideBottom', offset: -10 }}
                          tickFormatter={(value) => `Jour ${value}`}
                        />
                        <YAxis 
                          yAxisId="left"
                          label={{ value: 'Taux de victoire (%)', angle: 270, position: 'left', style: { textAnchor: 'middle' } }}
                          domain={[0, 100]}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          label={{ value: 'Nombre de parties', angle: 90, position: 'right', style: { textAnchor: 'middle' } }}
                          domain={[0, 'auto']}
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
                                  borderRadius: 6,
                                  border: '1px solid var(--border-color)'
                                }}>
                                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Jour {data.day}</div>
                                  <div style={{ fontSize: '0.9rem' }}>
                                    <div style={{ color: '#4CAF50', marginBottom: 4 }}>
                                      🟢 Villageois: {data.villageoisWinRate.toFixed(1)}% ({data.villageoisWins}/{data.totalGames})
                                    </div>
                                    <div style={{ color: '#f44336', marginBottom: 4 }}>
                                      🔴 Loups: {data.loupsWinRate.toFixed(1)}% ({data.loupsWins}/{data.totalGames})
                                    </div>
                                    <div style={{ color: '#FF9800' }}>
                                      🟠 Solo: {data.soloWinRate.toFixed(1)}% ({data.soloWins}/{data.totalGames})
                                    </div>
                                  </div>
                                  <div style={{ 
                                    marginTop: 8, 
                                    paddingTop: 8, 
                                    borderTop: '1px solid var(--border-color)',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)'
                                  }}>
                                    Total: {data.totalGames} parties
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={(value) => {
                            if (value === 'villageoisWinRate') return 'Villageois';
                            if (value === 'loupsWinRate') return 'Loups';
                            if (value === 'soloWinRate') return 'Solo';
                            if (value === 'totalGames') return 'Nombre de parties';
                            return value;
                          }}
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="totalGames"
                          name="totalGames"
                          fill="rgba(128, 128, 128, 0.2)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="villageoisWinRate" 
                          name="villageoisWinRate"
                          stroke="#4CAF50" 
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const radius = 3 + (payload.totalGames / Math.max(...campWinRateData.map(d => d.totalGames))) * 5;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="#4CAF50"
                                stroke="#4CAF50"
                                strokeWidth={2}
                              />
                            );
                          }}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="loupsWinRate" 
                          name="loupsWinRate"
                          stroke="#f44336" 
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const radius = 3 + (payload.totalGames / Math.max(...campWinRateData.map(d => d.totalGames))) * 5;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="#f44336"
                                stroke="#f44336"
                                strokeWidth={2}
                              />
                            );
                          }}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="soloWinRate" 
                          name="soloWinRate"
                          stroke="#FF9800" 
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const radius = 3 + (payload.totalGames / Math.max(...campWinRateData.map(d => d.totalGames))) * 5;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="#FF9800"
                                stroke="#FF9800"
                                strokeWidth={2}
                              />
                            );
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                      Aucune donnée disponible (minimum 5 parties par jour requis)
                    </div>
                  )}
                </div>
              </FullscreenChart>
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '0 1rem' }}>
                <p>
                  <strong>Analyse des victoires selon la durée :</strong> Ce graphique montre le taux de victoire de chaque camp 
                  en fonction du jour où la partie s'est terminée. Les phases Jour, Nuit et Meeting de chaque journée sont regroupées ensemble.
                  <br/>
                  La taille des points reflète le nombre de parties terminées ce "jour"-là. Les barres grises en arrière-plan indiquent le volume de parties.
                  <br/>
                  Seuls les jours avec au moins 5 parties sont affichés pour garantir la fiabilité statistique.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedDurationType === 'session' && (
        <>
          {sessionTimesLoading && <div className="statistiques-attente">Analyse des horaires en cours...</div>}
          {sessionTimesError && <div className="statistiques-echec">Erreur : {sessionTimesError}</div>}
          {!sessionTimesLoading && !sessionTimesError && !sessionTimesData && (
            <div className="statistiques-indisponibles">Aucune session avec horodatage précis trouvée</div>
          )}
          {sessionTimesData && (
            <>
              <div className="lycans-section-description">
                <p>
                  <strong>Horaires de session :</strong> Analyse basée sur {sessionTimesData.totalSessions} sessions
                  (jours avec au moins une partie horodatée précisément).
                  Les heures sont en heure de Paris (CET/CEST, avec heure d'été).
                </p>
              </div>

              <div className="lycans-resume-conteneur">
                <div className="lycans-stat-carte">
                  <h3>Sessions analysées</h3>
                  <p className="lycans-valeur-principale">{sessionTimesData.totalSessions}</p>
                </div>
                <div className="lycans-stat-carte">
                  <h3>Début moyen</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.avgStartMinutes)}</p>
                </div>
                <div className="lycans-stat-carte">
                  <h3>Fin moyenne</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.avgEndMinutes)}</p>
                </div>
              </div>

              <div className="lycans-resume-conteneur">
                <div className="lycans-stat-carte">
                  <h3>Début le plus tôt</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.minStartMinutes)}</p>
                </div>
                <div className="lycans-stat-carte">
                  <h3>Début le plus tard</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.maxStartMinutes)}</p>
                </div>
                <div className="lycans-stat-carte">
                  <h3>Fin la plus tôt</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.minEndMinutes)}</p>
                </div>
                <div className="lycans-stat-carte">
                  <h3>Fin la plus tard</h3>
                  <p className="lycans-valeur-principale">{minutesToHHMM(sessionTimesData.maxEndMinutes)}</p>
                </div>
              </div>

              <div className="lycans-graphiques-section">
                {/* Chart 1: Timeline per session */}
                <div className="lycans-graphique-element">
                  <h3>Horaires par session</h3>
                  <FullscreenChart title="Horaires par session">
                    <div style={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={sessionTimesData.sessions}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="label"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            interval={0}
                            tick={({ x, y, payload }) => (
                              <text
                                x={x}
                                y={y}
                                dy={16}
                                textAnchor="end"
                                fill="var(--text-secondary)"
                                fontSize={11}
                                transform={`rotate(-45 ${x} ${y})`}
                              >
                                {payload.value}
                              </text>
                            )}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tickFormatter={minutesToHHMM}
                            label={{ value: 'Heure (Paris)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length > 0) {
                                const entry = payload[0].payload;
                                return (
                                  <div style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    fontSize: '0.85rem',
                                  }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{entry.date}</p>
                                    <p style={{ color: 'var(--chart-color-3)' }}>Début : {minutesToHHMM(entry.sessionStart)}</p>
                                    <p style={{ color: 'var(--chart-color-5)' }}>Fin : {minutesToHHMM(entry.sessionEnd)}</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>{entry.gamesCount} partie{entry.gamesCount > 1 ? 's' : ''}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="sessionStart"
                            name="Début de session"
                            stroke="var(--chart-color-3)"
                            strokeWidth={2}
                            dot={{ r: 5, fill: 'var(--chart-color-3)' }}
                            activeDot={{ r: 7 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="sessionEnd"
                            name="Fin de session"
                            stroke="var(--chart-color-5)"
                            strokeWidth={2}
                            dot={{ r: 5, fill: 'var(--chart-color-5)' }}
                            activeDot={{ r: 7 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </FullscreenChart>
                </div>

                {/* Chart 2: Distribution of start & end times in 30-min buckets */}
                <div className="lycans-graphique-element">
                  <h3>Distribution des horaires de début et fin</h3>
                  <FullscreenChart title="Distribution des horaires de début et fin">
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={sessionTimesData.distribution}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="label"
                            label={{ value: 'Heure (Paris)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            allowDecimals={false}
                            label={{ value: 'Nombre de sessions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                          />
                          <Tooltip
                            content={({ active, payload, label: bucketLabel }) => {
                              if (active && payload && payload.length > 0) {
                                return (
                                  <div style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    fontSize: '0.85rem',
                                  }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{bucketLabel}</p>
                                    {payload.map((p) => (
                                      <p key={p.dataKey as string} style={{ color: p.color }}>
                                        {p.name} : {p.value} session{Number(p.value) > 1 ? 's' : ''}
                                      </p>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="startCount" name="Début de session" fill="var(--chart-color-3)" />
                          <Bar dataKey="endCount" name="Fin de session" fill="var(--chart-color-5)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </FullscreenChart>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}