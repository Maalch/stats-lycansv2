function getGameStatistics() {
  const lycansDataUrl = 'URL_TO_YOUR_CSV_FILE'; // Replace with the URL of your CSV file
  const gameDataUrl = 'URL_TO_YOUR_GAME_CSV_FILE'; // Replace with the URL of your Game CSV file

  const lycansData = UrlFetchApp.fetch(lycansDataUrl).getContentText();
  const gameData = UrlFetchApp.fetch(gameDataUrl).getContentText();

  const lycansRows = Utilities.parseCsv(lycansData);
  const gameRows = Utilities.parseCsv(gameData);

  const gameStats = {};

  // Process Game Data
  for (let i = 1; i < gameRows.length; i++) {
    const row = gameRows[i];
    const gameId = row[0];
    const date = row[1];
    const playersCount = parseInt(row[3]);
    const wolvesCount = parseInt(row[4]);
    const winningCamp = row[8];

    if (!gameStats[gameId]) {
      gameStats[gameId] = {
        date: date,
        playersCount: playersCount,
        wolvesCount: wolvesCount,
        winningCamp: winningCamp,
        totalGames: 0,
        villageWins: 0,
        wolfWins: 0,
      };
    }

    gameStats[gameId].totalGames += 1;

    if (winningCamp === 'Villageois') {
      gameStats[gameId].villageWins += 1;
    } else if (winningCamp === 'Loups') {
      gameStats[gameId].wolfWins += 1;
    }
  }

  // Prepare data for charts
  const chartData = Object.keys(gameStats).map(gameId => {
    const stats = gameStats[gameId];
    return {
      gameId: gameId,
      date: stats.date,
      playersCount: stats.playersCount,
      wolvesCount: stats.wolvesCount,
      totalGames: stats.totalGames,
      villageWins: stats.villageWins,
      wolfWins: stats.wolfWins,
    };
  });

  return {
    success: true,
    data: chartData,
  };
}