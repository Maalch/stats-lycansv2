import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDeathStatisticsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';

export function DeathStatisticsChart() {
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw();

  // Process killer data
  const killerChartData = useMemo(() => {
    if (!deathStats) return [];
    
    return deathStats.killerStats.slice(0, 10).map(killer => ({
      name: killer.killerName,
      value: killer.kills,
      victims: killer.victims.length,
      percentage: killer.percentage
    }));
  }, [deathStats]);

  if (isLoading) return <div>Chargement des statistiques de mort...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!deathStats) return <div>Aucune donnée de mort disponible</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Morts: <span className="font-medium">{data.value}</span>
          </p>
          <p className="text-green-600">
            Pourcentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
          {data.victims && (
            <p className="text-purple-600">
              Victimes uniques: <span className="font-medium">{data.victims}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <FullscreenChart title="Joueurs les Plus Meurtriers">
      <div className="space-y-6">
        {/* Summary statistics focused on killers */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{deathStats.totalDeaths}</div>
            <div className="text-sm text-gray-600">Total des morts</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{deathStats.killerStats.length}</div>
            <div className="text-sm text-gray-600">Tueurs identifiés</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {deathStats.mostDeadlyKiller || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Tueur le plus actif</div>
          </div>
        </div>

        {/* Killers chart */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Joueurs les plus meurtriers</h3>
          {killerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={killerChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Victimes" fill="#e53e3e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Aucune donnée de tueur disponible</p>
            </div>
          )}
        </div>

        {/* Killers insights */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Insights sur les Tueurs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              {deathStats.mostDeadlyKiller && (
                <p><strong>Joueur le plus meurtrier:</strong> {deathStats.mostDeadlyKiller}</p>
              )}
              <p><strong>Nombre de tueurs identifiés:</strong> {deathStats.killerStats.length}</p>
            </div>
            <div>
              <p><strong>Total des morts causées:</strong> {deathStats.totalDeaths}</p>
              {killerChartData.length > 0 && (
                <p><strong>Victimes du top tueur:</strong> {killerChartData[0]?.value || 0}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullscreenChart>
  );
}