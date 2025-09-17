import { useState } from 'react';
import { lycansColorScheme, frenchColorMapping } from '../../types/api';
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
            {game.playerRoles.map((playerRole: any, index: number) => {
              // Find matching player details
              const playerDetails = game.playerDetails.find((detail: any) => detail.Username === playerRole.player);
              
              // Build the display text with additional details
              let displayText = playerRole.role === playerRole.camp 
                ? playerRole.camp 
                : `${playerRole.camp} (${playerRole.role})`;

                /*
              if (playerDetails) {
                const additionalInfo = [];
                
                // Add wolf power or villager job
                if (playerDetails.wolfPower && playerDetails.wolfPower.trim()) {
                  additionalInfo.push(playerDetails.wolfPower);
                } else if (playerDetails.villagerJob && playerDetails.villagerJob.trim()) {
                  additionalInfo.push(playerDetails.villagerJob);
                }
                
                // Build the final display text
                if (additionalInfo.length > 0) {
                  displayText = `${playerRole.camp} - ${additionalInfo[0]}`;
                  
                  // Add secondary role in parentheses if exists
                  if (playerDetails.secondaryRole && playerDetails.secondaryRole.trim()) {
                    displayText += ` (${playerDetails.secondaryRole})`;
                  }
                } else if (playerDetails.secondaryRole && playerDetails.secondaryRole.trim()) {
                  // Only secondary role, no job/power
                  displayText = `${playerRole.camp} (${playerDetails.secondaryRole})`;
                }
              }*/

              // Get the camp border color
              const campBorderColor = lycansColorScheme[playerRole.camp as keyof typeof lycansColorScheme] || '#666';
              
              // Get player color for name (if available)
              // First try the French color mapping from the log, then fall back to camp color
              let playerColor = lycansColorScheme[playerRole.camp as keyof typeof lycansColorScheme] || '#fff';
              if (playerDetails?.Color && frenchColorMapping[playerDetails.Color]) {
                playerColor = frenchColorMapping[playerDetails.Color];
              }
              
              // Check if player is dead
              const isDead = playerDetails?.DeathTiming;
              
              // Check if player is victorious
              const isVictorious = playerDetails?.Victorious;
              
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
                    {playerRole.player}
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