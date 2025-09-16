import { useDeathStatsFromRaw } from '../../hooks/useDeathStatsFromRaw';
import { useKillerAnalysisFromRaw } from '../../hooks/useKillerAnalysisFromRaw';
import { useDeathTimingAnalysisFromRaw } from '../../hooks/useDeathTimingAnalysisFromRaw';
import { useSurvivalAnalysisFromRaw } from '../../hooks/useSurvivalAnalysisFromRaw';
import { useGameDeathAnalysisFromRaw } from '../../hooks/useGameDeathAnalysisFromRaw';

/**
 * Example component demonstrating death statistics usage
 * This shows how to use the new death analysis hooks
 */
export default function DeathStatsExample() {
  const { data: deathStats, isLoading: deathLoading, error: deathError } = useDeathStatsFromRaw();
  const { data: killerAnalysis, isLoading: killerLoading, error: killerError } = useKillerAnalysisFromRaw();
  const { data: timingAnalysis, isLoading: timingLoading, error: timingError } = useDeathTimingAnalysisFromRaw();
  const { data: survivalAnalysis, isLoading: survivalLoading, error: survivalError } = useSurvivalAnalysisFromRaw();
  const { data: gameAnalysis, isLoading: gameLoading, error: gameError } = useGameDeathAnalysisFromRaw();

  if (deathLoading || killerLoading || timingLoading || survivalLoading || gameLoading) {
    return <div>Loading death statistics...</div>;
  }

  if (deathError || killerError || timingError || survivalError || gameError) {
    return <div>Error loading death statistics</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Death & Survival Statistics Dashboard</h1>
      
      {/* Overall Death Stats */}
      {deathStats && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Overall Death Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Total Deaths:</strong> {deathStats.totalDeaths}
            </div>
            <div>
              <strong>Total Survivors:</strong> {deathStats.totalSurvivors}
            </div>
            <div>
              <strong>Survival Rate:</strong> {deathStats.survivalRate.toFixed(1)}%
            </div>
            <div>
              <strong>Average Death Timing:</strong> {deathStats.averageDeathTiming.toFixed(1)}
            </div>
            <div>
              <strong>Most Common Death:</strong> {deathStats.mostCommonDeathType}
            </div>
            <div>
              <strong>Most Common Timing:</strong> {deathStats.mostCommonDeathTiming}
            </div>
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <h3>Deaths by Phase</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>Night: {deathStats.deathsByPhase.night}</div>
              <div>Meeting: {deathStats.deathsByPhase.meeting}</div>
              <div>Unknown: {deathStats.deathsByPhase.unknown}</div>
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <h3>Deaths by Type</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {Object.entries(deathStats.deathsByType).map(([type, count]) => (
                <div key={type} style={{ fontSize: '0.9em' }}>
                  <strong>{type}:</strong> {count}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Killers */}
      {killerAnalysis && killerAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Top Killers (Top 10)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Killer</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Total Kills</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Unique Victims</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Games as Killer</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Kills/Game</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Targeted Role</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Preferred Victim</th>
                </tr>
              </thead>
              <tbody>
                {killerAnalysis.slice(0, 10).map((killer, index) => (
                  <tr key={killer.killer} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.killer}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.totalKills}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.uniqueVictims}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.gamesAsKiller}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.killsPerGame.toFixed(1)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.mostTargetedRole || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{killer.preferredVictim || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Death Timing Analysis */}
      {timingAnalysis && timingAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Death Timing Analysis</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Timing</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Phase</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Day</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Total Deaths</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Common Type</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Common Role</th>
                </tr>
              </thead>
              <tbody>
                {timingAnalysis.slice(0, 15).map((timing, index) => {
                  const mostCommonType = Object.entries(timing.deathsByType)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
                  const mostCommonRole = Object.entries(timing.deathsByRole)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
                  
                  return (
                    <tr key={timing.timing} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{timing.timing}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{timing.phase}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{timing.dayNumber}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{timing.totalDeaths}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{mostCommonType}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{mostCommonRole}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Best Survivors */}
      {survivalAnalysis && survivalAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Best Survivors (Top 10)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Player</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Games Played</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Survived</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Survival Rate</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Common Death</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Frequent Killer</th>
                </tr>
              </thead>
              <tbody>
                {survivalAnalysis.slice(0, 10).map((player, index) => (
                  <tr key={player.player} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.player}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.gamesPlayed}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.timesSurvived}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.survivalRate.toFixed(1)}%</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.mostCommonDeathType || 'N/A'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.mostFrequentKiller || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Games Death Analysis */}
      {gameAnalysis && gameAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Recent Games Death Analysis (Last 3 Games)</h2>
          {gameAnalysis.slice(-3).map((game) => (
            <div key={game.gameId} style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
              <h3>Game {game.gameId}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                <div><strong>Total Players:</strong> {game.totalPlayers}</div>
                <div><strong>Deaths:</strong> {game.totalDeaths}</div>
                <div><strong>Survivors:</strong> {game.totalSurvivors}</div>
                <div><strong>Mortality Rate:</strong> {game.mortalityRate.toFixed(1)}%</div>
                <div><strong>Game Length:</strong> {game.gameLength}</div>
                <div><strong>Winning Camp:</strong> {game.winningCamp}</div>
                <div><strong>Deadliest Player:</strong> {game.deadliestPlayer || 'N/A'}</div>
              </div>
              
              {/* Death progression */}
              {game.deathProgression.length > 0 && (
                <div>
                  <h4>Death Progression:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {game.deathProgression.map((death, index) => (
                      <div key={index} style={{ padding: '5px', backgroundColor: 'white', borderRadius: '3px', fontSize: '0.9em' }}>
                        <strong>{death.timing}</strong>: {death.victim}<br />
                        Killer: {death.killer || 'Unknown'}<br />
                        Type: {death.deathType}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Usage Examples */}
      <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
        <h2>How to Use These Death Analysis Hooks</h2>
        <p>The death statistics system provides several hooks for different analysis needs:</p>
        <ul>
          <li><strong>useDeathStatsFromRaw()</strong> - Overall death and survival statistics</li>
          <li><strong>useKillerAnalysisFromRaw()</strong> - Analysis of killer performance and behavior</li>
          <li><strong>useDeathTimingAnalysisFromRaw()</strong> - Death patterns by game timing (N1, N2, M1, etc.)</li>
          <li><strong>useSurvivalAnalysisFromRaw()</strong> - Individual player survival patterns and death analysis</li>
          <li><strong>useGameDeathAnalysisFromRaw()</strong> - Game-by-game death progression and analysis</li>
        </ul>
        <p>All hooks follow the base hook pattern and automatically respect filter settings from SettingsContext.</p>
        
        <h3>Key Insights Available:</h3>
        <ul>
          <li>Death timing patterns (when players typically die)</li>
          <li>Death type distribution (how players die)</li>
          <li>Killer effectiveness and targeting patterns</li>
          <li>Player survival rates by role</li>
          <li>Game mortality patterns</li>
          <li>Death progression within games</li>
        </ul>
      </section>
    </div>
  );
}