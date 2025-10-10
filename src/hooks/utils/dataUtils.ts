/**
 * Shared utility functions for raw data processing hooks
 */

// Helper to parse DD/MM/YYYY to Date
export function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// Helper function to split and trim strings like the Google Apps Script
export function splitAndTrim(str: string | null | undefined): string[] {
  return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
}

// Helper function to determine if a player won the game
export function didPlayerWin(playerName: string, winnerList: string | null | undefined): boolean {
  if (winnerList && winnerList.trim() !== "") {
    const winners = splitAndTrim(winnerList);
    return winners.some(winner => winner.toLowerCase() === playerName.toLowerCase());
  }
  return false;
}

// Helper function to get player's camp in a specific game
export function getPlayerCamp(
  gamePlayerCampMap: Record<string, Record<string, string>>, 
  gameId: string, 
  playerName: string
): string {
  return (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][playerName]) || "Villageois";
}

// Helper function to format date consistently
export function formatLycanDate(date: any): string {
  if (date instanceof Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  if (typeof date === 'string') {
    // If it's already in DD/MM/YYYY format, return as is
    if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return date;
    }
    
    // Try to parse other formats and convert
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return formatLycanDate(parsed);
    }
  }
  
  return date?.toString() || '';
}

// Helper to determine if a camp won based on camp name and winner camp
export function didCampWin(camp: string, winnerCamp: string): boolean {
  if (camp === winnerCamp) return true;
  // Special case: Traitor/WolfCub wins if Wolves win, Amoureux can be disambiguous and chasseur/alchimiste count as villageois
  if ((camp === "Traître" || camp === "Louveteau") && winnerCamp === "Loup") return true;
  if ((camp === "Amoureux Villageois" || camp === "Amoureux Loup") && winnerCamp === "Amoureux") return true;
  if ((camp === "Chasseur" || camp === "Alchimiste") && winnerCamp === "Villageois") return true;
  return false;
}

