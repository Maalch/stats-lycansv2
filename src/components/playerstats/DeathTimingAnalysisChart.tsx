import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useDeathTimingStats } from '../../hooks/useDeathStatisticsFromRaw';
import { FullscreenChart } from '../common/FullscreenChart';

// Color scheme for different phases
const PHASE_COLORS = {
  'Nuit': '#2d3748',
  'Jour': '#ed8936', 
  'Meeting': '#3182ce'
};

export function DeathTimingAnalysisChart() {
  const { data: timingData, isLoading, error } = useDeathTimingStats();

  // Process timing data for line chart (deaths over time)
  const timelineData = useMemo(() => {
    if (!timingData) return [];
    
    // Group deaths by day across all phases
    const dayGroups: Record<number, { day: number; Nuit: number; Jour: number; Meeting: number; total: number }> = {};
    
    timingData.deathsByTiming.forEach(timing => {
      if (!dayGroups[timing.day]) {
        dayGroups[timing.day] = { day: timing.day, Nuit: 0, Jour: 0, Meeting: 0, total: 0 };
      }
      dayGroups[timing.day][timing.phase] = timing.count;
      dayGroups[timing.day].total += timing.count;
    });
    
    return Object.values(dayGroups).sort((a, b) => a.day - b.day);
  }, [timingData]);

  // Process phase distribution data
  const phaseData = useMemo(() => {
    if (!timingData) return [];
    
    return Object.entries(timingData.deathsByPhase).map(([phase, count]) => ({
      phase,
      count,
      percentage: Object.values(timingData.deathsByPhase).reduce((sum, c) => sum + c, 0) > 0
        ? (count / Object.values(timingData.deathsByPhase).reduce((sum, c) => sum + c, 0) * 100)
        : 0
    }));
  }, [timingData]);

  // Most dangerous moments (top 10)
  const dangerousMoments = useMemo(() => {
    if (!timingData) return [];
    
    return timingData.deathsByTiming
      .slice(0, 10)
      .map(timing => ({
        moment: `${timing.phase} ${timing.day}`,
        count: timing.count,
        percentage: timing.percentage,
        phase: timing.phase
      }));
  }, [timingData]);

  if (isLoading) return <div>Chargement de l'analyse temporelle des morts...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!timingData) return <div>Aucune donnée temporelle de mort disponible</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">Jour {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: <span className="font-medium">{entry.value}</span>
            </p>
          ))}
          <p className="text-gray-600 text-sm">
            Total: <span className="font-medium">{payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Morts: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-green-600">
            Pourcentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <FullscreenChart title="Analyse Temporelle des Morts">
      <div className="space-y-8">
        {/* Summary statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{timingData.mostDeadlyPhase}</div>
            <div className="text-sm text-blue-800">Phase la plus meurtrière</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">Jour {timingData.mostDeadlyDay}</div>
            <div className="text-sm text-red-800">Jour le plus meurtrier</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600">{timingData.deathsByPhase.Nuit}</div>
            <div className="text-sm text-gray-600">Morts la nuit</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{timingData.deathsByPhase.Meeting}</div>
            <div className="text-sm text-orange-800">Morts en meeting</div>
          </div>
        </div>

        {/* Evolution of deaths over game days */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Évolution des morts au fil des jours</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  label={{ value: 'Jour de partie', position: 'insideBottom', offset: -5 }}
                />
                <YAxis label={{ value: 'Nombre de morts', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="Nuit" 
                  stroke={PHASE_COLORS.Nuit} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Jour" 
                  stroke={PHASE_COLORS.Jour} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Meeting" 
                  stroke={PHASE_COLORS.Meeting} 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Phase distribution */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Répartition par phase</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phaseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="count" name="Morts">
                    {phaseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PHASE_COLORS[entry.phase as keyof typeof PHASE_COLORS]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most dangerous moments */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Moments les plus meurtriers</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dangerousMoments} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="moment" 
                    type="category" 
                    width={80}
                    fontSize={12}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="count" name="Morts">
                    {dangerousMoments.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PHASE_COLORS[entry.phase as keyof typeof PHASE_COLORS]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Analyse des patterns temporels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Tendances observées:</h4>
              <ul className="space-y-1">
                <li>• <strong>Phase la plus dangereuse:</strong> {timingData.mostDeadlyPhase}</li>
                <li>• <strong>Jour pic de mortalité:</strong> Jour {timingData.mostDeadlyDay}</li>
                <li>• <strong>Morts nocturnes:</strong> {timingData.deathsByPhase.Nuit} ({((timingData.deathsByPhase.Nuit / Object.values(timingData.deathsByPhase).reduce((sum, c) => sum + c, 0)) * 100).toFixed(1)}%)</li>
                <li>• <strong>Morts en meeting:</strong> {timingData.deathsByPhase.Meeting} ({((timingData.deathsByPhase.Meeting / Object.values(timingData.deathsByPhase).reduce((sum, c) => sum + c, 0)) * 100).toFixed(1)}%)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Interprétation:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Les morts nocturnes indiquent l'activité des loups-garous</li>
                <li>• Les morts en meeting représentent les éliminations par vote</li>
                <li>• Le jour le plus meurtrier montre quand les parties deviennent critiques</li>
                <li>• L'évolution temporelle révèle les phases décisives du jeu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FullscreenChart>
  );
}