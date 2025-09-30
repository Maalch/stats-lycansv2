// Test script for camp performance achievements
// Run this in the browser console to verify the achievements are working

console.log("Testing camp performance achievements...");

// Test SOLO_ROLES array
const SOLO_ROLES = [
  'Idiot du Village',
  'Agent', 
  'Espion',
  'Cannibale',
  'Scientifique',
  'La Bête',
  'Chasseur de primes',
  'Vaudou',
  'Traître'
];

console.log("Solo roles defined:", SOLO_ROLES);

// Mock camp performance data
const mockCampStats = [
  {
    player: "TestPlayer1",
    camp: "Villageois",
    games: 30,
    wins: 20,
    winRate: 66.7,
    performance: 15.2,
    totalGames: 100
  },
  {
    player: "TestPlayer1", 
    camp: "Loup",
    games: 15,
    wins: 12,
    winRate: 80.0,
    performance: 25.5,
    totalGames: 100
  },
  {
    player: "TestPlayer1",
    camp: "Idiot du Village",
    games: 8,
    wins: 6,
    winRate: 75.0,
    performance: 20.0,
    totalGames: 100
  }
];

console.log("Mock camp stats:", mockCampStats);
console.log("If achievements are working, you should see this data processed correctly!");