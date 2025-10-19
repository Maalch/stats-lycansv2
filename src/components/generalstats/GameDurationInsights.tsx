
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, LabelList, Cell, PieChart, Pie } from 'recharts';
import { useGameDurationAnalysisFromRaw } from '../../hooks/useGameDurationAnalysisFromRaw';
import { useGameTimeAnalysisFromRaw } from '../../hooks/useGameTimeAnalysisFromRaw';
import { useNavigation } from '../../context/NavigationContext';
import { useThemeAdjustedLycansColorScheme, lycansOtherCategoryColor, getRandomColor } from '../../types/api';
import { FullscreenChart } from '../common/FullscreenChart';

export function GameDurationInsights() {
  const { durationAnalysis: jeuDonnees, fetchingData: telechargementActif, apiError: erreurApi } = useGameDurationAnalysisFromRaw();
  const { gameTimeAnalysis: tempsJeuDonnees, fetchingData: tempsJeuChargement, apiError: tempsJeuErreur } = useGameTimeAnalysisFromRaw();
  const { navigateToGameDetails } = useNavigation();
  
  // State for duration type selection
  const [selectedDurationType, setSelectedDurationType] = useState<'real' | 'gametime'>('real');

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

  if (telechargementActif || tempsJeuChargement) {
    return <div className="statistiques-attente">Analyse des durées de partie en cours...</div>;
  }

  if (erreurApi || tempsJeuErreur) {
    return <div className="statistiques-echec">Problème rencontré: {erreurApi || tempsJeuErreur}</div>;
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
      <h2>Analyse des Durées de Partie</h2>
      
      {/* Duration Type Selection */}
      <div className="lycans-categories-selection">
        <button
          className={`lycans-categorie-btn ${selectedDurationType === 'real' ? 'active' : ''}`}
          onClick={() => setSelectedDurationType('real')}
        >
          Durée réelle
        </button>
        <button
          className={`lycans-categorie-btn ${selectedDurationType === 'gametime' ? 'active' : ''}`}
          onClick={() => setSelectedDurationType('gametime')}
        >
          Temps de jeu
        </button>
      </div>
      
      {selectedDurationType === 'real' && (
        <>
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
              <h3>Partie Plus Courte</h3>
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
              <h3>Partie Plus Longue</h3>
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
                        data={tempsJeuDonnees.phaseDistribution as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.phase} (${entry.percentage.toFixed(1)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {tempsJeuDonnees.phaseDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.phase === 'Jour' ? '#FFD700' :
                              entry.phase === 'Nuit' ? '#4169E1' :
                              entry.phase === 'Meeting' ? '#FF6347' :
                              getRandomColor(entry.phase)
                            } 
                          />
                        ))}
                      </Pie>
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
                        tickFormatter={(value) => formatTiming(value)}
                        label={{ value: 'Timing de Fin', position: 'insideBottom', offset: -40 }}
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
                        onClick={(data: any) => {
                          // Navigate to games that ended with this specific timing
                          navigateToGameDetails({
                            fromComponent: `Analyse des Temps de Jeu - Timing ${formatTiming(data.timing)}`
                          });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {tempsJeuDonnees.endTimingDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={
                              entry.phase === 'Jour' ? '#FFD700' :
                              entry.phase === 'Nuit' ? '#4169E1' :
                              entry.phase === 'Meeting' ? '#FF6347' :
                              getRandomColor(entry.timing)
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </FullscreenChart>
            </div>
          </div>
        </>
      )}
    </div>
  );
}