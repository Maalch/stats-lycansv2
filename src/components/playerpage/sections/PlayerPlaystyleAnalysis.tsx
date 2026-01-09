import type { PlaystyleProfile } from '../usePlayerInsights';
import './PlayerPlaystyleAnalysis.css';

interface PlayerPlaystyleAnalysisProps {
  playstyle: PlaystyleProfile;
}

function getVotingStyleLabel(style: PlaystyleProfile['votingStyle']): { label: string; emoji: string; description: string } {
  switch (style) {
    case 'aggressive':
      return { label: 'Agressif', emoji: '⚔️', description: 'Vote souvent et sans hésitation' };
    case 'cautious':
      return { label: 'Prudent', emoji: '🛡️', description: 'Préfère observer avant de voter' };
    case 'strategic':
      return { label: 'Stratégique', emoji: '🎯', description: 'Vote de manière réfléchie' };
    default:
      return { label: 'Inconnu', emoji: '❓', description: 'Pas assez de données' };
  }
}

function getCommunicationLabel(level: PlaystyleProfile['communicationLevel']): { label: string; emoji: string } {
  switch (level) {
    case 'talkative':
      return { label: 'Bavard', emoji: '🗣️' };
    case 'moderate':
      return { label: 'Modéré', emoji: '💬' };
    case 'quiet':
      return { label: 'Discret', emoji: '🤫' };
    default:
      return { label: 'Inconnu', emoji: '❓' };
  }
}

function getSurvivalLabel(timing: PlaystyleProfile['averageSurvivalTiming']): { label: string; emoji: string } {
  switch (timing) {
    case 'survivor':
      return { label: 'Survivant', emoji: '👑' };
    case 'late-game':
      return { label: 'Fin de partie', emoji: '🌙' };
    case 'mid-game':
      return { label: 'Mi-partie', emoji: '☀️' };
    case 'early-death':
      return { label: 'Début de partie', emoji: '💀' };
    default:
      return { label: 'Inconnu', emoji: '❓' };
  }
}

export function PlayerPlaystyleAnalysis({ playstyle }: PlayerPlaystyleAnalysisProps) {
  const votingStyle = getVotingStyleLabel(playstyle.votingStyle);
  const communication = getCommunicationLabel(playstyle.communicationLevel);
  const survival = getSurvivalLabel(playstyle.averageSurvivalTiming);
  
  return (
    <div className="player-page-section playstyle-section">
      <h2 className="section-title">🎮 Style de jeu</h2>
      
      {/* Playstyle Traits */}
      <div className="playstyle-traits">
        {/* Voting Style */}
        <div className="trait-card">
          <div className="trait-header">
            <span className="trait-emoji">{votingStyle.emoji}</span>
            <span className="trait-category">Votes</span>
          </div>
          <div className="trait-value">{votingStyle.label}</div>
          <div className="trait-description">{votingStyle.description}</div>
          <div className="trait-stats">
            <div className="mini-stat">
              <span className="mini-value">{playstyle.votingRate.toFixed(0)}%</span>
              <span className="mini-label">Taux de vote</span>
            </div>
            <div className="mini-stat">
              <span className="mini-value">{playstyle.voteAccuracy.toFixed(0)}%</span>
              <span className="mini-label">Précision</span>
            </div>
          </div>
        </div>
        
        {/* Communication */}
        <div className="trait-card">
          <div className="trait-header">
            <span className="trait-emoji">{communication.emoji}</span>
            <span className="trait-category">Communication</span>
          </div>
          <div className="trait-value">{communication.label}</div>
          <div className="trait-description">
            ~{Math.round(playstyle.talkingTimePerGame)}s par partie
          </div>
          <div className="trait-stats">
            <div className="mini-stat">
              <span className="mini-value">{(playstyle.talkingRatioMeetingVsOutside * 100).toFixed(0)}%</span>
              <span className="mini-label">En réunion</span>
            </div>
          </div>
        </div>
        
        {/* Survival */}
        <div className="trait-card">
          <div className="trait-header">
            <span className="trait-emoji">{survival.emoji}</span>
            <span className="trait-category">Survie</span>
          </div>
          <div className="trait-value">{survival.label}</div>
          <div className="trait-description">
            Tendance de moment de mort
          </div>
          <div className="trait-stats">
            <div className="mini-stat">
              <span className="mini-value">{playstyle.survivalRate.toFixed(0)}%</span>
              <span className="mini-label">Survie globale</span>
            </div>
            <div className="mini-stat">
              <span className="mini-value">{playstyle.survivalRateWhenTargeted.toFixed(0)}%</span>
              <span className="mini-label">Survie si ciblé</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Camp Performance */}
      <div className="camp-performance">
        <h3 className="subsection-title">Performance par camp</h3>
        <div className="camp-cards">
          <div className="camp-card favorite">
            <span className="camp-emoji">⭐</span>
            <div className="camp-info">
              <span className="camp-label">Camp préféré</span>
              <span className="camp-value">{playstyle.favoriteCamp}</span>
            </div>
          </div>
          
          <div className="camp-card best">
            <span className="camp-emoji">🏆</span>
            <div className="camp-info">
              <span className="camp-label">Meilleur camp</span>
              <span className="camp-value">
                {playstyle.bestCamp.camp}
                <span className="camp-rate">({playstyle.bestCamp.winRate.toFixed(0)}%)</span>
              </span>
            </div>
          </div>
          
          {playstyle.worstCamp.camp !== playstyle.bestCamp.camp && 
           playstyle.worstCamp.camp !== 'Inconnu' && (
            <div className="camp-card worst">
              <span className="camp-emoji">📉</span>
              <div className="camp-info">
                <span className="camp-label">Camp difficile</span>
                <span className="camp-value">
                  {playstyle.worstCamp.camp}
                  <span className="camp-rate">({playstyle.worstCamp.winRate.toFixed(0)}%)</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
