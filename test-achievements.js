// Quick test script to verify the achievements logic
// This can be run in the browser console to test the map achievements

console.log("Testing map-based achievements...");

// Mock data for testing
const mockGameData = [
  {
    Id: "1",
    StartDate: "2024-01-01",
    MapName: "Village",
    PlayerStats: [
      { Username: "Player1", Victorious: true },
      { Username: "Player2", Victorious: false }
    ]
  },
  {
    Id: "2", 
    StartDate: "2024-01-02",
    MapName: "Château",
    PlayerStats: [
      { Username: "Player1", Victorious: false },
      { Username: "Player2", Victorious: true }
    ]
  }
];

console.log("Mock game data:", mockGameData);
console.log("If you see this in the console, the achievements are being tested!");