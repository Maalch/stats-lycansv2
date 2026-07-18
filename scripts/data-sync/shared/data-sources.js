/**
 * Data source configurations for different teams/groups
 */

export const DATA_SOURCES = {
  main: {
    name: 'Main Team',
    outputDir: 'data',
  gameFilter: (gameId) => gameId.startsWith('Ponce-') || gameId.startsWith('Tsuna-') || gameId.startsWith('khalen-'), // Ponce-, Tsuna-, and Khalen- games
    generateJoueurs: true, // Generate from game log
    modVersionLabel: 'Multiple AWS Versions',
    indexDescription: 'Game logs from AWS S3 bucket only. Updated periodically via GitHub Actions.'
  },
  
  discord: {
    name: 'Discord Team',
    outputDir: 'data/discord',
    gameFilter: (gameId) => gameId.startsWith('Nales-'), // Only Nales- games
    generateJoueurs: true, // Generate from game log
    modVersionLabel: 'Discord Team - Multiple AWS Versions',
    indexDescription: 'Game logs from AWS S3 bucket for Discord Team. Updated periodically via GitHub Actions.'
  }
  ,
  
  anaeecorp: {
    name: 'Anaee Corp',
    outputDir: 'data/anaeecorp',
    gameFilter: (gameId) => gameId.startsWith('Holdener-') || gameId.startsWith('Anaee-') || gameId.startsWith('Rigner-') || gameId.startsWith('Botmog-') || gameId.startsWith('Tsuna-') || gameId.startsWith('khalen-'), // Only Holdener- games
    generateJoueurs: true, // Generate from game log
    modVersionLabel: 'Anaee Corp - Multiple AWS Versions',
    indexDescription: 'Game logs from AWS S3 bucket for Anaee Corp.'
  }
};
