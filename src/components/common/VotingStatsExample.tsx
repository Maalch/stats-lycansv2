import { useVotingStatsFromRaw } from '../../hooks/useVotingStatsFromRaw';
import { usePlayerVotingBehaviorFromRaw } from '../../hooks/usePlayerVotingBehaviorFromRaw';
import { useVoteTargetingAnalysisFromRaw } from '../../hooks/useVoteTargetingAnalysisFromRaw';
import { useGameVotingAnalysisFromRaw } from '../../hooks/useGameVotingAnalysisFromRaw';

/**
 * Example component demonstrating voting statistics usage
 * This shows how to use the new voting analysis hooks
 */
export default function VotingStatsExample() {
  const { data: votingStats, isLoading: votingLoading, error: votingError } = useVotingStatsFromRaw();
  const { data: playerBehavior, isLoading: behaviorLoading, error: behaviorError } = usePlayerVotingBehaviorFromRaw();
  const { data: targetingAnalysis, isLoading: targetingLoading, error: targetingError } = useVoteTargetingAnalysisFromRaw();
  const { data: gameAnalysis, isLoading: gameLoading, error: gameError } = useGameVotingAnalysisFromRaw();

  if (votingLoading || behaviorLoading || targetingLoading || gameLoading) {
    return <div>Loading voting statistics...</div>;
  }

  if (votingError || behaviorError || targetingError || gameError) {
    return <div>Error loading voting statistics</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Voting Statistics Dashboard</h1>
      
      {/* Overall Voting Stats */}
      {votingStats && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Overall Voting Statistics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>Total Votes:</strong> {votingStats.totalVotes}
            </div>
            <div>
              <strong>Total Abstentions:</strong> {votingStats.totalAbstentions}
            </div>
            <div>
              <strong>Participation Rate:</strong> {votingStats.participationRate.toFixed(1)}%
            </div>
            <div>
              <strong>Avg Votes/Game:</strong> {votingStats.averageVotesPerGame.toFixed(1)}
            </div>
            <div>
              <strong>Games with Votes:</strong> {votingStats.totalGamesWithVotes}
            </div>
          </div>
        </section>
      )}

      {/* Top Voters */}
      {playerBehavior && playerBehavior.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Most Active Voters (Top 10)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Player</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Role</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Total Votes</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Abstentions</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Participation %</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Avg Votes/Game</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Targeted</th>
                </tr>
              </thead>
              <tbody>
                {playerBehavior.slice(0, 10).map((player, index) => (
                  <tr key={player.player} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.player}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.role}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.totalVotesCast}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.totalAbstentions}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.participationRate.toFixed(1)}%</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.averageVotesPerGame.toFixed(1)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{player.mostTargetedPlayer || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Most Targeted Players */}
      {targetingAnalysis && targetingAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Most Targeted Players (Top 10)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Player</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Times Targeted</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Games Targeted</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Targeting Pressure</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}>Most Frequent Attacker</th>
                </tr>
              </thead>
              <tbody>
                {targetingAnalysis.slice(0, 10).map((target, index) => (
                  <tr key={target.player} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{target.player}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{target.timesTargeted}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{target.gamesTargeted}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{target.targetingPressure.toFixed(1)}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{target.mostFrequentAttacker || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Game Analysis */}
      {gameAnalysis && gameAnalysis.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Recent Game Voting Analysis (Last 3 Games)</h2>
          {gameAnalysis.slice(-3).map((game) => (
            <div key={game.gameId} style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
              <h3>Game {game.gameId}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                <div><strong>Total Meetings:</strong> {game.totalMeetings}</div>
                <div><strong>Overall Participation:</strong> {game.overallParticipation.toFixed(1)}%</div>
                <div><strong>Most Active Voter:</strong> {game.mostActiveVoter || 'N/A'}</div>
                <div><strong>Most Targeted:</strong> {game.mostTargetedPlayer || 'N/A'}</div>
                <div><strong>Winning Camp:</strong> {game.winningCamp}</div>
              </div>
              
              {/* Meeting breakdown */}
              <h4>Meeting Breakdown:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {game.meetingAnalysis.map((meeting) => (
                  <div key={meeting.meetingNumber} style={{ padding: '5px', backgroundColor: 'white', borderRadius: '3px', fontSize: '0.9em' }}>
                    <strong>Meeting {meeting.meetingNumber}</strong><br />
                    Participants: {meeting.totalParticipants}<br />
                    Votes: {meeting.totalVotesCast}<br />
                    Participation: {meeting.participationRate.toFixed(0)}%<br />
                    {meeting.mostTargetedPlayer && <span>Target: {meeting.mostTargetedPlayer}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Usage Examples */}
      <section style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
        <h2>How to Use These Hooks</h2>
        <p>The voting statistics system provides several hooks for different analysis needs:</p>
        <ul>
          <li><strong>useVotingStatsFromRaw()</strong> - Overall voting statistics across all games</li>
          <li><strong>usePlayerVotingBehaviorFromRaw()</strong> - Individual player voting behavior and patterns</li>
          <li><strong>useVoteTargetingAnalysisFromRaw()</strong> - Analysis of who gets voted for most often</li>
          <li><strong>useGameVotingAnalysisFromRaw()</strong> - Detailed game-by-game voting breakdown</li>
        </ul>
        <p>All hooks follow the base hook pattern and automatically respect filter settings from SettingsContext.</p>
      </section>
    </div>
  );
}