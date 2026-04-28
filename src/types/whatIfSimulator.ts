export type CampType = 'Villageois' | 'Loup' | 'Solo';

export interface SimulatorSlot {
  camp: CampType;
  role?: string;
  player?: { id: string; name: string };
}

export interface SimulatorConfiguration {
  playerCount: number;
  slots: SimulatorSlot[];
}

export interface PredictionResult {
  villageoisWinProb: number;
  loupWinProb: number;
  soloWinProb: number;
  confidence: number;
  sampleSize: number;
  nearestMatches: NearestMatch[];
}

export interface NearestMatch {
  gameId: string;
  displayedId: string;
  date: string;
  playerCount: number;
  wolfCount: number;
  villageoisCount: number;
  soloCount: number;
  winnerCamp: string;
  similarity: number;
}

export interface ModelFeatures {
  playerCount: number;
  wolfCount: number;
  villageoisCount: number;
  soloCount: number;
  wolfRatio: number;
  villageoisRatio: number;
  soloRatio: number;
  hasTraitre: number;
  hasLouveteau: number;
  hasChasseur: number;
  hasAlchimiste: number;
  hasAmoureux: number;
  hasProtecteur: number;
  pureWolfCount: number;
  traitreCount: number;
  louveteuCount: number;
}

export interface TrainedModel {
  // One-vs-rest coefficients for 3 classes
  villageoisWeights: number[];
  loupWeights: number[];
  soloWeights: number[];
  // Normalization parameters
  featureMeans: number[];
  featureStds: number[];
  featureNames: string[];
  // Training metadata
  trainingSize: number;
  accuracy: number;
}

export interface PlayerModifier {
  playerId: string;
  playerName: string;
  camp: CampType;
  winRateDelta: number; // Difference from average win rate for this camp
  gamesPlayed: number;
}

// Available roles per camp for the team builder
export const VILLAGEOIS_ROLES = [
  'Villageois',
  'Chasseur',
  'Alchimiste',
  'Protecteur',
  'Disciple',
  'Guetteur',
  'Purificateur',
] as const;

export const LOUP_ROLES = [
  'Loup',
  'Traître',
  'Louveteau',
] as const;

export const SOLO_ROLES = [
  'Amoureux',
  'Idiot du Village',
  'Agent',
  'Espion',
  'Contrebandier',
  'Kidnappeur',
  'Scientifique',
  'Mercenaire',
  'Cultiste',
  'La Bête',
  'Chasseur de primes',
  'Vaudou',
] as const;
