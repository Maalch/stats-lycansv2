import { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useGameDurationAnalysis } from '../hooks/useGameDurationAnalysis';

export const GameDurationInsights: FC = () => {
  const { durationAnalysis: jeuDonnees, fetchingData: telechargementActif, apiError: erreurApi } = useGameDurationAnalysis();

  if (telechargementActif) {
    return <div className="statistiques-attente">Analyse des durées de partie en cours...</div>;
  }

  if (erreurApi) {
    return <div className="statistiques-echec">Problème rencontré: {erreurApi}</div>;
  }

  if (!jeuDonnees) {
    return <div className="statistiques-indisponibles">Données d'analyse non disponibles</div>;
  }

  // Préparation des données pour le graphique de ratio loups/joueurs
  const ratioLoupsJoueurs = Object.entries(jeuDonnees.daysByWolfRatio).map(([ratio, donnees]) => ({
    ratio,
    moyenne: parseFloat(donnees.average),
    parties: donnees.count
  })).sort((a, b) => parseFloat(a.ratio) - parseFloat(b.ratio));

  // Préparation des données pour le graphique par camp
  const dureesParCamp = Object.entries(jeuDonnees.daysByWinnerCamp).map(([camp, donnees]) => ({
    camp,
    moyenne: parseFloat(donnees.average),
    parties: donnees.count
  })).sort((a, b) => b.moyenne - a.moyenne);

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
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={jeuDonnees.dayDistribution}
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
                  formatter={(valeur) => [`${valeur} parties`, 'Fréquence']}
                  labelFormatter={(etiquette) => `${etiquette} jours`}
                />
                <Legend />
                <Bar dataKey="count" name="Nombre de Parties" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lycans-graphique-element">
          <h3>Durée Moyenne par Ratio Loups/Joueurs</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={ratioLoupsJoueurs}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="ratio" 
                  label={{ value: 'Ratio Loups/Joueurs', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Durée Moyenne (jours)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(valeur, nom, props) => {
                    if (nom === "moyenne") return [`${valeur} jours`, 'Durée Moyenne'];
                    if (nom === "parties") return [`${valeur} parties`, 'Nombre de Parties'];
                    return [valeur, nom];
                  }}
                  labelFormatter={(etiquette) => `Ratio: ${etiquette}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="moyenne" 
                  name="Durée Moyenne" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="parties" 
                  name="Nombre de Parties" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lycans-graphique-element">
          <h3>Durée Moyenne par Camp Victorieux</h3>
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
                  formatter={(valeur, nom) => {
                    if (nom === "moyenne") return [`${valeur} jours`, 'Durée Moyenne'];
                    if (nom === "parties") return [`${valeur}`, 'Nombre de Parties'];
                    return [valeur, nom];
                  }}
                />
                <Legend />
                <Bar dataKey="moyenne" name="Durée Moyenne" fill="#8884d8" />
                <Bar dataKey="parties" name="Nombre de Parties" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};