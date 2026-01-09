import type { PlayerIdentity } from '../usePlayerInsights';
import { formatCumulativeDuration } from '../../../utils/durationFormatters';
import { useNavigation } from '../../../context/NavigationContext';
import './PlayerIdentityCard.css';

interface PlayerIdentityCardProps {
  identity: PlayerIdentity;
  playerColor?: string;
}

export function PlayerIdentityCard({ identity, playerColor }: PlayerIdentityCardProps) {
  const { navigateToGameDetails } = useNavigation();
  
  return (
    <div className="identity-card">
      {/* Top accent bar */}
      <div className="identity-accent-bar" style={{ 
        background: playerColor 
          ? `linear-gradient(90deg, ${playerColor}, var(--accent-primary), ${playerColor})`
          : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary))'
      }} />
      
      <div className="identity-content">
        {/* Avatar Section */}
        <div className="identity-avatar-section">
          {identity.avatar ? (
            <img 
              src={identity.avatar} 
              alt={`Photo de ${identity.name}`}
              className="identity-avatar"
            />
          ) : (
            <div 
              className="identity-avatar-default"
              style={{ 
                '--player-color': playerColor || 'var(--accent-primary)'
              } as React.CSSProperties}
            />
          )}
          
          {/* Social Links */}
          {(identity.socialLinks.twitch || identity.socialLinks.youtube) && (
            <div className="identity-social-links">
              {identity.socialLinks.twitch && (
                <a 
                  href={identity.socialLinks.twitch}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link twitch"
                  title="Twitch"
                >
                  📺
                </a>
              )}
              {identity.socialLinks.youtube && (
                <a 
                  href={identity.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link youtube"
                  title="YouTube"
                >
                  🎬
                </a>
              )}
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className="identity-info">
          <h1 className="identity-name">{identity.name}</h1>
          
          {/* Quick Stats */}
          <div className="identity-quick-stats">
            <div 
              className="quick-stat clickable"
              onClick={() => navigateToGameDetails({ 
                selectedPlayer: identity.name,
                fromComponent: 'Profile - Total Parties'
              })}
              title="Voir toutes les parties"
            >
              <span className="stat-value">{identity.totalGames}</span>
              <span className="stat-label">Parties</span>
            </div>
            
            <div 
              className="quick-stat clickable"
              onClick={() => navigateToGameDetails({ 
                selectedPlayer: identity.name,
                selectedPlayerWinMode: 'wins-only',
                fromComponent: 'Profile - Victoires'
              })}
              title="Voir les victoires"
            >
              <span className="stat-value">{identity.totalWins}</span>
              <span className="stat-label">Victoires</span>
            </div>
            
            <div className="quick-stat highlight">
              <span className="stat-value">{identity.winRate.toFixed(1)}%</span>
              <span className="stat-label">Taux de victoire</span>
            </div>
            
            <div className="quick-stat">
              <span className="stat-value">{formatCumulativeDuration(identity.totalPlayTime)}</span>
              <span className="stat-label">Temps de parole</span>
            </div>
          </div>
          
          {/* Activity Period */}
          <div className="identity-period">
            <span className="period-icon">📅</span>
            <span className="period-text">
              Actif du {identity.firstGameDate} au {identity.lastGameDate}
            </span>
          </div>
          
          {/* Favorite Color */}
          {identity.color && (
            <div className="identity-color">
              <span className="color-icon">🎨</span>
              <span className="color-text">Couleur préférée: {identity.color}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
