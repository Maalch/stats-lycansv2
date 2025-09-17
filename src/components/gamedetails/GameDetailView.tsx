import { useState } from 'react';
import { lycansColorScheme, frenchColorMapping } from '../../types/api';
import { getPlayerMainRoleFromRole, getPlayerCampFromRole } from '../../utils/gameUtils';
import './GameDetailsChart.css';

// Helper function to format duration from seconds to minutes and seconds
function formatDuration(durationInSeconds: number | null): string {
  if (durationInSeconds === null || durationInSeconds <= 0) {
    return 'N/A';
  }

  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

// Component to display detailed view of a single game
export function GameDetailView({ game }: { game: any }) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="lycans-game-detail-view">
      <div className="lycans-game-detail-grid">
        {/* Basic Game Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Générales</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Nombre de joueurs:</span>
              <span className="value">{game.playerCount}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Nombre de loups:</span>
              <span className="value">{game.wolfCount}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Traître:</span>
              <span className="value">{game.hasTraitor ? 'Oui' : 'Non'}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Amoureux:</span>
              <span className="value">{game.hasLovers ? 'Oui' : 'Non'}</span>
            </div>
            {game.soloRoles && (
              <div className="lycans-stat-item">
                <span className="label">Rôles solo:</span>
                <span className="value">{game.soloRoles}</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="lycans-game-detail-section">
          <h4>Informations Supplémentaires</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Jours de jeu:</span>
              <span className="value">{game.dayCount}</span>
            </div>
            {game.gameDuration !== null && (
              <div className="lycans-stat-item">
                <span className="label">Durée de la partie:</span>
                <span className="value">{formatDuration(game.gameDuration)}</span>
              </div>
            )}
            {game.versions && (
              <div className="lycans-stat-item">
                <span className="label">Version:</span>
                <span className="value">
                  {game.versions}
                  {game.isModded ? ' (moddée)' : ''}
                </span>
              </div>
            )}
            {game.map && (
              <div className="lycans-stat-item">
                <span className="label">Map:</span>
                <span className="value">{game.map}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lycans-game-detail-section">
          <h4>Résultats</h4>
          <div className="lycans-game-detail-stats">
            <div className="lycans-stat-item">
              <span className="label">Camp vainqueur:</span>
              <span className="value">{game.winningCamp}</span>
            </div>
            <div className="lycans-stat-item">
              <span className="label">Gagnants:</span>
              <span className="value">{game.winners}</span>
            </div>
          </div>
        </div>

        {/* Harvest (if applicable) */}
        {game.harvest !== null && (
          <div className="lycans-game-detail-section">
            <h4>Récolte</h4>
            <div className="lycans-game-detail-stats">
              <div className="lycans-stat-item">
                <span className="label">Récolte:</span>
                <span className="value">{game.harvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Total possible:</span>
                <span className="value">{game.totalHarvest}</span>
              </div>
              <div className="lycans-stat-item">
                <span className="label">Pourcentage:</span>
                <span className="value">
                  {typeof game.harvestPercentage === 'number'
                    ? (game.harvestPercentage * 100).toFixed(1) + '%'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Player Roles */}
        <div className="lycans-game-detail-section full-width">
          <h4>Rôles des Joueurs</h4>
          <div className="lycans-player-roles-grid">
            {game.playerData.map((playerStat: any, index: number) => {
              // Get role and camp information from MainRoleInitial
              const role = getPlayerMainRoleFromRole(playerStat.MainRoleInitial);
              const camp = getPlayerCampFromRole(playerStat.MainRoleInitial);
              const originalRole = playerStat.MainRoleInitial;
              const power = playerStat.Power;
              const secondaryRole = playerStat.SecondaryRole;
              
              // Build the comprehensive display text
              let displayText = camp; // Start with main camp
              
              // Add main role if different from camp
              if (role !== camp) {
                displayText += ` (${role})`;
              }
              
              // Add original role if different from main role
              if (originalRole && originalRole !== role) {
                displayText += ` - ${originalRole}`;
              }
              
              // Add power if available
              if (power && power.trim()) {
                displayText += ` - ${power}`;
              }
              
              // Add secondary role if available
              if (secondaryRole && secondaryRole.trim()) {
                displayText += ` + ${secondaryRole}`;
              }

              // Get the camp border color
              let campBorderColor = lycansColorScheme[playerStat.MainRoleInitial as keyof typeof lycansColorScheme] || '#666';
              if (campBorderColor === '#666') {
                 campBorderColor = lycansColorScheme[camp as keyof typeof lycansColorScheme] || '#666';
              }

              // Get player color for name (if available)
              // First try the French color mapping from the log, then fall back to camp color
              let playerColor = lycansColorScheme[camp as keyof typeof lycansColorScheme] || '#fff';
              if (playerStat.Color && frenchColorMapping[playerStat.Color]) {
                playerColor = frenchColorMapping[playerStat.Color];
              }
              
              // Check if player is dead
              const isDead = playerStat.DeathTiming;
              
              // Check if player is victorious
              const isVictorious = playerStat.Victorious;
              
              return (
                <div 
                  key={index} 
                  className={`lycans-player-role-item ${isVictorious ? 'victorious' : ''}`}
                  style={{
                    borderColor: campBorderColor,
                  }}
                >
                  <div
                    className="lycans-player-name"
                    style={{
                      color: playerColor,
                      textAlign: 'left'
                    }}
                  >
                    {playerStat.Username}
                    {isDead && <span className="death-skull">💀</span>}
                  </div>
                  <div
                    className="lycans-player-camp"
                    style={{ textAlign: 'left' }}
                  >
                    {displayText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Toggle Button */}
        {game.youtubeEmbedUrl && (
          <div className="lycans-game-detail-section full-width">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="lycans-video-toggle-btn"
            >
              {showVideo ? '📹 Masquer la vidéo' : '🎥 Voir la vidéo'}
            </button>
          </div>
        )}

        {/* YouTube Video */}
        {game.youtubeEmbedUrl && showVideo && (
          <div className="lycans-game-detail-section full-width">
            <h4>Vidéo de la Partie</h4>
            <div className="lycans-youtube-container">
              <iframe
                src={game.youtubeEmbedUrl}
                title={`Partie Lycans #${game.gameId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="lycans-youtube-iframe"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}