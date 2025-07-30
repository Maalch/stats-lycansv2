import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useRoleSurvivalStats } from '../hooks/useSurvivalStats';

export function RoleSurvivalRateChart() {
  const { roleSurvivalStats: donneesSurvie, dataLoading: chargementStats, fetchError: erreurStats } = useRoleSurvivalStats();
  const [categorieAffichee, setCategorieAffichee] = useState<'roles' | 'camps' | 'secondaryRoles' | 'thirdRoles'>('roles');

  if (chargementStats) {
    return <div className="donnees-attente">Récupération des statistiques de survie des rôles...</div>;
  }

  if (erreurStats) {
    return <div className="donnees-probleme">Erreur: {erreurStats}</div>;
  }

  if (!donneesSurvie) {
    return <div className="donnees-manquantes">Aucune donnée de survie disponible</div>;
  }

  // Determine which data to display based on selected category
  const getDataAndLabel = () => {
    switch (categorieAffichee) {
      case 'roles':
        return {
          data: donneesSurvie.roleStats || [],
          keyField: 'role',
          label: 'Rôle',
          minAppearances: 3
        };
      case 'camps':
        return {
          data: donneesSurvie.campStats || [],
          keyField: 'camp',
          label: 'Camp',
          minAppearances: 1
        };
      case 'secondaryRoles':
        return {
          data: donneesSurvie.secondaryRoleStats || [],
          keyField: 'secondaryRole',
          label: 'Rôle Secondaire',
          minAppearances: 3
        };
      case 'thirdRoles':
        return {
          data: donneesSurvie.thirdRoleStats || [],
          keyField: 'thirdRole',
          label: 'Rôle Spécifique',
          minAppearances: 3
        };
    }
  };

  const { data, keyField, label, minAppearances } = getDataAndLabel();

  // Filter data for minimum appearances
  const donneesFiltrees = data.filter(item => item.appearances >= minAppearances);

  // Prepare data for correlation chart
  const correlationDonnees = donneesFiltrees.map(item => ({
    nom: item[keyField as keyof typeof item],
    tauxSurvie: parseFloat(item.survivalRate),
    dureeVie: parseFloat(item.avgLifespan),
    apparitions: item.appearances
  }));

  if (donneesFiltrees.length === 0) {
    return <div className="donnees-manquantes">Aucune donnée disponible pour cette catégorie</div>;
  }

  return (
    <div className="lycans-roles-survie">
      <h2>Statistiques de Survie des Rôles</h2>
      
      <div className="lycans-categories-selection">
        <button 
          className={`lycans-categorie-btn ${categorieAffichee === 'roles' ? 'active' : ''}`} 
          onClick={() => setCategorieAffichee('roles')}
        >
          Rôles principaux
        </button>
        <button 
          className={`lycans-categorie-btn ${categorieAffichee === 'camps' ? 'active' : ''}`} 
          onClick={() => setCategorieAffichee('camps')}
        >
          Camps
        </button>
        <button 
          className={`lycans-categorie-btn ${categorieAffichee === 'secondaryRoles' ? 'active' : ''}`} 
          onClick={() => setCategorieAffichee('secondaryRoles')}
        >
          Rôles secondaires
        </button>
        <button 
          className={`lycans-categorie-btn ${categorieAffichee === 'thirdRoles' ? 'active' : ''}`} 
          onClick={() => setCategorieAffichee('thirdRoles')}
        >
          Rôles spécifiques
        </button>
      </div>
      
      <div className="lycans-graphiques-groupe">
        <div className="lycans-graphique-section">
          <h3>Taux de Survie par {label}</h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="120%">
              <BarChart
                data={donneesFiltrees}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis 
                  dataKey={keyField}
                  type="category" 
                  width={150}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {label}: {d[keyField]}
                          </div>
                          <div>
                            Taux de Survie : {d.survivalRate}%
                          </div>
                          <div>
                            Apparitions : {d.appearances}
                          </div>
                          <div>
                            Durée de Vie Moyenne : {d.avgLifespan} jours
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend formatter={(value) => value === "survivalRate" ? "Taux de Survie" : value} />
                <Bar 
                  dataKey="survivalRate" 
                  name="survivalRate" 
                  fill="var(--chart-color-2)" 
                  background={{ fill: 'var(--bg-tertiary)' }}
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: 8, borderRadius: 6 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            {label}: {d.nom}
                          </div>
                          <div>Durée de Vie Moyenne : {d.dureeVie} jours</div>
                          <div>Taux de Survie : {d.tauxSurvie}%</div>
                          <div>Apparitions : {d.apparitions}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name={label} 
                  data={correlationDonnees} 
                  fill="var(--chart-color-5)" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}