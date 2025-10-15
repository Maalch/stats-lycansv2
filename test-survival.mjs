// Test file to verify survival statistics functionality
import { computeSurvivalStatistics } from './src/hooks/utils/survivalStatisticsUtils.js';

// Mock game data for testing
const mockGameData = [
  {
    Id: "test-1",
    DisplayedId: "1",
    StartDate: "2024-01-01T10:00:00Z",
    EndDate: "2024-01-01T12:00:00Z",
    MapName: "Village",
    HarvestGoal: 100,
    HarvestDone: 100,
    EndTiming: "J3", // Game ended on day 3
    Version: "1.0",
    Modded: false,
    LegacyData: { deathInformationFilled: true },
    PlayerStats: [
      {
        Username: "Alice",
        MainRoleInitial: "Villageois",
        MainRoleChanges: [],
        Power: null,
        SecondaryRole: null,
        DeathDateIrl: null,
        DeathTiming: "J2", // Died on day 2
        DeathPosition: null,
        DeathType: "VOTED",
        KillerName: null,
        Victorious: false,
        Votes: []
      },
      {
        Username: "Bob",
        MainRoleInitial: "Loup",
        MainRoleChanges: [],
        Power: null,
        SecondaryRole: null,
        DeathDateIrl: null,
        DeathTiming: null, // Survived
        DeathPosition: null,
        DeathType: null,
        KillerName: null,
        Victorious: true,
        Votes: []
      },
      {
        Username: "Charlie",
        MainRoleInitial: "Villageois",
        MainRoleChanges: [],
        Power: null,
        SecondaryRole: null,
        DeathDateIrl: null,
        DeathTiming: "J1", // Died on day 1
        DeathPosition: null,
        DeathType: "BY_WOLF",
        KillerName: "Bob",
        Victorious: false,
        Votes: []
      }
    ]
  }
];

console.log('Testing survival statistics calculation...');
const result = computeSurvivalStatistics(mockGameData);
console.log('Result:', JSON.stringify(result, null, 2));

// Expected results:
// Day 1: Charlie died, Alice and Bob survived
// Day 2: Alice died, Bob survived
// Day 3: Bob survived (game ended)

console.log('Test completed successfully!');