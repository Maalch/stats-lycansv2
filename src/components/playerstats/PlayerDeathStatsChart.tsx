import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePlayerDeathStats } from '../../hooks/useDeathStatisticsFromRaw';
import { useSettings } from '../../context/SettingsContext';
import { FullscreenChart } from '../common/FullscreenChart';

// Extended type for chart data with highlighting info
interface ChartPlayerDeathStat {
  playerName: string;
  totalDeaths: number;
  deathRate: number;
  averageDeathDay: number | null;
  isHighlightedAddition?: boolean;
}

export function PlayerDeathStatsChart() {
  const { data: playerDeathData, isLoading, error } = usePlayerDeathStats();
  const { settings } = useSettings();
  const [minGamesPlayed, setMinGamesPlayed] = useState<number>(5);
  const [sortBy, setSortBy] = useState<'totalDeaths' | 'deathRate' | 'averageDeathDay'>('totalDeaths');
  const [showTop, setShowTop] = useState<number>(15);

  // Process and filter player death data
  const chartData = useMemo((): ChartPlayerDeathStat[] => {
    if (!playerDeathData?.playerDeathStats) return [];

    const stats = playerDeathData.playerDeathStats;
    const totalGames = playerDeathData.totalGames;
    
    // Filter players based on minimum games (estimate from death rate)
    let filteredStats = stats.filter(player => {
      const estimatedGamesPlayed = player.deathRate > 0 ? player.totalDeaths / player.deathRate : totalGames;
      return estimatedGamesPlayed >= minGamesPlayed;
    });

    // Check if highlighted player should be included even if they don't meet criteria
    let highlightedPlayerIncluded = false;
    if (settings.highlightedPlayer) {
      const highlightedPlayerStat = stats.find(p => 
        p.playerName.toLowerCase() === settings.highlightedPlayer!.toLowerCase()
      );
      
      if (highlightedPlayerStat) {
        const estimatedGamesPlayed = highlightedPlayerStat.deathRate > 0 
          ? highlightedPlayerStat.totalDeaths / highlightedPlayerStat.deathRate 
          : totalGames;
        
        if (estimatedGamesPlayed < minGamesPlayed) {
          // Add highlighted player even if they don't meet minimum games
          filteredStats = [...filteredStats, highlightedPlayerStat];
          highlightedPlayerIncluded = true;
        }
      }
    }

    // Sort based on selected criteria
    filteredStats.sort((a, b) => {
      switch (sortBy) {
        case 'deathRate':
          return b.deathRate - a.deathRate;
        case 'averageDeathDay':
          const aDay = a.averageDeathDay ?? 999;
          const bDay = b.averageDeathDay ?? 999;
          return aDay - bDay; // Lower day means died earlier (worse)
        case 'totalDeaths':
        default:
          return b.totalDeaths - a.totalDeaths;
      }
    });

    // Take top N players
    const topStats = filteredStats.slice(0, showTop);

    // Map to chart data format
    return topStats.map(player => ({
      playerName: player.playerName,
      totalDeaths: player.totalDeaths,
      deathRate: player.deathRate,
      averageDeathDay: player.averageDeathDay,
      isHighlightedAddition: highlightedPlayerIncluded && 
        settings.highlightedPlayer?.toLowerCase() === player.playerName.toLowerCase()
    }));
  }, [playerDeathData, minGamesPlayed, sortBy, showTop, settings.highlightedPlayer]);

  if (isLoading) return <div>Chargement des statistiques de mort des joueurs...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!playerDeathData) return <div>Aucune donnée de mort des joueurs disponible</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-red-600">
            Total morts: <span className="font-medium">{data.totalDeaths}</span>
          </p>
          <p className="text-orange-600">
            Taux de mort: <span className="font-medium">{(data.deathRate * 100).toFixed(1)}%</span>
          </p>
          {data.averageDeathDay && (
            <p className="text-blue-600">
              Jour moyen de mort: <span className="font-medium">{data.averageDeathDay.toFixed(1)}</span>
            </p>
          )}
          {data.isHighlightedAddition && (
            <p className="text-purple-600 text-sm italic">
              (Joueur mis en évidence)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (entry: ChartPlayerDeathStat, index: number) => {
    const isHighlighted = settings.highlightedPlayer?.toLowerCase() === entry.playerName.toLowerCase();
    
    if (isHighlighted) return 'var(--accent-primary)';
    if (entry.isHighlightedAddition) return 'var(--accent-secondary)';
    
    // Color gradient based on performance (red = more deaths)
    const colors = ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c'];
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <FullscreenChart title="Statistiques de Mort par Joueur">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="minGames" className="text-sm font-medium">
              Parties minimum:
            </label>
            <select 
              id="minGames"
              value={minGamesPlayed} 
              onChange={(e) => setMinGamesPlayed(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={1}>1+</option>
              <option value={3}>3+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
              <option value={15}>15+</option>
              <option value={20}>20+</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="sortBy" className="text-sm font-medium">
              Trier par:
            </label>
            <select 
              id="sortBy"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="totalDeaths">Total des morts</option>
              <option value="deathRate">Taux de mort</option>
              <option value="averageDeathDay">Jour moyen de mort</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="showTop" className="text-sm font-medium">
              Afficher top:
            </label>
            <select 
              id="showTop"
              value={showTop} 
              onChange={(e) => setShowTop(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="playerName"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={sortBy === 'deathRate' ? 'deathRate' : sortBy === 'averageDeathDay' ? 'averageDeathDay' : 'totalDeaths'}
                name={sortBy === 'deathRate' ? 'Taux de mort' : sortBy === 'averageDeathDay' ? 'Jour moyen' : 'Total morts'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Résumé</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p><strong>Joueurs analysés:</strong> {chartData.length}</p>
              <p><strong>Parties minimum requises:</strong> {minGamesPlayed}</p>
            </div>
            <div>
              {chartData.length > 0 && (
                <>
                  <p><strong>Plus de morts:</strong> {chartData[0]?.playerName} ({chartData[0]?.totalDeaths})</p>
                  <p><strong>Taux de mort le plus élevé:</strong> {
                    chartData.reduce((max, player) => 
                      player.deathRate > max.deathRate ? player : max, chartData[0]
                    )?.playerName
                  } ({(chartData.reduce((max, player) => 
                    player.deathRate > max.deathRate ? player : max, chartData[0]
                  )?.deathRate * 100).toFixed(1)}%)</p>
                </>
              )}
            </div>
            <div>
              {settings.highlightedPlayer && (
                <p><strong>Joueur mis en évidence:</strong> {settings.highlightedPlayer}</p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                Le taux de mort représente le pourcentage de parties où le joueur est mort.
                Un jour moyen de mort plus bas indique une mort plus précoce.
              </p>
            </div>
          </div>
        </div>
      </div>
    </FullscreenChart>
  );
}