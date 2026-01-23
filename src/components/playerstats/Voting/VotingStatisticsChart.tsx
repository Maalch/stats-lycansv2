import { useState } from 'react';
import { useVotingStatisticsFromRaw } from '../../../hooks/useVotingStatisticsFromRaw';
import { useNavigation } from '../../../context/NavigationContext';
import { VotingOverviewCharts } from './VotingOverviewCharts';
import { VotingBehaviorCharts } from './VotingBehaviorCharts';
import { VotingTimingCharts } from './VotingTimingCharts';

export function VotingStatisticsChart() {
  const { navigationState } = useNavigation();

  // Initialize state from navigation state or use defaults
  const [selectedCategory, setSelectedCategory] = useState<'overview' | 'behavior' | 'timing'>(
    navigationState.votingStatsState?.selectedCategory || 'overview'
  );
  const [minMeetings, setMinMeetings] = useState<number>(25);
  
  const { data: allVotingStats, isLoading, error } = useVotingStatisticsFromRaw();

  if (isLoading) {
    return <div className="donnees-attente">Chargement des statistiques de votes...</div>;
  }

  if (error) {
    return <div className="donnees-probleme">Erreur: {error}</div>;
  }

  if (!allVotingStats) {
    return <div className="donnees-manquantes">Aucune donnée de vote disponible</div>;
  }

  const minMeetingsOptions = [5, 15, 25, 50, 100, 200, 400];

  return (
    <div className="lycans-voting-statistics">
      <h2>📊 Statistiques de Votes</h2>
      
      {/* Controls */}
      <div className="lycans-controls-section" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '1.5rem', 
        marginBottom: '2rem', 
        alignItems: 'center'
      }}>
        {/* Category Selection - Main Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('overview');
            }}
            style={{
              background: selectedCategory === 'overview' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: selectedCategory === 'overview' ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: selectedCategory === 'overview' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Vue d'Ensemble
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('behavior');
            }}
            style={{
              background: selectedCategory === 'behavior' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: selectedCategory === 'behavior' ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: selectedCategory === 'behavior' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🗳️ Comportements de Vote
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('timing');
            }}
            style={{
              background: selectedCategory === 'timing' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: selectedCategory === 'timing' ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: selectedCategory === 'timing' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ⏰ Timing de Vote
          </button>
        </div>

        {/* Min Meetings filter */}
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--bg-secondary)',
          }}>
            <label htmlFor="min-meetings-select" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Min. meetings:
            </label>
            <select
              id="min-meetings-select"
              value={minMeetings}
              onChange={(e) => setMinMeetings(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.9rem',
                width: '90px'
              }}
            >
              {minMeetingsOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="lycans-graphiques-groupe">
        {selectedCategory === 'overview' && (
          <VotingOverviewCharts minMeetings={minMeetings} />
        )}

        {selectedCategory === 'behavior' && (
          <VotingBehaviorCharts minMeetings={minMeetings} />
        )}

        {selectedCategory === 'timing' && (
          <VotingTimingCharts minMeetings={minMeetings} />
        )}
      </div>
    </div>
  );
}
