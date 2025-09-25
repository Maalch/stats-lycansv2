import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useDeathStatisticsFromRaw } from '../../hooks/useDeathStatisticsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';

// Color schemes for different charts
const TIMING_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
const PHASE_COLORS = {
  'Nuit': '#2d3748',
  'Jour': '#ed8936', 
  'Meeting': '#3182ce'
};
const TYPE_COLORS = ['#e53e3e', '#dd6b20', '#38a169', '#3182ce', '#805ad5', '#d69e2e'];

export function DeathStatisticsChart() {
  const { data: deathStats, isLoading, error } = useDeathStatisticsFromRaw();
  const [activeChart, setActiveChart] = useState<'timing' | 'types' | 'killers'>('timing');

  // Process death timing data for visualization
  const timingChartData = useMemo(() => {
    if (!deathStats) return [];
    
    return deathStats.deathsByTiming.map(timing => ({
      name: `${timing.phase} ${timing.day}`,
      value: timing.count,
      percentage: timing.percentage
    })).slice(0, 15); // Show top 15 most deadly times
  }, [deathStats]);

  // Process death phase data for pie chart
  const phaseChartData = useMemo(() => {
    if (!deathStats) return [];
    
    return Object.entries(deathStats.deathsByPhase).map(([phase, count]) => ({
      name: phase,
      value: count,
      percentage: deathStats.totalDeaths > 0 ? (count / deathStats.totalDeaths) * 100 : 0
    }));
  }, [deathStats]);

  // Process death type data
  const typeChartData = useMemo(() => {
    if (!deathStats) return [];
    
    return deathStats.deathsByType.slice(0, 10).map(type => ({
      name: type.type,
      value: type.count,
      percentage: type.percentage
    }));
  }, [deathStats]);

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

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-blue-600">
            Morts: <span className="font-medium">{data.value}</span>
          </p>
          <p className="text-green-600">
            Pourcentage: <span className="font-medium">{data.payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <FullscreenChart title="Statistiques de Mort des Joueurs">
      <div className="space-y-6">
        {/* Summary statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{deathStats.totalDeaths}</div>
            <div className="text-sm text-gray-600">Total des morts</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{deathStats.averageDeathsPerGame.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Morts/partie</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{deathStats.mostDeadlyPhase}</div>
            <div className="text-sm text-gray-600">Phase la plus meurtrière</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">Jour {deathStats.mostDeadlyDay}</div>
            <div className="text-sm text-gray-600">Jour le plus meurtrier</div>
          </div>
        </div>

        {/* Chart selection tabs */}
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveChart('timing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'timing'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Timing des Morts
          </button>
          <button
            onClick={() => setActiveChart('types')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'types'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Types de Mort
          </button>
          <button
            onClick={() => setActiveChart('killers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'killers'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tueurs
          </button>
        </div>

        {/* Chart content */}
        <div className="h-96">
          {activeChart === 'timing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Death timing bar chart */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Moments les plus meurtriers</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timingChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Morts">
                      {timingChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={TIMING_COLORS[index % TIMING_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Death phases pie chart */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Répartition par phase</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={phaseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {phaseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PHASE_COLORS[entry.name as keyof typeof PHASE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeChart === 'types' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Types de mort les plus courants</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={typeChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Morts">
                    {typeChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeChart === 'killers' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Joueurs les plus meurtriers</h3>
              {killerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
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
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Aucune donnée de tueur disponible</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional insights */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Type de mort le plus fréquent:</strong> {deathStats.mostCommonDeathType}</p>
              <p><strong>Phase la plus dangereuse:</strong> {deathStats.mostDeadlyPhase}</p>
            </div>
            <div>
              <p><strong>Jour le plus meurtrier:</strong> Jour {deathStats.mostDeadlyDay}</p>
              {deathStats.mostDeadlyKiller && (
                <p><strong>Joueur le plus meurtrier:</strong> {deathStats.mostDeadlyKiller}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullscreenChart>
  );
}